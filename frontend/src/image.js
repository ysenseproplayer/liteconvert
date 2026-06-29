import * as converters from './utils/converters.js';
import { checkAccess, initializeSidebar, incrementStat, getConfig } from './utils/adminManager.js';

// Access guard & sidebar init
if (checkAccess('image-converter')) {
  initializeSidebar('nav-image');
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

function downloadFile(content, filename, contentType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==========================================
// IMAGE CONVERTER LOGIC
// ==========================================
let activeImageFile = null;
let originalImageDims = { width: 0, height: 0 };

document.addEventListener('DOMContentLoaded', () => {
  // Access configuration settings
  const config = getConfig();
  const maxImgSizeMb = config.settings.maxImageSize || 15;
  const defaultFormat = config.settings.defaultImgFormat || 'image/png';
  const defaultQuality = config.settings.defaultImgQuality || 92;

  const imageDropZone = document.getElementById('image-drop-zone');
  const imageFileInput = document.getElementById('image-file-input');
  const imgPreviewContainer = document.getElementById('img-preview-container');
  const imgPreview = document.getElementById('img-preview');
  const btnRemoveImage = document.getElementById('btn-remove-image');
  const btnConvertImage = document.getElementById('btn-convert-image');

  const imgMetaFormat = document.getElementById('img-meta-format');
  const imgMetaSize = document.getElementById('img-meta-size');
  const imgMetaDims = document.getElementById('img-meta-dims');

  const imgWidthInput = document.getElementById('img-width');
  const imgHeightInput = document.getElementById('img-height');
  const imgAspectRatio = document.getElementById('img-aspect-ratio');
  const imgTargetFormat = document.getElementById('img-target-format');
  const imgQuality = document.getElementById('img-quality');
  const qualityValueDisplay = document.getElementById('quality-value');
  const qualitySliderContainer = document.getElementById('quality-slider-container');

  // Load custom configurations into forms
  imgTargetFormat.value = defaultFormat;
  imgQuality.value = defaultQuality;
  qualityValueDisplay.textContent = `${defaultQuality}%`;
  
  if (defaultFormat === 'image/png') {
    qualitySliderContainer.classList.add('hidden');
  } else {
    qualitySliderContainer.classList.remove('hidden');
  }

  // Upload/Drop zones
  imageDropZone.addEventListener('click', () => imageFileInput.click());
  imageDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropZone.classList.add('dragover');
  });
  imageDropZone.addEventListener('dragleave', () => imageDropZone.classList.remove('dragover'));
  imageDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleSelectedImage(e.dataTransfer.files[0]);
    }
  });
  imageFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedImage(e.target.files[0]);
    }
  });

  btnRemoveImage.addEventListener('click', () => {
    activeImageFile = null;
    imgPreview.src = '';
    imgPreviewContainer.classList.add('hidden');
    imageDropZone.classList.remove('hidden');
    btnConvertImage.disabled = true;
    imgWidthInput.value = '';
    imgHeightInput.value = '';
    imageFileInput.value = '';
  });

  imgTargetFormat.addEventListener('change', () => {
    if (imgTargetFormat.value === 'image/png') {
      qualitySliderContainer.classList.add('hidden');
    } else {
      qualitySliderContainer.classList.remove('hidden');
    }
  });

  imgQuality.addEventListener('input', () => {
    qualityValueDisplay.textContent = `${imgQuality.value}%`;
  });

  imgWidthInput.addEventListener('input', () => {
    if (imgAspectRatio.checked && originalImageDims.width > 0 && imgWidthInput.value) {
      const ratio = originalImageDims.height / originalImageDims.width;
      imgHeightInput.value = Math.round(parseInt(imgWidthInput.value) * ratio);
    }
  });
  imgHeightInput.addEventListener('input', () => {
    if (imgAspectRatio.checked && originalImageDims.height > 0 && imgHeightInput.value) {
      const ratio = originalImageDims.width / originalImageDims.height;
      imgWidthInput.value = Math.round(parseInt(imgHeightInput.value) * ratio);
    }
  });

  function handleSelectedImage(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Invalid file. Please upload an image.', 'danger');
      return;
    }

    // Apply Admin Limit Validation
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > maxImgSizeMb) {
      showToast(`Upload failed. File size exceeds administrator limits of ${maxImgSizeMb}MB.`, 'danger');
      return;
    }

    activeImageFile = file;

    const reader = new FileReader();
    reader.onload = function(e) {
      imgPreview.src = e.target.result;
      
      const tempImg = new Image();
      tempImg.onload = function() {
        originalImageDims.width = tempImg.width;
        originalImageDims.height = tempImg.height;
        
        imgMetaDims.textContent = `${tempImg.width} x ${tempImg.height} px`;
        imgWidthInput.value = tempImg.width;
        imgHeightInput.value = tempImg.height;
      };
      tempImg.src = e.target.result;

      imgMetaFormat.textContent = file.type.split('/')[1].toUpperCase();
      imgMetaSize.textContent = formatBytes(file.size);

      imageDropZone.classList.add('hidden');
      imgPreviewContainer.classList.remove('hidden');
      btnConvertImage.disabled = false;
      showToast('Image loaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  }

  btnConvertImage.addEventListener('click', async () => {
    if (!activeImageFile) return;

    const format = imgTargetFormat.value;
    const options = {
      width: imgWidthInput.value ? parseInt(imgWidthInput.value) : undefined,
      height: imgHeightInput.value ? parseInt(imgHeightInput.value) : undefined,
      quality: format !== 'image/png' ? parseInt(imgQuality.value) : undefined
    };

    btnConvertImage.disabled = true;
    btnConvertImage.querySelector('span').textContent = 'Converting...';

    try {
      const blob = await converters.convertImage(activeImageFile, format, options);
      const extension = format.split('/')[1] === 'jpeg' ? 'jpg' : format.split('/')[1];
      const nameWithoutExt = activeImageFile.name.substring(0, activeImageFile.name.lastIndexOf('.')) || activeImageFile.name;
      const downloadName = `${nameWithoutExt}_converted.${extension}`;
      
      downloadFile(blob, downloadName, format);
      incrementStat('image-converter');
      showToast('Conversion complete! File downloading...', 'success');
    } catch (error) {
      showToast(`Error: ${error.message}`, 'danger');
    } finally {
      btnConvertImage.disabled = false;
      btnConvertImage.querySelector('span').textContent = 'Convert & Download';
    }
  });
});
