// DevLens Content Script Orchestrator
(function () {
  // Check if DevLens is already initialized on this tab
  if (window.__DevLens__) return;

  // Initialize global workspace namespace
  const DevLens = {
    active: false,
    highlightColor: '#06b6d4',
    shadowHost: null,
    shadowRoot: null,

    // Sub-modules (assigned by individual scripts)
    inspector: null,
    mutation: null,
    accessibility: null,
    responsive: null,

    // Initialize Shadow DOM to isolate DevLens UI from webpage styles
    initShadowDOM() {
      if (this.shadowHost) return;

      this.shadowHost = document.createElement('div');
      this.shadowHost.id = 'devlens-shadow-host';
      this.shadowHost.style.position = 'fixed';
      this.shadowHost.style.top = '0';
      this.shadowHost.style.left = '0';
      this.shadowHost.style.width = '100%';
      this.shadowHost.style.height = '100%';
      this.shadowHost.style.pointerEvents = 'none'; // Ensure overlays don't intercept mouse clicks
      this.shadowHost.style.zIndex = '99999999'; // Stay on top of everything
      
      this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });
      document.body.appendChild(this.shadowHost);

      // Inject content CSS styles into Shadow DOM
      this.injectShadowCSS();
    },

    // Inject styles into the Shadow DOM
    injectShadowCSS() {
      try {
        const linkTag = document.createElement('link');
        linkTag.rel = 'stylesheet';
        linkTag.id = 'devlens-core-styles';
        linkTag.href = chrome.runtime.getURL('content/content.css');
        this.shadowRoot.appendChild(linkTag);
      } catch (err) {
        console.error('DevLens: Failed to load content styles:', err);
      }
    },

    // Set active status of DevLens
    setActive(isActive) {
      if (this.active === isActive) return;
      this.active = isActive;
      
      if (this.active) {
        this.initShadowDOM();
        console.log('DevLens: Activated on page.');
      } else {
        console.log('DevLens: Deactivated.');
        // Force deactivate the inspector highlights when deactivating globally
        if (this.inspector) this.inspector.onStateChange(false);
      }
    },

    // Update global configs
    updateConfig(config) {
      if (config.highlightColor) {
        this.highlightColor = config.highlightColor;
        // Update highlight color inside Shadow DOM custom property
        if (this.shadowRoot) {
          const rootElement = this.shadowRoot.querySelector('#devlens-core-styles');
          if (rootElement) {
            this.shadowHost.style.setProperty('--devlens-highlight-color', this.highlightColor);
          }
        }
      }
    }
  };

  // Expose global object
  window.__DevLens__ = DevLens;

  // Listen for messages from background.js or sidepanel.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'ping':
        sendResponse({ status: 'ok', active: DevLens.active });
        break;
      
      case 'toggleState':
        DevLens.setActive(message.active);
        sendResponse({ success: true, active: DevLens.active });
        break;

      case 'updateConfig':
        DevLens.updateConfig(message.config);
        sendResponse({ success: true });
        break;
      
      case 'runAudits':
        if (DevLens.active && DevLens.accessibility && DevLens.responsive) {
          const a11yResults = DevLens.accessibility.runAudit();
          const responsiveResults = DevLens.responsive.runAudit();
          sendResponse({
            success: true,
            a11y: a11yResults,
            responsive: responsiveResults
          });
        } else {
          sendResponse({ success: false, error: 'DevLens is not active or modules not ready' });
        }
        break;



      case 'tweakStyle':
        if (DevLens.active && DevLens.inspector) {
          DevLens.inspector.tweakStyle(message.property, message.value);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Inspector not active' });
        }
        break;

      case 'resetTweak':
        if (DevLens.active && DevLens.inspector) {
          DevLens.inspector.resetTweak();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Inspector not active' });
        }
        break;

      case 'applyCustomCSSRules':
        if (DevLens.active && DevLens.inspector) {
          DevLens.inspector.applyCustomCSSRules(message.cssText);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Inspector not active' });
        }
        break;

      case 'setInspectorActive':
        if (DevLens.active && DevLens.inspector) {
          DevLens.inspector.onStateChange(message.active);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'DevLens is not active' });
        }
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
    return true; // Keep message channel open for async response
  });

  // Listen for logs sent from MAIN world logger.js
  window.addEventListener('message', (event) => {
    // Only process events that originated from our own logger script
    if (event.data && event.data.source === 'devlens-logger') {
      try {
        if (chrome.runtime && chrome.runtime.id) {
          chrome.runtime.sendMessage({
            action: 'pageError',
            error: event.data
          }).catch(() => {
            // Fail silently if side panel is closed
          });
        }
      } catch (err) {
        // Context invalidated - ignore
      }
    }
  });
})();
