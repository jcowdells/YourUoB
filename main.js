var urlRequestMap = {};
var urlResponseMap = {};

var resourceMap = {};

function addURLMapping(map, method, url, mapping) {
    method = method.toUpperCase();

    // if no subsection created for this method, then dont bother
    if (!map.hasOwnProperty(method))
        map[method] = [];

    map[method].push({
        "url": new RegExp(url, "i"),
        "mapping": mapping
    });
}

function addURLRequestMapping(method, url, mapping) {
    addURLMapping(urlRequestMap, method, url, mapping);
}

function callbackURLRequestMapping(method, url) {
    method = method.toUpperCase();

    if (urlRequestMap.hasOwnProperty(method)) {
        for (let mapping of urlRequestMap[method]) {
            if (mapping.url.test(url))
                return mapping.mapping(method, url);
        }
    }

    return [method, url];
}

function addURLResponseMapping(method, url, mapping) {
    addURLMapping(urlResponseMap, method, url, mapping);
}

function callbackURLResponseMapping(method, url, status, response) {
    method = method.toUpperCase();

    if (urlResponseMap.hasOwnProperty(method)) {
        for (let mapping of urlResponseMap[method]) {
            if (mapping.url.test(url))
                return mapping.mapping(method, url, status, response);
        }
    }

    return [status, response];
}

/* ===== This code is not needed yet? =====
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
*/

// Backup original XHR methods
const originalOpen = window.XMLHttpRequest.prototype.open;
const originalSend = window.XMLHttpRequest.prototype.send;

// 1. Override open() to log and save request details
window.XMLHttpRequest.prototype.open = function (method, url, ...args) {
    // yoooo im doin the damn thing (and yes, it's pantha)
    this._interceptorMethod = method;
    this._interceptorUrl = url;

    // overwrite method and response if wanted
    [method, url] = callbackURLRequestMapping(method, url);

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
        [status, responseText] = callbackURLResponseMapping(method, url, this.status, this.responseText);

        Object.defineProperty(this, "status", { value: status });
        Object.defineProperty(this, "responseText", { value: responseText });
        Object.defineProperty(this, "response", { value: responseText });
    });

    return originalSend.apply(this, arguments);
};

function getResource(filePath) {
  return new Promise((resolve, reject) => {
    // 0. check for cache hit
    if (resourceMap.hasOwnProperty(filePath)) {
        resolve(resourceMap[filePath]);
        return;
    }

    // 1. Generate a unique ID for this request
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);

    console.log(`Request ${requestId} made.`);
    // 2. Set up a temporary listener for the response
    function handleResponse(event) {
      if (
        event.source === window &&
        event.data?.type === 'EXTENSION_RESOURCE_RESPONSE' &&
        event.data?.requestId === requestId
      ) {
        // Clean up listener once we get our answer
        window.removeEventListener('message', handleResponse);

        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resourceMap[filePath] = event.data.payload;
          resolve(event.data.payload);
        }
      }
    }

    window.addEventListener('message', handleResponse);

    // 3. Post the request message to the Content Script
    window.postMessage({
      type: 'EXTENSION_RESOURCE_REQUEST',
      requestId: requestId,
      filePath: filePath
    }, '*');
  });
}

