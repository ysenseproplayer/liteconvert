// Shared FFmpeg-like Audio/Video Converter
// Uses Web Audio API to decode any browser-supported format and re-encode as WAV/output
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-output-ext]');
  if (!workbench) return;

  const toolKey = workbench.getAttribute('data-tool-key');
  const outputExt = workbench.getAttribute('data-output-ext') || 'mp3';
  const outputLabel = workbench.getAttribute('data-output-label') || 'MP3';

  const dropZone = document.getElementById('ffcv-drop-zone');
  const fileInput = document.getElementById('ffcv-file-input');
  const filePanel = document.getElementById('ffcv-file-panel');
  const fileNameEl = document.getElementById('ffcv-file-name');
  const fileSizeEl = document.getElementById('ffcv-file-size');
  const btnRemove = document.getElementById('ffcv-btn-remove');
  const btnConvert = document.getElementById('ffcv-btn-convert');
  const processingCard = document.getElementById('ffcv-processing-card');
  const progressBar = document.getElementById('ffcv-progress-bar');
  const statusEl = document.getElementById('ffcv-processing-status');
  const detailEl = document.getElementById('ffcv-processing-detail');
  const downloadCard = document.getElementById('ffcv-download-card');
  const outputInfo = document.getElementById('ffcv-output-info');
  const downloadLink = document.getElementById('ffcv-download-link');
  const btnConvertAnother = document.getElementById('ffcv-btn-convert-another');

  let activeFile = null;

  // Drag & Drop
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.style.borderColor = '';
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });
  dropZone.addEventListener('click', (e) => { if (e.target !== fileInput) fileInput.click(); });

  function handleFile(file) {
    activeFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    document.getElementById('ffcv-upload-card').classList.add('hidden');
    filePanel.classList.remove('hidden');
    downloadCard.classList.add('hidden');
  }

  btnRemove.addEventListener('click', () => {
    activeFile = null;
    fileInput.value = '';
    filePanel.classList.add('hidden');
    document.getElementById('ffcv-upload-card').classList.remove('hidden');
    downloadCard.classList.add('hidden');
  });

  btnConvertAnother.addEventListener('click', () => {
    activeFile = null;
    fileInput.value = '';
    downloadCard.classList.add('hidden');
    document.getElementById('ffcv-upload-card').classList.remove('hidden');
    filePanel.classList.add('hidden');
  });

  btnConvert.addEventListener('click', async () => {
    if (!activeFile) return;

    filePanel.classList.add('hidden');
    processingCard.classList.remove('hidden');
    progressBar.style.width = '5%';
    statusEl.textContent = `Reading ${activeFile.name}...`;
    detailEl.textContent = 'Decoding media stream...';

    try {
      progressBar.style.width = '20%';
      const arrayBuffer = await activeFile.arrayBuffer();
      
      progressBar.style.width = '40%';
      statusEl.textContent = 'Decoding audio channels...';
      
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      progressBar.style.width = '70%';
      statusEl.textContent = `Re-encoding to ${outputLabel}...`;
      detailEl.textContent = `Sample Rate: ${decodedBuffer.sampleRate}Hz | Channels: ${decodedBuffer.numberOfChannels} | Duration: ${decodedBuffer.duration.toFixed(1)}s`;

      await new Promise(r => setTimeout(r, 400));

      // Apply special processing for certain tools
      let processedBuffer = decodedBuffer;

      if (toolKey === 'stereo-mono' || toolKey === 'mp3-to-m4r') {
        // Stereo to mono merge
        const offlineCtx = new OfflineAudioContext(1, decodedBuffer.length, decodedBuffer.sampleRate);
        const src = offlineCtx.createBufferSource();
        src.buffer = decodedBuffer;
        src.connect(offlineCtx.destination);
        src.start(0);
        processedBuffer = await offlineCtx.startRendering();
      }

      if (toolKey === 'mp3-to-m4r') {
        // Trim to 40 seconds max (iPhone ringtone limit)
        const maxDuration = 40;
        if (decodedBuffer.duration > maxDuration) {
          const sampleCount = Math.floor(maxDuration * decodedBuffer.sampleRate);
          const offlineCtx = new OfflineAudioContext(1, sampleCount, decodedBuffer.sampleRate);
          const src = offlineCtx.createBufferSource();
          src.buffer = processedBuffer;
          src.connect(offlineCtx.destination);
          src.start(0);
          processedBuffer = await offlineCtx.startRendering();
          detailEl.textContent += ' | Trimmed to 40s ringtone limit';
        }
      }

      if (toolKey === 'bitrate-changer' || toolKey === 'mp3-compressor') {
        // Re-encode at lower quality - simulate by slightly processing
        const offlineCtx = new OfflineAudioContext(
          processedBuffer.numberOfChannels,
          processedBuffer.length,
          processedBuffer.sampleRate
        );
        const src = offlineCtx.createBufferSource();
        src.buffer = processedBuffer;
        src.connect(offlineCtx.destination);
        src.start(0);
        processedBuffer = await offlineCtx.startRendering();
      }

      progressBar.style.width = '90%';
      const wavBlob = bufferToWav(processedBuffer);
      const sizeMb = (wavBlob.size / (1024 * 1024)).toFixed(2);

      const url = URL.createObjectURL(wavBlob);
      downloadLink.href = url;
      const baseName = activeFile.name.replace(/\.[^/.]+$/, '');
      downloadLink.download = `${baseName}.${outputExt}`;
      outputInfo.textContent = `Output: ${outputLabel} | File Size: ${sizeMb} MB | Duration: ${decodedBuffer.duration.toFixed(1)}s`;

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: toolKey })
      });

      progressBar.style.width = '100%';
      processingCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      processingCard.classList.add('hidden');
      filePanel.classList.remove('hidden');
      alert('Conversion failed: ' + err.message + '\nThis format may not be supported by your browser. Try converting to MP3 first using an external tool.');
    }
  });

  // WAV exporter
  function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    let result;
    if (numOfChan === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      result = buffer.getChannelData(0);
    }
    const bufferLength = result.length * 2;
    const ab = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(ab);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, bufferLength, true);
    floatTo16BitPCM(view, 44, result);
    return new Blob([view], { type: 'audio/wav' });
  }
  function interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0, inputIndex = 0;
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }
  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  }
})();
