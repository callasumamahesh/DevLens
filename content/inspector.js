// DevLens Style Inspector & Overlay Module
(function () {
  if (!window.__DevLens__) return;

  const DevLens = window.__DevLens__;

  const Inspector = {
    hoveredElement: null,
    highlightElement: null,
    tooltipElement: null,
    overlayWrapper: null,

    // Initialize UI elements in the Shadow DOM
    initUI() {
      if (!DevLens.shadowRoot) return;

      // Create main overlay wrapper
      this.overlayWrapper = document.createElement('div');
      this.overlayWrapper.className = 'devlens-overlay-wrapper';
      DevLens.shadowRoot.appendChild(this.overlayWrapper);

      // Create highlighter bounding box
      this.highlightElement = document.createElement('div');
      this.highlightElement.className = 'devlens-highlight-box';
      this.overlayWrapper.appendChild(this.highlightElement);

      // Create smart tooltip element
      this.tooltipElement = document.createElement('div');
      this.tooltipElement.className = 'devlens-tooltip';
      this.tooltipElement.style.opacity = '0';
      this.overlayWrapper.appendChild(this.tooltipElement);
    },

    // Clean up UI elements
    destroyUI() {
      if (this.overlayWrapper) {
        this.overlayWrapper.remove();
        this.overlayWrapper = null;
        this.highlightElement = null;
        this.tooltipElement = null;
      }
      this.hoveredElement = null;
    },

    // Handles activation / deactivation state from the core orchestrator
    onStateChange(active) {
      if (active) {
        this.initUI();
        this.startHoverTracking();
      } else {
        this.stopHoverTracking();
        this.destroyUI();
      }
    },

    startHoverTracking() {
      this._boundMouseOver = this.handleMouseOver.bind(this);
      this._boundMouseMove = this.handleMouseMove.bind(this);
      this._boundScroll = this.handleScroll.bind(this);

      document.addEventListener('mouseover', this._boundMouseOver, true);
      document.addEventListener('mousemove', this._boundMouseMove, true);
      document.addEventListener('scroll', this._boundScroll, true);
    },

    stopHoverTracking() {
      if (this._boundMouseOver) {
        document.removeEventListener('mouseover', this._boundMouseOver, true);
        document.removeEventListener('mousemove', this._boundMouseMove, true);
        document.removeEventListener('scroll', this._boundScroll, true);
        
        this._boundMouseOver = null;
        this._boundMouseMove = null;
        this._boundScroll = null;
      }
    },

    // Event Handler: Mouse Over page elements
    handleMouseOver(e) {
      if (!DevLens.active) return;

      const target = e.target;

      // Ignore inspections on our own DevLens Shadow DOM elements or empty targets
      if (!target || target === document || target === document.body || target === document.documentElement || target === DevLens.shadowHost) {
        return;
      }

      // Check if target is inside the DevLens Shadow DOM
      if (DevLens.shadowHost.contains(target)) {
        return;
      }

      this.hoveredElement = target;
      this.updateHighlight(target);
      this.updateTooltipContent(target);
      this.sendElementDetailsToSidepanel(target);
    },

    // Event Handler: Mouse Move (to position tooltip)
    handleMouseMove(e) {
      if (!DevLens.active || !this.tooltipElement || !this.hoveredElement) return;
      this.positionTooltip(e.clientX, e.clientY);
    },

    // Event Handler: Scroll page (adjust overlays)
    handleScroll() {
      if (!DevLens.active || !this.hoveredElement) return;
      this.updateHighlight(this.hoveredElement);
    },

    // Compute dimensions and draw highlight box overlay
    updateHighlight(element) {
      if (!this.highlightElement) return;

      const rect = element.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

      // Position highligher precisely over the element (taking scroll offset into account)
      this.highlightElement.style.top = `${rect.top + scrollTop}px`;
      this.highlightElement.style.left = `${rect.left + scrollLeft}px`;
      this.highlightElement.style.width = `${rect.width}px`;
      this.highlightElement.style.height = `${rect.height}px`;
    },

    // Extract styles and update Tooltip HTML contents
    updateTooltipContent(element) {
      if (!this.tooltipElement) return;

      const computed = window.getComputedStyle(element);
      const tagName = element.tagName.toLowerCase();
      
      // Build class/id selector text
      let selector = '';
      if (element.id) {
        selector += `#${element.id}`;
      }
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 2).join('.')}`; // Cap at 2 classes for clean tooltip space
        }
      }

      const rect = element.getBoundingClientRect();
      const widthVal = Math.round(rect.width);
      const heightVal = Math.round(rect.height);

      const layout = computed.display;
      const position = computed.position;
      const colorVal = computed.color;
      const bgVal = computed.backgroundColor;

      // Populate tooltip contents
      this.tooltipElement.innerHTML = `
        <div class="devlens-tooltip-header">
          <span class="devlens-tooltip-tag">${tagName}</span>
          <span class="devlens-tooltip-selector">${selector}</span>
        </div>
        <div class="devlens-tooltip-dims">
          <span>Dimensions:</span>
          <span class="devlens-tooltip-dim-val">${widthVal} × ${heightVal}px</span>
        </div>
        <div class="devlens-tooltip-info-row">
          <span class="devlens-tooltip-info-label">Display</span>
          <span class="devlens-tooltip-info-val">${layout} (${position})</span>
        </div>
        <div class="devlens-tooltip-info-row">
          <span class="devlens-tooltip-info-label">Color</span>
          <span class="devlens-tooltip-info-val" style="border-bottom: 2px solid ${colorVal};">${colorVal}</span>
        </div>
        <div class="devlens-tooltip-info-row">
          <span class="devlens-tooltip-info-label">Bg Color</span>
          <span class="devlens-tooltip-info-val" style="border-bottom: 2px solid ${bgVal};">${bgVal}</span>
        </div>
      `;

      this.tooltipElement.style.opacity = '1';
    },

    // Position tooltip cursor-relative with screen boundaries boundary checks
    positionTooltip(mouseX, mouseY) {
      if (!this.tooltipElement) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

      const tooltipWidth = this.tooltipElement.offsetWidth || 200;
      const tooltipHeight = this.tooltipElement.offsetHeight || 110;

      // Place tooltip offset 15px right and 15px down from cursor
      let left = mouseX + scrollLeft + 15;
      let top = mouseY + scrollTop + 15;

      // Check screen edge boundaries
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (mouseX + tooltipWidth + 25 > viewportWidth) {
        // Shift tooltip left of cursor if it overflows right screen boundary
        left = mouseX + scrollLeft - tooltipWidth - 15;
      }
      if (mouseY + tooltipHeight + 25 > viewportHeight) {
        // Shift tooltip above cursor if it overflows bottom screen boundary
        top = mouseY + scrollTop - tooltipHeight - 15;
      }

      this.tooltipElement.style.left = `${left}px`;
      this.tooltipElement.style.top = `${top}px`;
    },

    // Send the detailed computed style metrics to the active Side Panel
    sendElementDetailsToSidepanel(element) {
      if (!DevLens.active) return;

      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      // Collect CSS stats
      const elementDetails = {
        tagName: element.tagName.toLowerCase(),
        selector: `${element.id ? '#' + element.id : ''}${element.className && typeof element.className === 'string' ? '.' + element.className.trim().split(/\s+/).join('.') : ''}`,
        metrics: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          margin: {
            top: computed.marginTop,
            right: computed.marginRight,
            bottom: computed.marginBottom,
            left: computed.marginLeft
          },
          border: {
            top: computed.borderTopWidth,
            right: computed.borderRightWidth,
            bottom: computed.borderBottomWidth,
            left: computed.borderLeftWidth
          },
          padding: {
            top: computed.paddingTop,
            right: computed.paddingRight,
            bottom: computed.paddingBottom,
            left: computed.paddingLeft
          }
        },
        styles: {
          layout: {
            display: computed.display,
            position: computed.position,
            flexDirection: computed.flexDirection,
            justifyContent: computed.justifyContent,
            alignItems: computed.alignItems,
            zIndex: computed.zIndex
          },
          typography: {
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            lineHeight: computed.lineHeight,
            color: computed.color,
            textAlign: computed.textAlign
          }
        }
      };

      // Push styles to Side Panel
      try {
        if (chrome.runtime && chrome.runtime.id) {
          chrome.runtime.sendMessage({
            action: 'elementInspected',
            details: elementDetails
          }).catch(err => {
            // Fail silently if side panel is closed
          });
        }
      } catch (err) {
        // Context invalidated - ignore
      }
    }
  };

  // Attach module to workspace orchestrator
  DevLens.inspector = Inspector;

  // If DevLens is already active, initialize module immediately
  if (DevLens.active) {
    Inspector.onStateChange(true);
  }
})();
