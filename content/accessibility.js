// DevLens Accessibility Auditor & Color Contrast Solver
(function () {
  if (!window.__DevLens__) return;

  const DevLens = window.__DevLens__;

  const Accessibility = {
    runAudit() {
      const issues = [];

      // 1. Image Alt Checker
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        if (img === DevLens.shadowHost || DevLens.shadowHost?.contains(img)) return;

        if (!img.hasAttribute('alt') || img.getAttribute('alt').trim() === '') {
          issues.push({
            type: 'danger',
            message: 'Image missing alt description',
            element: this.getElementSelector(img),
            details: 'Required for screen reader accessibility.'
          });
        }
      });

      // 2. Interactive Element Description Check
      // Check <a> and <button> elements for readable content or aria descriptors
      const interactives = document.querySelectorAll('a, button');
      interactives.forEach((el) => {
        if (el === DevLens.shadowHost || DevLens.shadowHost?.contains(el)) return;

        const text = el.textContent?.trim();
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');

        if (!text && !ariaLabel && !ariaLabelledBy) {
          issues.push({
            type: 'warning',
            message: 'Empty interactive control',
            element: this.getElementSelector(el),
            details: `Interactive <${el.tagName.toLowerCase()}> contains no accessible label text.`
          });
        }
      });

      // 3. Form Input Label Checker
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((input) => {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') return;
        if (input === DevLens.shadowHost || DevLens.shadowHost?.contains(input)) return;

        // Check for aria descriptions or associated labels
        const id = input.id;
        const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
        const hasParentLabel = input.closest('label') !== null;
        const hasAssociatedLabel = id ? document.querySelector(`label[for="${id}"]`) !== null : false;

        if (!hasAriaLabel && !hasParentLabel && !hasAssociatedLabel) {
          issues.push({
            type: 'warning',
            message: 'Input missing description label',
            element: this.getElementSelector(input),
            details: `Form field <input type="${input.type}"> requires a <label> or aria-label attribute.`
          });
        }
      });

      // 4. Duplicate H1 Headers Check
      const h1s = document.querySelectorAll('h1');
      if (h1s.length > 1) {
        issues.push({
          type: 'warning',
          message: 'Multiple H1 tags found',
          element: 'document',
          details: `Found ${h1s.length} h1 elements. Standard layouts specify exactly 1 primary heading.`
        });
      }

      // 5. Contrast Ratio Checker (Traverses text nodes and solves color contrast)
      const textContainers = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, label, li');
      let contrastChecksCount = 0;

      for (let el of textContainers) {
        if (el === DevLens.shadowHost || DevLens.shadowHost?.contains(el)) continue;
        
        // Skip hidden elements or empty container tags
        if (!el.textContent?.trim() || el.offsetWidth === 0 || el.offsetHeight === 0) continue;
        if (contrastChecksCount > 20) break; // Limit checks to avoid performance lags on huge pages

        const computed = window.getComputedStyle(el);
        const foregroundColor = computed.color;
        const backgroundColor = this.resolveActualBackgroundColor(el);

        if (foregroundColor && backgroundColor) {
          const ratio = this.calculateContrastRatio(foregroundColor, backgroundColor);
          
          // Minimum WCAG AA Standard for regular text is 4.5:1
          if (ratio < 4.5) {
            contrastChecksCount++;
            issues.push({
              type: 'danger',
              message: 'Low text contrast ratio',
              element: this.getElementSelector(el),
              details: `Ratio is ${ratio.toFixed(2)}:1 (WCAG AA standard is 4.5:1). Color: ${foregroundColor}, Bg: ${backgroundColor}`
            });
          }
        }
      }

      return issues.slice(0, 30);
    },

    // Solves actual background color by traversing parents if parent backgrounds are transparent
    resolveActualBackgroundColor(element) {
      let el = element;
      while (el) {
        const bg = window.getComputedStyle(el).backgroundColor;
        // Verify background is not fully transparent (rgba with alpha = 0 or transparent string)
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          // If background has some transparency, we can just return it or parse
          return bg;
        }
        el = el.parentElement;
      }
      return 'rgb(255, 255, 255)'; // Fallback to body default background (white) if everything is transparent
    },

    // Convert RGB colors and compute WCAG Relative Luminance
    getRelativeLuminance(rgbString) {
      // Parses "rgb(r, g, b)" or "rgba(r, g, b, a)"
      const match = rgbString.match(/\d+(\.\d+)?/g);
      if (!match || match.length < 3) return 0;

      const r = parseFloat(match[0]) / 255;
      const g = parseFloat(match[1]) / 255;
      const b = parseFloat(match[2]) / 255;

      const adjust = (val) => {
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      };

      const R = adjust(r);
      const G = adjust(g);
      const B = adjust(b);

      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    },

    // Calculate contrast ratio between two colors
    calculateContrastRatio(fgColor, bgColor) {
      const l1 = this.getRelativeLuminance(fgColor);
      const l2 = this.getRelativeLuminance(bgColor);

      const brightest = Math.max(l1, l2);
      const darkest = Math.min(l1, l2);

      return (brightest + 0.05) / (darkest + 0.05);
    },

    // Selector utility
    getElementSelector(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
      let sel = element.tagName.toLowerCase();
      if (element.id) {
        sel += `#${element.id}`;
      } else if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
          sel += `.${classes.slice(0, 1).join('.')}`;
        }
      }
      return sel;
    }
  };

  // Expose module
  DevLens.accessibility = Accessibility;
})();
