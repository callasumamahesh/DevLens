// DevLens Responsive Layout Auditor
(function () {
  if (!window.__DevLens__) return;

  const DevLens = window.__DevLens__;

  const Responsive = {
    // Traverse DOM to find responsive layout bugs
    runAudit() {
      const issues = [];
      const viewportWidth = window.innerWidth;

      // Select all elements inside the page body (skipping script/style tags and DevLens UI)
      const elements = document.body.querySelectorAll('*');

      elements.forEach((elem) => {
        // Ignore DevLens elements
        if (elem === DevLens.shadowHost || DevLens.shadowHost?.contains(elem)) {
          return;
        }

        const rect = elem.getBoundingClientRect();
        const computed = window.getComputedStyle(elem);

        // 1. Horizontal Viewport Overflow Check
        // If element borders expand off the right side of the screen, it breaks responsive viewport scales
        if (rect.width > 0 && rect.right > viewportWidth + 1) {
          const overflowVal = Math.round(rect.right - viewportWidth);
          issues.push({
            type: 'danger',
            message: 'Horizontal page overflow',
            element: this.getElementSelector(elem),
            details: `Expands ${overflowVal}px past the right viewport boundary.`
          });
        }

        // 2. Element Internal Overflow Check
        // Element scrollWidth is larger than actual width (internal text clipping)
        if (elem.scrollWidth > elem.clientWidth && elem.clientWidth > 0) {
          const overflowX = computed.overflowX;
          if (overflowX !== 'scroll' && overflowX !== 'auto' && overflowX !== 'hidden') {
            issues.push({
              type: 'warning',
              message: 'Child content clipping',
              element: this.getElementSelector(elem),
              details: `Content scrolls internally by ${elem.scrollWidth - elem.clientWidth}px but overflow-x is not handled.`
            });
          }
        }

        // 3. Absolute Sizing Check
        // Large fixed absolute width can break mobile layouts
        const styleWidth = elem.style.width || computed.width;
        if (styleWidth.endsWith('px') && !elem.style.maxWidth) {
          const parsedWidth = parseFloat(styleWidth);
          if (parsedWidth > 320 && parsedWidth > viewportWidth * 0.9) {
            issues.push({
              type: 'warning',
              message: 'Absolute sizing risk',
              element: this.getElementSelector(elem),
              details: `Has fixed width of ${styleWidth} without a max-width limit.`
            });
          }
        }

        // 4. Flex Wrapping Issue Check
        if (computed.display === 'flex' && computed.flexWrap === 'nowrap') {
          // If total width of children exceeds flex container width, it causes overflow risks
          let totalChildrenWidth = 0;
          Array.from(elem.children).forEach(child => {
            totalChildrenWidth += child.getBoundingClientRect().width;
          });

          if (totalChildrenWidth > rect.width + 5 && rect.width > 0) {
            issues.push({
              type: 'warning',
              message: 'Flexbox wrapping layout issue',
              element: this.getElementSelector(elem),
              details: `Flex container has flex-wrap: nowrap, but children require more space than available container width.`
            });
          }
        }
      });

      return issues.slice(0, 30); // Return up to 30 findings to avoid UI clutter
    },

    // Selector helper
    getElementSelector(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
      let sel = element.tagName.toLowerCase();
      if (element.id) {
        sel += `#${element.id}`;
      } else if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
          sel += `.${classes.slice(0, 2).join('.')}`;
        }
      }
      return sel;
    }
  };

  // Expose module
  DevLens.responsive = Responsive;
})();
