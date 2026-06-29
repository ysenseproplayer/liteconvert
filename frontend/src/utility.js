import * as converters from './utils/converters.js';
import { checkAccess, initializeSidebar, incrementStat } from './utils/adminManager.js';

// Access guard
if (checkAccess('utility-tools')) {
  initializeSidebar('nav-utility');
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
// UTILITY TOOLS LOGIC
// ==========================================
let activeUtilMode = 'base64';

const base64Input = document.getElementById('base64-input');
const base64Output = document.getElementById('base64-output');
const btnBase64Encode = document.getElementById('btn-base64-encode');
const btnBase64Decode = document.getElementById('btn-base64-decode');

const caseInput = document.getElementById('case-input');
const caseOutput = document.getElementById('case-output');
const caseButtons = document.querySelectorAll('.case-buttons button');

const utilActionBtns = document.querySelectorAll('.action-bar button');
const subSectionBase64 = document.getElementById('util-base64-container');
const subSectionCase = document.getElementById('util-case-container');

document.addEventListener('DOMContentLoaded', () => {
  utilActionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      utilActionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      activeUtilMode = btn.getAttribute('data-util-mode');
      if (activeUtilMode === 'base64') {
        subSectionBase64.classList.remove('hidden');
        subSectionCase.classList.add('hidden');
      } else {
        subSectionBase64.classList.add('hidden');
        subSectionCase.classList.remove('hidden');
      }
    });
  });

  // Base64 Codecs
  document.getElementById('btn-clear-base64-input').addEventListener('click', () => {
    base64Input.value = '';
    base64Output.value = '';
    showToast('Input cleared', 'info');
  });

  document.getElementById('btn-copy-base64-output').addEventListener('click', () => {
    copyToClipboard(base64Output.value, 'Copied Base64 results!');
  });

  btnBase64Encode.addEventListener('click', () => {
    const val = base64Input.value;
    if (!val) {
      showToast('Input text empty', 'danger');
      return;
    }
    try {
      base64Output.value = converters.base64Encode(val);
      incrementStat('utility-tools');
      showToast('Text successfully encoded to Base64', 'success');
    } catch (error) {
      base64Output.value = `Encoding Error: ${error.message}`;
    }
  });

  btnBase64Decode.addEventListener('click', () => {
    const val = base64Input.value.trim();
    if (!val) {
      showToast('Input base64 string empty', 'danger');
      return;
    }
    try {
      base64Output.value = converters.base64Decode(val);
      incrementStat('utility-tools');
      showToast('Base64 successfully decoded to string', 'success');
    } catch (error) {
      base64Output.value = `Decoding Error: ${error.message}`;
    }
  });

  // Case Changer Codecs
  document.getElementById('btn-clear-case-input').addEventListener('click', () => {
    caseInput.value = '';
    caseOutput.value = '';
    showToast('Text cleared', 'info');
  });

  document.getElementById('btn-copy-case-output').addEventListener('click', () => {
    copyToClipboard(caseOutput.value, 'Transformed text copied!');
  });

  caseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-case');
      const val = caseInput.value.trim();
      if (!val) {
        showToast('Please type some text first', 'danger');
        return;
      }
      
      try {
        caseOutput.value = converters.changeTextCase(val, type);
        incrementStat('utility-tools');
        showToast(`Transformed case to ${type}`, 'success');
      } catch (error) {
        caseOutput.value = `Error: ${error.message}`;
      }
    });
  });
});
