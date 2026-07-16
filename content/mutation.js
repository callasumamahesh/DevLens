// DevLens DOM Mutation Tracker Module
(function () {
  if (!window.__DevLens__) return;

  const DevLens = window.__DevLens__;

  const Mutation = {
    observer: null,
    recording: true,

    // Responds to core DevLens activation state changes
    onStateChange(active) {
      if (active && this.recording) {
        this.startObserving();
      } else {
        this.stopObserving();
      }
    },

    // Set recording toggled state from side panel
    setRecording(isRecording) {
      this.recording = isRecording;
      if (DevLens.active && this.recording) {
        this.startObserving();
      } else {
        this.stopObserving();
      }
    },

    startObserving() {
      if (this.observer) return;

      this.observer = new MutationObserver((mutationsList) => {
        this.handleMutations(mutationsList);
      });

      // Start observing target body recursively
      this.observer.observe(document.body, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true,
        attributeOldValue: true
      });
      
      console.log('DevLens: DOM Mutation Tracker active.');
    },

    stopObserving() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
        console.log('DevLens: DOM Mutation Tracker stopped.');
      }
    },

    // Handles Mutation list events batch by batch
    handleMutations(mutationsList) {
      if (!this.recording) return;

      const itemsToSend = [];

      for (const mutation of mutationsList) {
        const target = mutation.target;

        // Skip if target is null or inside the DevLens Shadow DOM host
        if (!target || target === DevLens.shadowHost || (DevLens.shadowHost && DevLens.shadowHost.contains(target))) {
          continue;
        }

        const timestamp = new Date().toLocaleTimeString();
        const selector = this.getElementSelector(target);

        if (mutation.type === 'childList') {
          // Process Node Additions
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node !== DevLens.shadowHost && !DevLens.shadowHost.contains(node)) {
              itemsToSend.push({
                type: 'add',
                time: timestamp,
                target: node.tagName.toLowerCase(),
                selector: this.getElementSelector(node),
                description: `Inserted <${node.tagName.toLowerCase()}> element`,
                details: node.outerHTML ? node.outerHTML.substring(0, 150) + (node.outerHTML.length > 150 ? '...' : '') : ''
              });
            }
          });

          // Process Node Removals
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node !== DevLens.shadowHost) {
              itemsToSend.push({
                type: 'remove',
                time: timestamp,
                target: node.tagName.toLowerCase(),
                selector: selector,
                description: `Removed <${node.tagName.toLowerCase()}> element`,
                details: node.className ? `class: ${node.className}` : ''
              });
            }
          });
        } else if (mutation.type === 'attributes') {
          // Process Attribute Changes (e.g. style, class, data-* shifts)
          const attrName = mutation.attributeName;
          const newVal = target.getAttribute(attrName);
          const oldVal = mutation.oldValue;

          // Skip styling mutations triggered on body by layout shifts if too spammy
          if (attrName === 'style' && target === document.body) continue;

          itemsToSend.push({
            type: 'attributes',
            time: timestamp,
            target: target.tagName.toLowerCase(),
            selector: selector,
            description: `Modified '${attrName}' attribute`,
            details: `Old: "${oldVal || ''}" ➔ New: "${newVal || ''}"`
          });
        }
      }

      // Send mutation details to Side Panel if we collected anything
      if (itemsToSend.length > 0) {
        try {
          if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
              action: 'domMutations',
              mutations: itemsToSend
            }).catch(() => {
              // Fail silently if side panel dashboard is closed
            });
          }
        } catch (err) {
          // Context invalidated - ignore
        }
      }
    },

    // Build readable selector for elements
    getElementSelector(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
      let sel = element.tagName.toLowerCase();
      if (element.id) {
        sel += `#${element.id}`;
      } else if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
          sel += `.${classes.join('.')}`;
        }
      }
      return sel;
    }
  };

  // Expose module
  DevLens.mutation = Mutation;

  if (DevLens.active) {
    Mutation.onStateChange(true);
  }
})();
