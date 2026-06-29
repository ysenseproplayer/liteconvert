import * as converters from './utils/converters.js';
import { checkAccess, initializeSidebar, incrementStat } from './utils/adminManager.js';

// Access guard
if (checkAccess('document-compiler')) {
  initializeSidebar('nav-document');
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
  const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ==========================================
// DOCUMENT COMPILER LOGIC
// ==========================================
let docSubMode = 'md-html'; 
let mdToHtmlDirection = true; 

document.addEventListener('DOMContentLoaded', () => {
  const docActionBtns = document.querySelectorAll('.action-bar button');
  const subSectionMdHtml = document.getElementById('doc-md-html-container');
  const subSectionTxtPdf = document.getElementById('doc-txt-pdf-container');

  docActionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      docActionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      docSubMode = btn.getAttribute('data-doc-mode');
      if (docSubMode === 'md-html') {
        subSectionMdHtml.classList.remove('hidden');
        subSectionTxtPdf.classList.add('hidden');
      } else {
        subSectionMdHtml.classList.add('hidden');
        subSectionTxtPdf.classList.remove('hidden');
      }
    });
  });

  const btnToggleDirection = document.getElementById('btn-toggle-direction');
  const direction1 = document.getElementById('direction-state-1');
  const direction2 = document.getElementById('direction-state-2');
  const docInputLabel = document.getElementById('doc-input-label');
  const docOutputLabel = document.getElementById('doc-output-label');
  const docInput = document.getElementById('doc-input');
  const docOutput = document.getElementById('doc-output');
  const docPreview = document.getElementById('doc-preview');
  const btnTogglePreview = document.getElementById('btn-toggle-preview');

  btnToggleDirection.addEventListener('click', () => {
    mdToHtmlDirection = !mdToHtmlDirection;
    
    if (mdToHtmlDirection) {
      direction1.classList.add('active');
      direction2.classList.remove('active');
      docInputLabel.textContent = 'Markdown Input';
      docOutputLabel.textContent = 'HTML Output';
    } else {
      direction1.classList.remove('active');
      direction2.classList.add('active');
      docInputLabel.textContent = 'HTML Input';
      docOutputLabel.textContent = 'Markdown Output';
    }
    
    const temp = docInput.value;
    docInput.value = docOutput.value;
    docOutput.value = temp;
    
    triggerDocConversion();
  });

  docInput.addEventListener('input', triggerDocConversion);

  function triggerDocConversion() {
    const value = docInput.value.trim();
    if (!value) {
      docOutput.value = '';
      docPreview.innerHTML = '';
      return;
    }
    
    try {
      if (mdToHtmlDirection) {
        const html = converters.markdownToHtml(value);
        docOutput.value = html;
        docPreview.innerHTML = html;
      } else {
        const md = converters.htmlToMarkdown(value);
        docOutput.value = md;
        docPreview.innerHTML = ''; 
      }
      debouncedStatIncrement('document-compiler');
    } catch (error) {
      docOutput.value = `Error: ${error.message}`;
    }
  }

  let showPreviewMode = false;
  btnTogglePreview.addEventListener('click', () => {
    showPreviewMode = !showPreviewMode;
    
    if (showPreviewMode) {
      docPreview.classList.remove('hidden');
      docOutput.classList.add('hidden');
      btnTogglePreview.textContent = 'Show HTML Code';
    } else {
      docPreview.classList.add('hidden');
      docOutput.classList.remove('hidden');
      btnTogglePreview.textContent = 'Show Live Preview';
    }
  });

  document.getElementById('btn-clear-doc-input').addEventListener('click', () => {
    docInput.value = '';
    docOutput.value = '';
    docPreview.innerHTML = '';
    showToast('Input cleared', 'info');
  });

  document.getElementById('btn-copy-doc-output').addEventListener('click', () => {
    copyToClipboard(docOutput.value, 'Code copied to clipboard!');
  });

  // TXT to PDF
  const pdfTextInput = document.getElementById('pdf-text-input');
  const pdfFilename = document.getElementById('pdf-filename');
  const btnCompilePdf = document.getElementById('btn-compile-pdf');
  const btnLoadPdfTxt = document.getElementById('btn-load-pdf-txt');
  const pdfTxtFileInput = document.getElementById('pdf-txt-file-input');

  document.getElementById('btn-clear-pdf-input').addEventListener('click', () => {
    pdfTextInput.value = '';
    showToast('Text area cleared', 'info');
  });

  btnLoadPdfTxt.addEventListener('click', () => pdfTxtFileInput.click());
  pdfTxtFileInput.addEventListener('change', (e) => {
    if (e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = (event) => {
      pdfTextInput.value = event.target.result;
      showToast(`Loaded ${file.name}`, 'success');
    };
    reader.readAsText(file);
  });

  btnCompilePdf.addEventListener('click', () => {
    const text = pdfTextInput.value.trim();
    if (!text) {
      showToast('Enter some text to compile', 'danger');
      return;
    }
    
    let name = pdfFilename.value.trim();
    if (!name.endsWith('.pdf')) {
      name = `${name || 'document'}.pdf`;
    }
    
    btnCompilePdf.disabled = true;
    btnCompilePdf.querySelector('span').textContent = 'Compiling...';
    
    try {
      const pdfBlob = converters.txtToPdf(text);
      downloadFile(pdfBlob, name, 'application/pdf');
      incrementStat('document-compiler');
      showToast('PDF compiled successfully!', 'success');
    } catch (error) {
      showToast(`Compilation failed: ${error.message}`, 'danger');
    } finally {
      btnCompilePdf.disabled = false;
      btnCompilePdf.querySelector('span').textContent = 'Compile PDF';
    }
  });

  let statsTimeout = null;
  function debouncedStatIncrement(key) {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(() => {
      incrementStat(key);
    }, 2000);
  }
});
