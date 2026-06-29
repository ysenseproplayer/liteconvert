import { getConfig, saveConfig, getStats, resetStats, resetConfig, initializeSidebar } from './utils/adminManager.js';

// Initialize Layout Sidebar
initializeSidebar('nav-admin');

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '';
  if (type === 'success') {
    icon = '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
  } else if (type === 'danger') {
    icon = '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
  } else {
    icon = '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fadeOut');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ==========================================
// ADMIN WORKSPACE LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  renderAdminWorkspace();

  // Wire up Global configurations save
  const btnSaveGlobal = document.getElementById('btn-save-global-settings');
  if (btnSaveGlobal) {
    btnSaveGlobal.addEventListener('click', saveGlobalConfigurations);
  }

  // Danger actions
  const btnWipeStats = document.getElementById('btn-wipe-stats');
  if (btnWipeStats) {
    btnWipeStats.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all conversion stats logs to zero?')) {
        resetStats();
        renderAdminWorkspace();
        showToast('All conversions logs wiped successfully!', 'success');
      }
    });
  }

  const btnWipeConfig = document.getElementById('btn-wipe-config');
  if (btnWipeConfig) {
    btnWipeConfig.addEventListener('click', () => {
      if (confirm('Are you sure you want to restore default config names, switches, and image constraints?')) {
        resetConfig();
        renderAdminWorkspace();
        // Force sidebar reload to show enabled tools again
        initializeSidebar('nav-admin');
        showToast('Factory configurations restored!', 'success');
      }
    });
  }
});

function renderAdminWorkspace() {
  const config = getConfig();
  const stats = getStats();
  
  // Total summary counts
  const totalConversions = document.getElementById('admin-total-conversions');
  const enabledCount = document.getElementById('admin-enabled-count');
  
  if (totalConversions) totalConversions.textContent = stats.totalConversions || 0;
  
  let activeCount = 0;
  const toolsKeys = Object.keys(config.tools);
  toolsKeys.forEach(k => {
    if (config.tools[k].enabled) activeCount++;
  });
  if (enabledCount) enabledCount.textContent = `${activeCount} / ${toolsKeys.length}`;

  // Populate Tools configuration table
  const tableBody = document.getElementById('admin-tools-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  toolsKeys.forEach(key => {
    const tool = config.tools[key];
    const useCount = stats.conversionsCount[key] || 0;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input type="text" class="inline-edit-input bold" data-tool="${key}" data-field="name" value="${tool.name}">
      </td>
      <td>
        <input type="text" class="inline-edit-input" data-tool="${key}" data-field="desc" value="${tool.desc}">
      </td>
      <td style="text-align: center; vertical-align: middle;">
        <label class="switch">
          <input type="checkbox" class="tool-toggle-checkbox" data-tool="${key}" ${tool.enabled ? 'checked' : ''}>
          <span class="slider-toggle"></span>
        </label>
      </td>
      <td style="text-align: center; vertical-align: middle; font-family: var(--font-mono); font-size: 0.9rem;">
        ${useCount}
      </td>
    `;
    tableBody.appendChild(row);
  });

  // Attach dynamic event listeners inside the table
  // 1. Text edits (on blur/enter)
  const textInputs = tableBody.querySelectorAll('.inline-edit-input');
  textInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const toolKey = e.target.getAttribute('data-tool');
      const field = e.target.getAttribute('data-field');
      const val = e.target.value.trim();
      
      if (!val) {
        showToast('Name/Description cannot be blank', 'danger');
        renderAdminWorkspace();
        return;
      }
      
      const currentConfig = getConfig();
      if (currentConfig.tools[toolKey]) {
        currentConfig.tools[toolKey][field] = val;
        saveConfig(currentConfig);
        showToast(`Updated description for ${currentConfig.tools[toolKey].name}`, 'success');
        // Re-init layout sidebar to apply new custom names
        initializeSidebar('nav-admin');
      }
    });
  });

  // 2. Toggles
  const toggles = tableBody.querySelectorAll('.tool-toggle-checkbox');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const toolKey = e.target.getAttribute('data-tool');
      const isChecked = e.target.checked;
      
      const currentConfig = getConfig();
      if (currentConfig.tools[toolKey]) {
        currentConfig.tools[toolKey].enabled = isChecked;
        saveConfig(currentConfig);
        
        const stateWord = isChecked ? 'enabled' : 'disabled';
        showToast(`Tool "${currentConfig.tools[toolKey].name}" has been ${stateWord}!`, 'success');
        
        // Recompute top stats
        let actCount = 0;
        Object.keys(currentConfig.tools).forEach(k => {
          if (currentConfig.tools[k].enabled) actCount++;
        });
        if (enabledCount) enabledCount.textContent = `${actCount} / ${Object.keys(currentConfig.tools).length}`;
        
        // Re-render sidebar navigation links
        initializeSidebar('nav-admin');
      }
    });
  });

  // Populate Global parameters fields
  const maxImgSizeInput = document.getElementById('admin-max-img-size');
  const defImgFormatSelect = document.getElementById('admin-def-img-format');
  const defImgQualityInput = document.getElementById('admin-def-img-quality');

  if (maxImgSizeInput) maxImgSizeInput.value = config.settings.maxImageSize || 15;
  if (defImgFormatSelect) defImgFormatSelect.value = config.settings.defaultImgFormat || 'image/png';
  if (defImgQualityInput) defImgQualityInput.value = config.settings.defaultImgQuality || 92;
}

function saveGlobalConfigurations() {
  const maxImgSizeInput = document.getElementById('admin-max-img-size');
  const defImgFormatSelect = document.getElementById('admin-def-img-format');
  const defImgQualityInput = document.getElementById('admin-def-img-quality');

  const maxMb = parseInt(maxImgSizeInput.value) || 15;
  const defFormat = defImgFormatSelect.value;
  const defQuality = parseInt(defImgQualityInput.value) || 92;

  if (defQuality < 10 || defQuality > 100) {
    showToast('Quality must be between 10% and 100%', 'danger');
    return;
  }

  const currentConfig = getConfig();
  currentConfig.settings = {
    maxImageSize: maxMb,
    defaultImgFormat: defFormat,
    defaultImgQuality: defQuality
  };

  saveConfig(currentConfig);
  showToast('Global configuration values saved successfully!', 'success');
}
