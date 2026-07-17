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

  // Mutation Timeline Elements
  const observerToggle = document.getElementById('observerToggle');
  const btnClearTimeline = document.getElementById('btnClearTimeline');
  const timelineList = document.getElementById('timelineList');

  // Audits Elements
  const btnRunAudit = document.getElementById('btnRunAudit');
  const btnClearAudit = document.getElementById('btnClearAudit');
  const a11yAuditList = document.getElementById('a11yAuditList');
  const responsiveAuditList = document.getElementById('responsiveAuditList');

  // Settings & Config
  const highlightColorInput = document.getElementById('highlightColor');

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

  // 6. Mutation Timeline Controls
  btnClearTimeline.addEventListener('click', () => {
    timelineList.innerHTML = '<li class="placeholder-item">Timeline is empty. Trigger page changes to record mutations.</li>';
  });

  observerToggle.addEventListener('change', async () => {
    const isChecked = observerToggle.checked;
    await sendMessageToContent({
      action: 'toggleMutationRecording',
      recording: isChecked
    });
  });

  // Appends incoming mutations list items to timeline UI
  function appendMutationsToTimeline(mutations) {
    const placeholder = timelineList.querySelector('.placeholder-item');
    if (placeholder) {
      placeholder.remove();
    }

    mutations.forEach(mut => {
      const li = document.createElement('li');
      li.className = 'timeline-item';

      const escapedType = escapeHTML(mut.type);
      const escapedTime = escapeHTML(mut.time);
      const escapedDesc = escapeHTML(mut.description);
      const escapedDetails = escapeHTML(mut.details);
      const escapedSelector = escapeHTML(mut.selector);

      li.innerHTML = `
        <div class="timeline-meta">
          <span class="mutation-type-badge ${escapedType}">${escapedType}</span>
          <span class="mutation-time">${escapedTime}</span>
        </div>
        <div class="mutation-desc">${escapedDesc}</div>
        <div class="mutation-details" title="${escapedDetails}">${escapedDetails}</div>
        <div class="mutation-target-ref">Selector: ${escapedSelector}</div>
      `;

      timelineList.insertBefore(li, timelineList.firstChild);
    });

    const maxEntries = 100;
    while (timelineList.children.length > maxEntries) {
      timelineList.removeChild(timelineList.lastChild);
    }
  }

  // 7. Messaging Listener: Receives messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'elementInspected') {
      displayElementDetails(message.details);
    } else if (message.action === 'domMutations') {
      appendMutationsToTimeline(message.mutations);
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
