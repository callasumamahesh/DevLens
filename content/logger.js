// DevLens Main-World Console Error Capturer Script
(function () {
  const recentLogs = new Set();
  function sendLog(payload) {
    const key = `${payload.type}:${payload.message || payload.url || ''}`;
    if (recentLogs.has(key)) return;
    
    recentLogs.add(key);
    setTimeout(() => recentLogs.delete(key), 200);
    
    window.postMessage({
      source: 'devlens-logger',
      ...payload
    }, '*');
  }

  // 1. Capture Uncaught Runtime Errors
  window.addEventListener('error', (e) => {
    if (!e || !e.message) return;
    sendLog({
      type: 'error',
      message: e.message,
      errorClass: e.error ? e.error.name : 'TypeError'
    });
  });

  // 2. Capture Unhandled Promise Rejections
  window.addEventListener('unhandledrejection', (e) => {
    if (!e) return;
    let message = 'Unhandled Promise Rejection';
    let errorClass = 'Promise Error';
    if (e.reason) {
      message = e.reason.message || String(e.reason);
      errorClass = e.reason.name || 'Promise Error';
    }
    sendLog({
      type: 'unhandledrejection',
      message: message,
      errorClass: errorClass
    });
  });

  // 3. Intercept console.error
  const origError = console.error;
  console.error = function (...args) {
    origError.apply(console, args);
    const msg = args.map(arg => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch(e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');

    sendLog({
      type: 'console-error',
      message: msg,
      errorClass: 'Error'
    });
  };

  // 4. Intercept console.warn for React unique key warnings
  const origWarn = console.warn;
  console.warn = function (...args) {
    origWarn.apply(console, args);
    const msg = args.map(arg => String(arg)).join(' ');
    if (msg.includes('unique key') || msg.includes('Each child in a list')) {
      sendLog({
        type: 'warn',
        message: msg,
        errorClass: 'React Warning'
      });
    }
  };

  // 5. Intercept Fetch & XHR for API 404/500 errors
  // Fetch
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const res = await origFetch.apply(window, args);
      if (res.status === 404 || res.status === 500) {
        sendLog({
          type: 'api-error',
          url: res.url,
          status: res.status
        });
      }
      return res;
    } catch (err) {
      // Fetch failed entirely (network down)
      sendLog({
        type: 'api-error',
        url: typeof args[0] === 'string' ? args[0] : (args[0]?.url || 'API'),
        status: 'Failed'
      });
      throw err;
    }
  };

  // XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this._url = url;
    this._method = method;
    return origOpen.apply(this, [method, url, ...args]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      if (this.status === 404 || this.status === 500) {
        sendLog({
          type: 'api-error',
          url: this._url,
          status: this.status
        });
      }
    });
    this.addEventListener('error', () => {
      sendLog({
        type: 'api-error',
        url: this._url,
        status: 'Failed'
      });
    });
    return origSend.apply(this, args);
  };
})();
