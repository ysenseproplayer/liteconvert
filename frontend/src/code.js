import * as converters from './utils/converters.js';
import { checkAccess, initializeSidebar, incrementStat } from './utils/adminManager.js';

// Access guard
if (checkAccess('code-formatter')) {
  initializeSidebar('nav-code');
}

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

function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  if (!text) {
    showToast('Nothing to copy', 'danger');
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => showToast(successMsg, 'success'))
    .catch(() => showToast('Failed to copy', 'danger'));
}

// ==========================================
// CODE FORMATTER LOGIC
// ==========================================
let activeCodeLang = 'html';

const codeInput = document.getElementById('code-input');
const codeOutput = document.getElementById('code-output');
const btnFormatCode = document.getElementById('btn-format-code');
const btnMinifyCode = document.getElementById('btn-minify-code');
const codeActionBtns = document.querySelectorAll('.action-bar button');

document.addEventListener('DOMContentLoaded', () => {
  codeActionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      codeActionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCodeLang = btn.getAttribute('data-lang');
    });
  });

  document.getElementById('btn-clear-code-input').addEventListener('click', () => {
    codeInput.value = '';
    codeOutput.value = '';
    showToast('Input code cleared', 'info');
  });

  document.getElementById('btn-copy-code-output').addEventListener('click', () => {
    copyToClipboard(codeOutput.value, 'Code copied to clipboard!');
  });

  btnFormatCode.addEventListener('click', () => {
    const val = codeInput.value.trim();
    if (!val) {
      showToast('Please enter some code to format', 'danger');
      return;
    }
    
    try {
      let result = '';
      if (activeCodeLang === 'html') {
        result = converters.formatHtmlCode(val);
      } else if (activeCodeLang === 'css') {
        result = converters.formatCssCode(val);
      } else if (activeCodeLang === 'js') {
        result = converters.formatJsCode(val);
      }
      codeOutput.value = result;
      incrementStat('code-formatter');
      showToast('Code beautification completed', 'success');
    } catch (error) {
      codeOutput.value = `Formatter Error: ${error.message}`;
    }
  });

  btnMinifyCode.addEventListener('click', () => {
    const val = codeInput.value.trim();
    if (!val) {
      showToast('Please enter some code to minify', 'danger');
      return;
    }
    
    try {
      let result = '';
      if (activeCodeLang === 'html') {
        result = converters.minifyHtmlCode(val);
      } else if (activeCodeLang === 'css') {
        result = converters.minifyCssCode(val);
      } else if (activeCodeLang === 'js') {
        result = converters.minifyJsCode(val);
      }
      codeOutput.value = result;
      incrementStat('code-formatter');
      showToast('Code minification completed', 'success');
    } catch (error) {
      codeOutput.value = `Minification Error: ${error.message}`;
    }
  });
});
