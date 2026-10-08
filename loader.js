window.addEventListener('message', async (event) => {
  // Only process valid request messages from the same window
  if (
    event.source === window &&
    event.data?.type === 'EXTENSION_RESOURCE_REQUEST'
  ) {
    const { requestId, filePath } = event.data;

    try {
      // Fetch the file using chrome.runtime.getURL
      const fileUrl = chrome.runtime.getURL(filePath);
      const response = await fetch(fileUrl);

      console.log(`Request ${requestId} received`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const payload = await response.text();

      // Post the response back to Main World with the same requestId
      window.postMessage({
        type: 'EXTENSION_RESOURCE_RESPONSE',
        requestId: requestId,
        payload: payload
      }, '*');

    } catch (error) {
      // Send error back if file wasn't found or failed to load
      window.postMessage({
        type: 'EXTENSION_RESOURCE_RESPONSE',
        requestId: requestId,
        error: error.message
      }, '*');
    }
  }
});
