// DevLens Side Panel UI Script

function initializeSidePanel() {
  // DOM Elements
  const globalToggle = document.getElementById('globalToggle');
  const statusLabel = document.getElementById('statusLabel');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');
  
  // CSS Inspector Panel UI Elements
  const selectionStatus = document.getElementById('selectionStatus');
  const styleDisplay = document.getElementById('styleDisplay');
  const elemTagName = document.getElementById('elemTagName');
  const elemSelector = document.getElementById('elemSelector');
  const layoutGrid = document.getElementById('layoutGrid');
  const typographyGrid = document.getElementById('typographyGrid');
  
  // Box Model Elements
  const boxWidth = document.getElementById('boxWidth');
  const boxHeight = document.getElementById('boxHeight');
  const boxMargin = document.querySelector('.box-margin');
  const boxBorder = document.querySelector('.box-border');
  const boxPadding = document.querySelector('.box-padding');

  // AI Debug Console Elements
  const btnClearErrors = document.getElementById('btnClearErrors');
  const errorList = document.getElementById('errorList');

  // Audits Elements
  const btnRunAudit = document.getElementById('btnRunAudit');
  const btnClearAudit = document.getElementById('btnClearAudit');
  const a11yAuditList = document.getElementById('a11yAuditList');
  const responsiveAuditList = document.getElementById('responsiveAuditList');

  // Settings & Config
  const highlightColorInput = document.getElementById('highlightColor');

  // Playground Elements & States
  const btnResetPlayground = document.getElementById('btnResetPlayground');
  const playgroundControls = document.getElementById('playgroundControls');
  const sliderFontSize = document.getElementById('sliderFontSize');
  const valPlaygroundFontSize = document.getElementById('valPlaygroundFontSize');
  const sliderPadding = document.getElementById('sliderPadding');
  const valPlaygroundPadding = document.getElementById('valPlaygroundPadding');
  const sliderMargin = document.getElementById('sliderMargin');
  const valPlaygroundMargin = document.getElementById('valPlaygroundMargin');
  const sliderBorderRadius = document.getElementById('sliderBorderRadius');
  const valPlaygroundBorderRadius = document.getElementById('valPlaygroundBorderRadius');
  const sliderOpacity = document.getElementById('sliderOpacity');
  const valPlaygroundOpacity = document.getElementById('valPlaygroundOpacity');
  const colorText = document.getElementById('colorText');
  const colorBg = document.getElementById('colorBg');
  const playgroundExportContainer = document.getElementById('playgroundExportContainer');
  const playgroundCssCode = document.getElementById('playgroundCssCode');
  const btnCopyPlaygroundChanges = document.getElementById('btnCopyPlaygroundChanges');

  let activeLockedDetails = null;
  let modifiedStyles = {};

  // 1. Tab Switching Logic
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Deactivate all tab buttons and panels
      tabButtons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Activate current tab button and target panel
      btn.classList.add('active');
      const targetPanelId = btn.getAttribute('data-tab');
      document.getElementById(targetPanelId).classList.add('active');
    });
  });

  // HTML escaping utility to prevent XSS/HTML Injection when displaying DOM changes
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 2. Active Tab State Sync Helper
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab;
  }

  // Send message to active tab content script
  async function sendMessageToContent(message) {
    try {
      const activeTab = await getActiveTab();
      if (!activeTab) return null;
      return await chrome.tabs.sendMessage(activeTab.id, message);
    } catch (err) {
      console.log("DevLens: Content script not ready on active tab.", err.message);
      return null;
    }
  }

  // Reset Side Panel UI to default disconnected placeholder state on page reload/navigation
  function resetSidePanelUI() {
    // Uncheck toggle switches
    globalToggle.checked = false;
    statusLabel.textContent = 'Offline';
    statusLabel.classList.remove('active');
    

    
    // Hide panels and display selection status placeholders
    selectionStatus.classList.remove('hidden');
    styleDisplay.classList.add('hidden');
    
    // Clear styles states
    activeLockedDetails = null;
    modifiedStyles = {};
    
    // Reset range inputs and labels
    const controls = [sliderFontSize, sliderPadding, sliderMargin, sliderBorderRadius, sliderOpacity, colorText, colorBg];
    controls.forEach(el => {
      if (el) el.disabled = true;
    });
    
    valPlaygroundFontSize.textContent = '--';
    valPlaygroundPadding.textContent = '--';
    valPlaygroundMargin.textContent = '--';
    valPlaygroundBorderRadius.textContent = '--';
    valPlaygroundOpacity.textContent = '--';
    
    btnResetPlayground.classList.add('hidden');
    playgroundExportContainer.classList.add('hidden');
    
    // Reset lists
    errorList.innerHTML = '<li class="placeholder-item">Console is empty. Reload or trigger scripts to capture console diagnostics.</li>';
    a11yAuditList.innerHTML = '<li class="placeholder-item">No audits run yet. Click "Run Audits".</li>';
    responsiveAuditList.innerHTML = '<li class="placeholder-item">No audits run yet. Click "Run Audits".</li>';
  }

  // Listen for active tab updates (reloads/navigations) to flush sidepanel states
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
      const activeTab = await getActiveTab();
      if (activeTab && tabId === activeTab.id && changeInfo.status === 'loading') {
        resetSidePanelUI();
      }
    } catch (err) {
      // Fail silently
    }
  });

  // 3. Status Toggle (Activation / Deactivation)
  globalToggle.addEventListener('change', async () => {
    const isActive = globalToggle.checked;
    
    // Update visual label
    if (isActive) {
      statusLabel.textContent = 'Active';
      statusLabel.classList.add('active');
    } else {
      statusLabel.textContent = 'Offline';
      statusLabel.classList.remove('active');
      // Reset Style UI to placeholder state
      styleDisplay.classList.add('hidden');
      selectionStatus.classList.remove('hidden');
    }

    // Propagate activation status to content scripts
    await sendMessageToContent({ action: 'toggleState', active: isActive });
  });

  // Synchronize toggle button with initial tab state
  async function syncInitialToggleState() {
    const response = await sendMessageToContent({ action: 'ping' });
    if (response && response.status === 'ok') {
      globalToggle.checked = response.active;
      if (response.active) {
        statusLabel.textContent = 'Active';
        statusLabel.classList.add('active');
      }
    }
  }
  syncInitialToggleState();

  // 4. Config settings (Highlight Colors)
  highlightColorInput.addEventListener('input', async () => {
    const color = highlightColorInput.value;
    chrome.storage.local.set({ highlightColor: color });
    await sendMessageToContent({
      action: 'updateConfig',
      config: { highlightColor: color }
    });
  });

  // Restore saved highlight color config
  chrome.storage.local.get(['highlightColor'], (result) => {
    if (result.highlightColor) {
      highlightColorInput.value = result.highlightColor;
    }
  });

  // 5. CSS Inspector: Live Update of Inspected Element Details
  function displayElementDetails(details) {
    if (!globalToggle.checked) return;

    // Show style dashboard panel, hide initial placeholder
    selectionStatus.classList.add('hidden');
    styleDisplay.classList.remove('hidden');

    // Set tag name and selector names
    elemTagName.textContent = details.tagName;
    elemSelector.textContent = details.selector || '';

    // Render Layout & Sizing properties grid
    layoutGrid.innerHTML = '';
    const layoutProps = details.styles.layout;
    for (const [propName, propVal] of Object.entries(layoutProps)) {
      if (propVal && propVal !== 'none' && propVal !== 'auto') {
        const title = propName.replace(/([A-Z])/g, "-$1").toLowerCase();
        layoutGrid.innerHTML += `<dt>${escapeHTML(title)}</dt><dd>${escapeHTML(propVal)}</dd>`;
      }
    }

    // Render Typography properties grid
    typographyGrid.innerHTML = '';
    const typoProps = details.styles.typography;
    for (const [propName, propVal] of Object.entries(typoProps)) {
      if (propVal && propVal !== 'normal' && propVal !== 'none') {
        const title = propName.replace(/([A-Z])/g, "-$1").toLowerCase();
        typographyGrid.innerHTML += `<dt>${escapeHTML(title)}</dt><dd>${escapeHTML(propVal)}</dd>`;
      }
    }

    // Update Box Model measurements
    const metrics = details.metrics;
    boxWidth.textContent = metrics.width;
    boxHeight.textContent = metrics.height;

    // Set border visual representation details
    updateBoxModelMarginPadding(boxMargin, 'margin', metrics.margin);
    updateBoxModelMarginPadding(boxBorder, 'border', metrics.border);
    updateBoxModelMarginPadding(boxPadding, 'padding', metrics.padding);

    // Visual Playground Update
    syncPlaygroundControls(details);
  }

  // Box Model Label formatting helper
  function updateBoxModelMarginPadding(container, prefix, directions) {
    if (!container) return;
    
    // Format values (e.g. "12px" -> "12" or "-" if empty/0)
    const formatVal = (val) => {
      if (!val || val === '0px' || val === '0') return '-';
      return val.replace('px', '');
    };

    container.style.setProperty(`--${prefix}-top`, `"${formatVal(directions.top)}"`);
    container.style.setProperty(`--${prefix}-right`, `"${formatVal(directions.right)}"`);
    container.style.setProperty(`--${prefix}-bottom`, `"${formatVal(directions.bottom)}"`);
    container.style.setProperty(`--${prefix}-left`, `"${formatVal(directions.left)}"`);
  }

  // Synchronize CSS Playground controls when an element is locked
  function syncPlaygroundControls(details) {
    activeLockedDetails = details;
    
    const controls = [sliderFontSize, sliderPadding, sliderMargin, sliderBorderRadius, sliderOpacity, colorText, colorBg, playgroundCssCode];
    
    if (details.isLocked) {
      // Enable all playground inputs
      controls.forEach(el => el.disabled = false);
      
      // If we are locking a NEW element (no overrides recorded yet), sync slider UI to computed values
      if (Object.keys(modifiedStyles).length === 0) {
        // Font Size
        const fsPx = parseInt(details.styles.typography.fontSize) || 16;
        sliderFontSize.value = fsPx;
        valPlaygroundFontSize.textContent = fsPx + 'px';
        
        // Padding
        const pdPx = parseInt(details.metrics.padding.top) || 0;
        sliderPadding.value = pdPx;
        valPlaygroundPadding.textContent = pdPx + 'px';
        
        // Margin
        const mgPx = parseInt(details.metrics.margin.top) || 0;
        sliderMargin.value = mgPx;
        valPlaygroundMargin.textContent = mgPx + 'px';
        
        // Border Radius
        const brPx = parseInt(details.styles.borderRadius) || 0;
        sliderBorderRadius.value = brPx;
        valPlaygroundBorderRadius.textContent = brPx + 'px';
        
        // Opacity
        const opVal = details.styles.opacity ? Math.round(parseFloat(details.styles.opacity) * 100) : 100;
        sliderOpacity.value = opVal;
        valPlaygroundOpacity.textContent = opVal + '%';
        
        // Colors
        colorText.value = rgbToHex(details.styles.typography.color);
        colorBg.value = rgbToHex(details.styles.backgroundColor);
 
        // Always show exports box immediately
        updatePlaygroundExportBox();
      } else {
        updatePlaygroundExportBox();
      }
    } else {
      // Disable playground controls if not locked
      controls.forEach(el => el.disabled = true);
      
      // Clear values display
      valPlaygroundFontSize.textContent = '--';
      valPlaygroundPadding.textContent = '--';
      valPlaygroundMargin.textContent = '--';
      valPlaygroundBorderRadius.textContent = '--';
      valPlaygroundOpacity.textContent = '--';
      
      // Clear overrides and hide elements
      modifiedStyles = {};
      btnResetPlayground.classList.add('hidden');
      playgroundExportContainer.classList.add('hidden');
      playgroundCssCode.value = '';
    }
  }
 
  // Handle slide adjustments
  function handlePlaygroundTweak(prop, cssVal) {
    if (!activeLockedDetails || !activeLockedDetails.isLocked) return;
    
    modifiedStyles[prop] = cssVal;
    
    // Broadcast tweak to content script
    sendMessageToContent({
      action: 'tweakStyle',
      property: prop,
      value: cssVal
    });
    
    updatePlaygroundExportBox();
  }
 
  // Regenerate dynamic CSS changes diff inside textarea
  function updatePlaygroundExportBox() {
    if (!activeLockedDetails) return;
    if (document.activeElement === playgroundCssCode) return; // Prevent overwriting while user is typing
 
    const keys = Object.keys(modifiedStyles);
    if (keys.length === 0) {
      btnResetPlayground.classList.add('hidden');
    } else {
      btnResetPlayground.classList.remove('hidden');
    }
    
    // Always keep export container visible when locked
    playgroundExportContainer.classList.remove('hidden');
    
    let cssText = `/* Live Tweaks: ${activeLockedDetails.tagName}${activeLockedDetails.selector ? ' (' + activeLockedDetails.selector.split('.')[0] + ')' : ''} */\n`;
    cssText += `${activeLockedDetails.tagName}${activeLockedDetails.selector ? activeLockedDetails.selector : ''} {\n`;
    
    if (keys.length === 0) {
      cssText += `  /* Adjust visual playground sliders above or type custom CSS here */\n`;
    } else {
      for (const [prop, val] of Object.entries(modifiedStyles)) {
        const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
        cssText += `  ${cssProp}: ${val};\n`;
      }
    }
    cssText += `}`;
    
    playgroundCssCode.value = cssText;
  }
 
  // Parse raw CSS declarations block into key-value overrides
  function parseCSSText(cssText) {
    const rules = {};
    if (!cssText) return rules;
    
    const declarations = cssText.split(';');
    declarations.forEach(decl => {
      const parts = decl.split(':');
      if (parts.length >= 2) {
        const prop = parts[0].trim();
        const val = parts.slice(1).join(':').trim();
        if (prop && val) {
          // Convert kebab-case property to camelCase (e.g. font-size -> fontSize)
          const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          rules[camelProp] = val;
        }
      }
    });
    return rules;
  }
 
  // Sync visual slider controls to match typed values in CSS text box
  function syncSlidersFromModifiedStyles() {
    // Font Size
    if (modifiedStyles.fontSize) {
      const fs = parseInt(modifiedStyles.fontSize);
      if (!isNaN(fs)) {
        sliderFontSize.value = fs;
        valPlaygroundFontSize.textContent = modifiedStyles.fontSize;
      }
    } else {
      sliderFontSize.value = 16;
      valPlaygroundFontSize.textContent = '--';
    }
 
    // Padding
    if (modifiedStyles.padding) {
      const pd = parseInt(modifiedStyles.padding);
      if (!isNaN(pd)) {
        sliderPadding.value = pd;
        valPlaygroundPadding.textContent = modifiedStyles.padding;
      }
    } else {
      sliderPadding.value = 0;
      valPlaygroundPadding.textContent = '--';
    }
 
    // Margin
    if (modifiedStyles.margin) {
      const mg = parseInt(modifiedStyles.margin);
      if (!isNaN(mg)) {
        sliderMargin.value = mg;
        valPlaygroundMargin.textContent = modifiedStyles.margin;
      }
    } else {
      sliderMargin.value = 0;
      valPlaygroundMargin.textContent = '--';
    }
 
    // Border Radius
    if (modifiedStyles.borderRadius) {
      const br = parseInt(modifiedStyles.borderRadius);
      if (!isNaN(br)) {
        sliderBorderRadius.value = br;
        valPlaygroundBorderRadius.textContent = modifiedStyles.borderRadius;
      }
    } else {
      sliderBorderRadius.value = 0;
      valPlaygroundBorderRadius.textContent = '--';
    }
 
    // Opacity
    if (modifiedStyles.opacity) {
      const op = parseFloat(modifiedStyles.opacity);
      if (!isNaN(op)) {
        sliderOpacity.value = Math.round(op * 100);
        valPlaygroundOpacity.textContent = Math.round(op * 100) + '%';
      }
    } else {
      sliderOpacity.value = 100;
      valPlaygroundOpacity.textContent = '--';
    }
 
    // Colors
    if (modifiedStyles.color) {
      colorText.value = rgbToHex(modifiedStyles.color);
    }
    if (modifiedStyles.backgroundColor) {
      colorBg.value = rgbToHex(modifiedStyles.backgroundColor);
    }
  }
 
  // Helper: RGB/RGBA representation string convert to HEX code representation
  function rgbToHex(rgbStr) {
    if (!rgbStr) return '#000000';
    if (rgbStr.startsWith('#')) return rgbStr;
    const match = rgbStr.match(/\d+/g);
    if (!match || match.length < 3) return '#000000';
    const r = parseInt(match[0]);
    const g = parseInt(match[1]);
    const b = parseInt(match[2]);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
 
  // Attach event handlers
  sliderFontSize.addEventListener('input', () => {
    const val = sliderFontSize.value + 'px';
    valPlaygroundFontSize.textContent = val;
    handlePlaygroundTweak('fontSize', val);
  });
 
  sliderPadding.addEventListener('input', () => {
    const val = sliderPadding.value + 'px';
    valPlaygroundPadding.textContent = val;
    handlePlaygroundTweak('padding', val);
  });
 
  sliderMargin.addEventListener('input', () => {
    const val = sliderMargin.value + 'px';
    valPlaygroundMargin.textContent = val;
    handlePlaygroundTweak('margin', val);
  });
 
  sliderBorderRadius.addEventListener('input', () => {
    const val = sliderBorderRadius.value + 'px';
    valPlaygroundBorderRadius.textContent = val;
    handlePlaygroundTweak('borderRadius', val);
  });
 
  sliderOpacity.addEventListener('input', () => {
    const valStr = sliderOpacity.value + '%';
    const valFloat = (sliderOpacity.value / 100).toFixed(2);
    valPlaygroundOpacity.textContent = valStr;
    handlePlaygroundTweak('opacity', valFloat);
  });
 
  colorText.addEventListener('input', () => {
    handlePlaygroundTweak('color', colorText.value);
  });
 
  colorBg.addEventListener('input', () => {
    handlePlaygroundTweak('backgroundColor', colorBg.value);
  });
 
  playgroundCssCode.addEventListener('input', () => {
    if (!activeLockedDetails || !activeLockedDetails.isLocked) return;
 
    const text = playgroundCssCode.value;
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const declarationsText = text.substring(startIdx + 1, endIdx).trim();
      
      // Parse declaration rules
      modifiedStyles = parseCSSText(declarationsText);
      
      if (Object.keys(modifiedStyles).length === 0) {
        btnResetPlayground.classList.add('hidden');
      } else {
        btnResetPlayground.classList.remove('hidden');
      }
 
      // Propagate raw styling override rules
      sendMessageToContent({
        action: 'applyCustomCSSRules',
        cssText: declarationsText
      });
 
      // Synchronize sliders visually
      syncSlidersFromModifiedStyles();
    }
  });
 
  btnResetPlayground.addEventListener('click', async () => {
    await sendMessageToContent({ action: 'resetTweak' });
    modifiedStyles = {};
    syncPlaygroundControls(activeLockedDetails);
  });
 
  btnCopyPlaygroundChanges.addEventListener('click', () => {
    const code = playgroundCssCode.value;
    navigator.clipboard.writeText(code).then(() => {
      const origText = btnCopyPlaygroundChanges.textContent;
      btnCopyPlaygroundChanges.textContent = 'Copied!';
      setTimeout(() => {
        btnCopyPlaygroundChanges.textContent = origText;
      }, 1500);
    });
  });

  // 6. Mutation Timeline Controls
  // 6. AI Debug Console Actions
  btnClearErrors.addEventListener('click', () => {
    errorList.innerHTML = '<li class="placeholder-item">Console is empty. Reload or trigger scripts to capture console diagnostics.</li>';
  });

  // Render captured error inside AI Console
  function renderErrorCard(err) {
    const card = document.createElement('li');
    const diag = getAIDiagnostics(err);
    
    card.className = `error-card card-${diag.badge}`;
    
    let html = `
      <div class="error-card-header">
        <span class="error-badge ${diag.badge}">${diag.badgeName}</span>
        <span class="error-time">${escapeHTML(err.time || new Date().toLocaleTimeString())}</span>
      </div>
      <div class="error-title">${escapeHTML(err.message || diag.defaultTitle)}</div>
      <div class="error-section-divider"></div>
    `;
    
    if (diag.why) {
      html += `
        <div class="error-section">
          <div class="error-section-title">Why?</div>
          <div class="error-section-content">${diag.why}</div>
        </div>
        <div class="error-section-divider"></div>
      `;
    }
    
    if (diag.suggestedFix) {
      html += `
        <div class="error-section">
          <div class="error-section-title">Suggested Fix</div>
          <div class="error-section-content">${diag.suggestedFix}</div>
        </div>
      `;
    }
    
    if (diag.correctedCode) {
      html += `
        <div class="error-section">
          <div class="error-section-title">Suggested Code</div>
          <div class="error-code-block correct">${escapeHTML(diag.correctedCode)}</div>
        </div>
      `;
    }
    
    if (diag.wrongCode || diag.rightCode) {
      if (diag.wrongCode) {
        html += `
          <div class="error-section">
            <div class="error-section-title">Wrong</div>
            <div class="error-code-block wrong">${escapeHTML(diag.wrongCode)}</div>
          </div>
        `;
      }
      if (diag.rightCode) {
        html += `
          <div class="error-section">
            <div class="error-section-title">Correct</div>
            <div class="error-code-block correct">${escapeHTML(diag.rightCode)}</div>
          </div>
        `;
      }
    }
    
    if (diag.checks && diag.checks.length > 0) {
      html += `
        <div class="error-section">
          <div class="error-section-title">Suggested Checks</div>
          <ul class="error-list">
            ${diag.checks.map(c => `<li>${escapeHTML(c)}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    if (diag.link && diag.linkLabel) {
      html += `
        <div class="error-section-divider"></div>
        <div class="error-section">
          <div class="error-section-title">Learn More</div>
          <a href="${diag.link}" target="_blank" class="error-link">${escapeHTML(diag.linkLabel)}</a>
        </div>
      `;
    }
    
    card.innerHTML = html;
    errorList.insertBefore(card, errorList.firstChild);
    
    const placeholder = errorList.querySelector('.placeholder-item');
    if (placeholder) placeholder.remove();
    
    const maxEntries = 50;
    while (errorList.children.length > maxEntries) {
      errorList.removeChild(errorList.lastChild);
    }
  }

  // Local AI Diagnostics Engine
  function getAIDiagnostics(err) {
    const msg = (err.message || '').toLowerCase();
    
    // API Errors (404/500)
    if (err.type === 'api-error') {
      const isFailed = err.status === 'Failed';
      return {
        badge: 'api',
        badgeName: isFailed ? 'Network Error' : `API ${err.status}`,
        defaultTitle: `GET ${err.url}`,
        why: isFailed ? 'The network connection to the backend service failed entirely.' : `You made a request to "${err.url}" which returned a 404 Not Found response.`,
        checks: [
          'Verify API destination URL is correct',
          'Check if backend server is listening and healthy',
          'Inspect details under browser Network Tab'
        ]
      };
    }
    
    // React child list unique key warning
    if (msg.includes('unique key') || msg.includes('each child in a list')) {
      return {
        badge: 'warn',
        badgeName: 'React Warning',
        defaultTitle: 'Each child in a list should have a unique key.',
        why: 'React uses keys to identify components between renders for optimized virtual DOM updates.',
        wrongCode: 'items.map(item => (\n  <div>{item.name}</div>\n))',
        rightCode: 'items.map(item => (\n  <div key={item.id}>{item.name}</div>\n))',
        link: 'https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-keys',
        linkLabel: 'React: Rendering Lists'
      };
    }
    
    // TypeError: items.map is not a function
    if (msg.includes('.map is not a function') || msg.includes('map is not a function')) {
      return {
        badge: 'error',
        badgeName: 'TypeError',
        defaultTitle: 'items.map is not a function',
        why: 'The variable "items" is not an Array (it may be undefined, null, Object, or String).',
        suggestedFix: 'Verify the variable value or guard the map call with an Array check:',
        correctedCode: 'if (Array.isArray(items)) {\n  items.map(...);\n}\n\n// Alternative:\nconst list = items || [];\nlist.map(...);',
        link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
        linkLabel: 'MDN: Array.prototype.map()'
      };
    }
    
    // TypeError: Cannot read properties of undefined
    if (msg.includes('cannot read properties of') || msg.includes('cannot read property of')) {
      if (msg.includes("reading 'map'") || msg.includes("reading 'foreach'") || msg.includes("reading 'filter'") || msg.includes("reading 'reduce'")) {
        const method = msg.includes("reading 'map'") ? 'map' : (msg.includes("reading 'foreach'") ? 'forEach' : (msg.includes("reading 'filter'") ? 'filter' : 'reduce'));
        return {
          badge: 'error',
          badgeName: 'TypeError',
          defaultTitle: err.message || `Cannot read properties of undefined (reading '${method}')`,
          why: `You are trying to call the array method ".${method}()" on a variable that is undefined or has not been initialized yet.`,
          suggestedFix: 'Initialize the state as an empty array or use optional chaining (?.) to guard the call:',
          correctedCode: `// Suggested React state initialization:\nconst [list, setList] = useState([]); // Default to empty array\n\n// Or optional chaining:\nlist?.${method}((item, i) => (\n  <p key={i}>{item}</p>\n))`,
          link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
          linkLabel: 'MDN: JavaScript Arrays'
        };
      }

      return {
        badge: 'error',
        badgeName: 'TypeError',
        defaultTitle: err.message || 'Cannot read properties of undefined',
        why: 'You are trying to access a property before the object parent has been defined.',
        suggestedFix: 'Use JavaScript optional chaining (?.) or add conditional check blocks:',
        correctedCode: 'const username = user?.name ?? "Guest";\n\n// Or:\nif (user) {\n  const username = user.name;\n}',
        link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
        linkLabel: 'MDN: Optional Chaining (?.)'
      };
    }

    // TypeError: Assignment to constant variable
    if (msg.includes('assignment to constant variable')) {
      return {
        badge: 'error',
        badgeName: 'TypeError',
        defaultTitle: 'Assignment to constant variable',
        why: 'You declared a variable using "const" and then tried to assign a new value to it, which is not permitted.',
        suggestedFix: 'Redeclare the variable using "let" instead of "const" if you need to reassign its value:',
        correctedCode: 'let count = 0;\ncount = 1; // Permitted\n\n// Wrong:\nconst count = 0;\ncount = 1; // Throws TypeError',
        link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let',
        linkLabel: 'MDN: let statement'
      };
    }

    // ReferenceError: x is not defined
    if (msg.includes('is not defined')) {
      const varName = err.message ? err.message.split(' ')[0] : 'variable';
      return {
        badge: 'error',
        badgeName: 'ReferenceError',
        defaultTitle: err.message || 'Variable is not defined',
        why: `You are referencing the variable "${varName}" which has not been declared anywhere in the current scope.`,
        suggestedFix: 'Declare the variable using const, let, or var before referencing it, or check for typos:',
        correctedCode: `const ${varName} = "some value";\nconsole.log(${varName});`,
        link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined',
        linkLabel: 'MDN: ReferenceError: "x" is not defined'
      };
    }

    // Promise Rejection
    if (err.type === 'unhandledrejection' || err.errorClass === 'Promise Error') {
      return {
        badge: 'promise',
        badgeName: 'Promise Error',
        defaultTitle: err.message || 'Unhandled Promise Rejection',
        why: 'An asynchronous promise call failed but did not have a catch handler attached.',
        suggestedFix: 'Wrap your async call inside try/catch execution blocks:',
        correctedCode: 'try {\n  await apiCall();\n} catch (err) {\n  console.error(err);\n}',
        link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#error_handling',
        linkLabel: 'MDN: Promise Error Handling'
      };
    }
    
    // Fallback Generic Error
    return {
      badge: 'error',
      badgeName: err.errorClass || 'Error',
      defaultTitle: err.message || 'Unhandled Runtime Error',
      why: 'An uncaught script anomaly has been captured on the page.',
      suggestedFix: 'Inspect the stack trace call chain and check scope references.',
      checks: [
        'Verify target variable identifiers are spelt correctly',
        'Verify correct module imports and scope rules',
        'Check network configurations and console logs'
      ]
    };
  }

  // 7. Messaging Listener: Receives messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'elementInspected') {
      displayElementDetails(message.details);
    } else if (message.action === 'pageError') {
      renderErrorCard(message.error);
    }
  });

  // 8. Audits Actions
  btnRunAudit.addEventListener('click', async () => {
    a11yAuditList.innerHTML = '<li class="placeholder-item">Running accessibility audits...</li>';
    responsiveAuditList.innerHTML = '<li class="placeholder-item">Running layout scans...</li>';

    const response = await sendMessageToContent({ action: 'runAudits' });
    if (response && response.success) {
      renderAuditResults(a11yAuditList, response.a11y, 'No accessibility issues detected.');
      renderAuditResults(responsiveAuditList, response.responsive, 'No layout overflow issues detected.');
    } else {
      const errorMsg = response?.error || 'Ensure DevLens toggle is set to Active on the webpage.';
      a11yAuditList.innerHTML = `<li class="placeholder-item" style="color: var(--color-danger)">Failed: ${errorMsg}</li>`;
      responsiveAuditList.innerHTML = `<li class="placeholder-item" style="color: var(--color-danger)">Failed: ${errorMsg}</li>`;
    }
  });

  btnClearAudit.addEventListener('click', () => {
    a11yAuditList.innerHTML = '<li class="placeholder-item">No audits run yet. Click "Run Audits".</li>';
    responsiveAuditList.innerHTML = '<li class="placeholder-item">No audits run yet. Click "Run Audits".</li>';
  });

  function renderAuditResults(container, issues, successMsg) {
    container.innerHTML = '';
    
    if (!issues || issues.length === 0) {
      container.innerHTML = `
        <li class="audit-item success">
          <span class="audit-badge success">PASS</span>
          <div class="audit-text">
            <span class="audit-message">${escapeHTML(successMsg)}</span>
          </div>
        </li>
      `;
      return;
    }

    issues.forEach(issue => {
      const li = document.createElement('li');
      const escapedType = escapeHTML(issue.type);
      li.className = `audit-item ${escapedType}`;

      const escapedMessage = escapeHTML(issue.message);
      const escapedElement = escapeHTML(issue.element);
      const escapedDetails = escapeHTML(issue.details);

      li.innerHTML = `
        <span class="audit-badge ${escapedType}">${escapedType === 'danger' ? 'FAIL' : 'WARN'}</span>
        <div class="audit-text">
          <span class="audit-message">${escapedMessage}</span>
          <span class="audit-element-ref">${escapedElement}</span>
          <span class="audit-element-ref" style="color: var(--text-muted)">${escapedDetails}</span>
        </div>
      `;

      container.appendChild(li);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidePanel);
} else {
  initializeSidePanel();
}
