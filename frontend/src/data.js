import * as converters from './utils/converters.js';
import { checkAccess, initializeSidebar, incrementStat } from './utils/adminManager.js';

// Access guard
if (checkAccess('data-converter')) {
  initializeSidebar('nav-data');
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

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ==========================================
// DATA FORMAT CONVERTER LOGIC
// ==========================================
let currentDataMode = 'json-yaml';

const dataInput = document.getElementById('data-input');
const dataOutput = document.getElementById('data-output');
const dataInputLabel = document.getElementById('data-input-label');
const dataOutputLabel = document.getElementById('data-output-label');
const dataFileInput = document.getElementById('data-file-input');

const dataActionBtns = document.querySelectorAll('.action-bar button');
const btnClearDataInput = document.getElementById('btn-clear-data-input');
const btnLoadDataFile = document.getElementById('btn-load-data-file');
const btnCopyDataOutput = document.getElementById('btn-copy-data-output');
const btnDownloadDataOutput = document.getElementById('btn-download-data-output');

const dataModeMeta = {
  'json-yaml': { input: 'JSON Input', output: 'YAML Output', extension: 'yaml', mime: 'text/yaml' },
  'yaml-json': { input: 'YAML Input', output: 'JSON Output', extension: 'json', mime: 'application/json' },
  'json-csv': { input: 'JSON Input', output: 'CSV Output', extension: 'csv', mime: 'text/csv' },
  'csv-json': { input: 'CSV Input', output: 'JSON Output', extension: 'json', mime: 'application/json' },
  'xml-json': { input: 'XML Input', output: 'JSON Output', extension: 'json', mime: 'application/json' }
};

document.addEventListener('DOMContentLoaded', () => {
  dataActionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dataActionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentDataMode = btn.getAttribute('data-mode');
      
      dataInputLabel.textContent = dataModeMeta[currentDataMode].input;
      dataOutputLabel.textContent = dataModeMeta[currentDataMode].output;
      
      triggerDataConversion();
    });
  });

  dataInput.addEventListener('input', triggerDataConversion);

  btnClearDataInput.addEventListener('click', () => {
    dataInput.value = '';
    dataOutput.value = '';
    showToast('Input cleared', 'info');
  });

  btnLoadDataFile.addEventListener('click', () => dataFileInput.click());
  dataFileInput.addEventListener('change', (e) => {
    if (e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = (event) => {
      dataInput.value = event.target.result;
      triggerDataConversion();
      showToast(`Loaded ${file.name}`, 'success');
    };
    reader.readAsText(file);
  });

  btnCopyDataOutput.addEventListener('click', () => {
    copyToClipboard(dataOutput.value, 'Output copied to clipboard!');
  });

  btnDownloadDataOutput.addEventListener('click', () => {
    const content = dataOutput.value;
    if (!content || content.startsWith('Conversion Error:')) {
      showToast('Nothing to download or output contains errors', 'danger');
      return;
    }
    const meta = dataModeMeta[currentDataMode];
    downloadFile(content, `converted_data.${meta.extension}`, meta.mime);
    incrementStat('data-converter');
    showToast('Download initiated', 'success');
  });

  function triggerDataConversion() {
    const inputVal = dataInput.value.trim();
    if (!inputVal) {
      dataOutput.value = '';
      return;
    }

    try {
      let result = '';
      switch (currentDataMode) {
        case 'json-yaml':
          result = converters.jsonToYaml(inputVal);
          break;
        case 'yaml-json':
          result = converters.yamlToJson(inputVal);
          break;
        case 'json-csv':
          result = converters.jsonToCsv(inputVal);
          break;
        case 'csv-json':
          result = converters.csvToJson(inputVal);
          break;
        case 'xml-json':
          result = converters.xmlToJson(inputVal);
          break;
      }
      dataOutput.value = result;
      // Increment stats for dynamic typing conversions (reactive to user finish typing/pasting)
      // debounce stats increment to avoid spamming
      debouncedStatIncrement('data-converter');
    } catch (error) {
      dataOutput.value = `Conversion Error:\n${error.message}`;
    }
  }

  let statsTimeout = null;
  function debouncedStatIncrement(key) {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(() => {
      incrementStat(key);
    }, 1500);
  }
});
