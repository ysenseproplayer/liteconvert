// ==========================================
// ADMIN CONFIGURATION & STATS MANAGER
// ==========================================

const DEFAULT_CONFIG = {
  tools: {
    'image-converter': { enabled: true, name: 'Image Converter', desc: 'Convert, resize, and compress images with pixel-perfect accuracy.' },
    'data-converter': { enabled: true, name: 'Data Converter', desc: 'Transform complex configurations and table data structures.' },
    'document-compiler': { enabled: true, name: 'Document Compiler', desc: 'Convert text layouts to portable documents or structure rich text formats.' },
    'code-formatter': { enabled: true, name: 'Code Formatter', desc: 'Beautify or compress markup, styling sheets, and application source codes.' },
    'utility-tools': { enabled: true, name: 'Utility Tools', desc: 'Useful helpers for binary encoding, text transforms, and general formatting.' }
  },
  settings: {
    maxImageSize: 15, // MB
    defaultImgQuality: 92,
    defaultImgFormat: 'image/png'
  }
};

const DEFAULT_STATS = {
  conversionsCount: {
    'image-converter': 0,
    'data-converter': 0,
    'document-compiler': 0,
    'code-formatter': 0,
    'utility-tools': 0
  },
  totalConversions: 0
};

export function getConfig() {
  const configStr = localStorage.getItem('liteconvert_config');
  if (!configStr) {
    localStorage.setItem('liteconvert_config', JSON.stringify(DEFAULT_CONFIG));
    return DEFAULT_CONFIG;
  }
  try {
    // Merge defaults in case of missing keys
    const parsed = JSON.parse(configStr);
    return {
      tools: { ...DEFAULT_CONFIG.tools, ...parsed.tools },
      settings: { ...DEFAULT_CONFIG.settings, ...parsed.settings }
    };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config) {
  localStorage.setItem('liteconvert_config', JSON.stringify(config));
  window.dispatchEvent(new Event('liteconvert-config-changed'));
}

export function getStats() {
  const statsStr = localStorage.getItem('liteconvert_stats');
  if (!statsStr) {
    localStorage.setItem('liteconvert_stats', JSON.stringify(DEFAULT_STATS));
    return DEFAULT_STATS;
  }
  try {
    const parsed = JSON.parse(statsStr);
    return {
      conversionsCount: { ...DEFAULT_STATS.conversionsCount, ...parsed.conversionsCount },
      totalConversions: parsed.totalConversions || 0
    };
  } catch (e) {
    return DEFAULT_STATS;
  }
}

export function incrementStat(toolKey) {
  const stats = getStats();
  if (stats.conversionsCount[toolKey] !== undefined) {
    stats.conversionsCount[toolKey]++;
  }
  stats.totalConversions++;
  localStorage.setItem('liteconvert_stats', JSON.stringify(stats));
  window.dispatchEvent(new Event('liteconvert-stats-changed'));
}

export function resetStats() {
  localStorage.setItem('liteconvert_stats', JSON.stringify(DEFAULT_STATS));
  window.dispatchEvent(new Event('liteconvert-stats-changed'));
}

export function resetConfig() {
  localStorage.setItem('liteconvert_config', JSON.stringify(DEFAULT_CONFIG));
  window.dispatchEvent(new Event('liteconvert-config-changed'));
}

// Access guard: verify if a tool is active, if not inject full-screen blocker
export function checkAccess(toolKey) {
  const config = getConfig();
  const tool = config.tools[toolKey];
  
  if (!tool || !tool.enabled) {
    // Inject styles and block overlay
    document.addEventListener('DOMContentLoaded', () => {
      const mainContainer = document.querySelector('.workspace') || document.body;
      
      // Inject blocker HTML
      const blocker = document.createElement('div');
      blocker.className = 'access-blocker-overlay';
      blocker.innerHTML = `
        <div class="blocker-card">
          <div class="blocker-icon-wrapper">
            <svg class="blocker-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2>Tool Access Restricted</h2>
          <p>The tool <strong>"${tool ? tool.name : toolKey}"</strong> has been disabled by the system administrator.</p>
          <div class="blocker-buttons">
            <a href="index.html" class="btn btn-secondary">Go to Dashboard</a>
            <a href="admin.html" class="btn btn-primary">Enable in Admin Panel</a>
          </div>
        </div>
      `;
      
      // Style blocker overlay
      const style = document.createElement('style');
      style.textContent = `
        .access-blocker-overlay {
          position: fixed;
          top: 0;
          left: 280px;
          right: 0;
          bottom: 0;
          background-color: rgba(8, 11, 17, 0.95);
          backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: blockerFadeIn 0.3s ease;
        }
        @media (max-width: 1024px) {
          .access-blocker-overlay {
            left: 0;
          }
        }
        .blocker-card {
          background-color: rgba(17, 24, 39, 0.7);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 20px;
          padding: 3rem 2rem;
          max-width: 480px;
          text-align: center;
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.15);
        }
        .blocker-icon-wrapper {
          width: 72px;
          height: 72px;
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #ef4444;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
        }
        .blocker-icon {
          width: 36px;
          height: 36px;
        }
        .blocker-card h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .blocker-card p {
          color: #9ca3af;
          font-size: 0.95rem;
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        .blocker-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        @keyframes blockerFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(blocker);
    });
    return false;
  }
  return true;
}

// Sidebars are dynamic based on configuration. This function highlights active sidebar nav.
export function initializeSidebar(activeId) {
  document.addEventListener('DOMContentLoaded', () => {
    const config = getConfig();
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    // We can rewrite the sidebar html content or modify class states
    const navItems = [
      { id: 'nav-image', key: 'image-converter', file: 'image.html', label: 'Image Converter', iconPath: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'nav-data', key: 'data-converter', file: 'data.html', label: 'Data Converter', iconPath: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
      { id: 'nav-document', key: 'document-compiler', file: 'document.html', label: 'Document Compiler', iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { id: 'nav-code', key: 'code-formatter', file: 'code.html', label: 'Code Formatter', iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
      { id: 'nav-utility', key: 'utility-tools', file: 'utility.html', label: 'Utility Tools', iconPath: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' }
    ];

    let html = `
      <a href="index.html" class="nav-btn ${activeId === 'nav-dashboard' ? 'active' : ''}" id="nav-dashboard">
        <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        <span>Dashboard</span>
      </a>
    `;

    navItems.forEach(item => {
      const toolConfig = config.tools[item.key];
      const isEnabled = toolConfig ? toolConfig.enabled : true;
      const label = toolConfig ? toolConfig.name : item.label;
      
      if (isEnabled) {
        html += `
          <a href="${item.file}" class="nav-btn ${activeId === item.id ? 'active' : ''}" id="${item.id}">
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.iconPath}" /></svg>
            <span>${label}</span>
          </a>
        `;
      }
    });

    html += `
      <a href="admin.html" class="nav-btn ${activeId === 'nav-admin' ? 'active' : ''}" id="nav-admin" style="margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem;">
        <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <span>Admin Panel</span>
      </a>
    `;

    navMenu.innerHTML = html;
  });
}
