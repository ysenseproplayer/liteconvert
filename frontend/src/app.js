import { getConfig, getStats, initializeSidebar } from './utils/adminManager.js';

// Initialize the shared layout sidebar
initializeSidebar('nav-dashboard');

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  
  // Listen for config or stats changes to dynamically re-render
  window.addEventListener('liteconvert-config-changed', renderDashboard);
  window.addEventListener('liteconvert-stats-changed', renderDashboard);
});

function renderDashboard() {
  const config = getConfig();
  const stats = getStats();
  
  // Set summary numbers
  const totalConversions = document.getElementById('stat-total-conversions');
  const activeTools = document.getElementById('stat-active-tools');
  const container = document.getElementById('tools-grid-container');
  
  if (totalConversions) totalConversions.textContent = stats.totalConversions || 0;
  
  let enabledCount = 0;
  const toolsKeys = Object.keys(config.tools);
  toolsKeys.forEach(k => {
    if (config.tools[k].enabled) enabledCount++;
  });
  if (activeTools) activeTools.textContent = `${enabledCount} / ${toolsKeys.length}`;
  
  // Render grid cards
  if (!container) return;
  container.innerHTML = '';
  
  const toolsMeta = [
    { key: 'image-converter', file: 'image.html', iconPath: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { key: 'data-converter', file: 'data.html', iconPath: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { key: 'document-compiler', file: 'document.html', iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { key: 'code-formatter', file: 'code.html', iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    { key: 'utility-tools', file: 'utility.html', iconPath: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' }
  ];
  
  toolsMeta.forEach(tool => {
    const info = config.tools[tool.key];
    const isEnabled = info ? info.enabled : true;
    const name = info ? info.name : tool.key;
    const desc = info ? info.desc : '';
    const useCount = stats.conversionsCount[tool.key] || 0;
    
    const card = document.createElement('a');
    card.href = isEnabled ? tool.file : '#';
    card.className = `tool-card ${isEnabled ? '' : 'disabled'}`;
    
    let lockBadge = '';
    if (!isEnabled) {
      lockBadge = `
        <div class="tool-card-lock">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Locked
        </div>
      `;
    }
    
    card.innerHTML = `
      <div class="tool-card-header">
        <div class="tool-card-icon">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${tool.iconPath}" /></svg>
        </div>
        ${lockBadge}
      </div>
      <h3>${name}</h3>
      <p>${desc}</p>
      <div class="tool-card-footer">
        <span class="tool-badge ${isEnabled ? 'stats' : 'disabled'}">
          ${isEnabled ? `${useCount} conversions` : 'Disabled'}
        </span>
        ${isEnabled ? `
          <span class="tool-action-link">
            Open Tool
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </span>
        ` : ''}
      </div>
    `;
    
    container.appendChild(card);
  });
}
