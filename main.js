var urlMap = {};

function addURLMapping(method, url, mapping) {
    method = method.toUpperCase();

    // if no subsection created for this method, then dont bother
    if (!urlMap.hasOwnProperty(method))
        urlMap[method] = [];

    urlMap[method].push({
        "url": new RegExp(url, "i"),
        "mapping": mapping
    });
}

function callbackURLMapping(method, url, status, response) {
    method = method.toUpperCase();

    if (urlMap.hasOwnProperty(method)) {
        for (let mapping of urlMap[method]) {
            if (mapping.url.test(url))
                return mapping.mapping(method, url, status, response);
        }
    }

    return [status, response];
}

// Backup the real fetch API
const originalFetch = window.fetch;

// Overwrite the page's fetch function
window.fetch = async (...args) => {
  const [resource, config] = args;
  const url = typeof resource === 'string' ? resource : resource?.url;
  const method = config?.method || 'GET';

  // 1. Log the outgoing request
  console.log(`[Fetch Request] ${method} ${url}`, config || '(default config)');

  try {
    // 2. Execute the actual request
    const response = await originalFetch(...args);

    // 3. Clone the response so we can read it without emptying the stream
    const responseClone = response.clone();
    
    // 4. Read the clone asynchronously so it doesn't block the main thread
    responseClone.text().then(text => {
      try {
        // Try to format as JSON for easier reading in the console
        const jsonData = JSON.parse(text);
        console.log(`[Fetch Response] ${method} ${url} | Status: ${response.status}`, jsonData);
      } catch {
        // Fallback to raw text if it's not JSON (e.g., HTML, XML, plain text)
        console.log(`[Fetch Response] ${method} ${url} | Status: ${response.status}`, text);
      }
    });

    // 5. Return the original, untouched response back to the webpage
    return response;

  } catch (error) {
    // Log any network failures (e.g., CORS errors, disconnected internet)
    console.error(`[Fetch Error] ${method} ${url}`, error);
    throw error;
  }
};

// Backup original XHR methods
const originalOpen = window.XMLHttpRequest.prototype.open;
const originalSend = window.XMLHttpRequest.prototype.send;

// 1. Override open() to log and save request details
window.XMLHttpRequest.prototype.open = function (method, url, ...args) {
  this._interceptorMethod = method;
  this._interceptorUrl = url;
  
  console.log(`[XHR Request] ${method} ${url}`);
  return originalOpen.apply(this, [method, url, ...args]);
};

// 2. Override send() to capture response data upon completion
window.XMLHttpRequest.prototype.send = function (body) {
  this.addEventListener('readystatechange', function () {

    if (!(this.readyState === 4))
        return;

    const method = this._interceptorMethod;
    const url = this._interceptorUrl;

    let status;
    let responseText
    [status, responseText] = callbackURLMapping(method, url, this.status, this.responseText);

    Object.defineProperty(this, "status", { value: status });
    Object.defineProperty(this, "responseText", { value: responseText });
    Object.defineProperty(this, "response", { value: responseText });
  });

  return originalSend.apply(this, arguments);
};
