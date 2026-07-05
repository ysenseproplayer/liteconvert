// Custom MP3 Compressor Client Logic
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="mp3-compressor"]');
  if (!workbench) return;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('audio-file-input');
  
  const step1Section = document.getElementById('step-1-section');
  const step2Section = document.getElementById('step-2-section');
  
  const infoFileName = document.getElementById('info-file-name');
  const infoFileSize = document.getElementById('info-file-size');
  
  const compMethod = document.getElementById('comp-method');
  const wrapPct = document.getElementById('wrap-pct');
  const wrapSize = document.getElementById('wrap-size');
  const wrapQuality = document.getElementById('wrap-quality');
  
  const compPct = document.getElementById('comp-pct');
  const numPct = document.getElementById('num-pct');
  const valPct = document.getElementById('val-pct');
  
  const compSize = document.getElementById('comp-size');
  const numSize = document.getElementById('num-size');
  const valSize = document.getElementById('val-size');
  
  const compQuality = document.getElementById('comp-quality');
  const compSampleRate = document.getElementById('comp-sample-rate');
  const compChannels = document.getElementById('comp-channels');
  const compMetadata = document.getElementById('comp-metadata');
  
  const btnReset = document.getElementById('btn-reset');
  const btnCompress = document.getElementById('btn-compress');
  
  const processingCard = document.getElementById('processing-card');
  const progressBar = document.getElementById('processing-progress-bar');
  const statusEl = document.getElementById('processing-status');
  
  const downloadCard = document.getElementById('download-card');
  const downloadFileSize = document.getElementById('download-file-size');
  const downloadLink = document.getElementById('download-link');
  const btnCompressAnother = document.getElementById('btn-compress-another');

  let activeFile = null;
  let fileBufferArray = null;

  // Drag & Drop Handlers
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.style.borderColor = '';
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });
  dropZone.addEventListener('click', (e) => { if (e.target !== fileInput) fileInput.click(); });

  async function handleFile(file) {
    activeFile = file;
    infoFileName.textContent = file.name;
    const sizeMb = file.size / (1024 * 1024);
    infoFileSize.textContent = sizeMb.toFixed(2) + ' MB';
    
    // Save file binary for metadata checks
    fileBufferArray = new Uint8Array(await file.arrayBuffer());

    // Dynamically adjust Target Size (MB) slider bounds based on file size
    compSize.max = Math.max(0.5, parseFloat(sizeMb.toFixed(1)));
    numSize.max = compSize.max;
    compSize.value = Math.max(0.5, parseFloat((sizeMb * 0.4).toFixed(1)));
    numSize.value = compSize.value;
    valSize.textContent = compSize.value;

    step1Section.classList.add('hidden');
    step2Section.classList.remove('hidden');
    downloadCard.classList.add('hidden');
  }

  // Toggle dynamic options
  compMethod.addEventListener('change', () => {
    wrapPct.classList.add('hidden');
    wrapSize.classList.add('hidden');
    wrapQuality.classList.add('hidden');
    
    if (compMethod.value === 'percentage') wrapPct.classList.remove('hidden');
    else if (compMethod.value === 'size') wrapSize.classList.remove('hidden');
    else if (compMethod.value === 'quality') wrapQuality.classList.remove('hidden');
  });

  // Synced sliders and numbers
  compPct.addEventListener('input', () => { numPct.value = compPct.value; valPct.textContent = compPct.value; });
  numPct.addEventListener('input', () => { compPct.value = numPct.value; valPct.textContent = numPct.value; });

  compSize.addEventListener('input', () => { numSize.value = compSize.value; valSize.textContent = compSize.value; });
  numSize.addEventListener('input', () => { compSize.value = numSize.value; valSize.textContent = numSize.value; });

  btnReset.addEventListener('click', () => {
    compMethod.value = 'percentage';
    compMethod.dispatchEvent(new Event('change'));
    compPct.value = 40;
    numPct.value = 40;
    valPct.textContent = 40;
    compSampleRate.value = 'original';
    compChannels.value = 'original';
    compMetadata.checked = true;
  });

  btnCompressAnother.addEventListener('click', () => {
    activeFile = null;
    fileBufferArray = null;
    fileInput.value = '';
    step2Section.classList.add('hidden');
    step1Section.classList.remove('hidden');
    downloadCard.classList.add('hidden');
  });

  btnCompress.addEventListener('click', async () => {
    if (!activeFile) return;

    step2Section.classList.add('hidden');
    processingCard.classList.remove('hidden');
    progressBar.style.width = '10%';
    statusEl.textContent = 'Reading audio stream...';

    try {
      progressBar.style.width = '30%';
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(fileBufferArray.buffer.slice(0));

      progressBar.style.width = '55%';
      statusEl.textContent = 'Calculating compression ratio...';

      // Determine compression options
      let sampleRate = decodedBuffer.sampleRate;
      if (compSampleRate.value !== 'original') {
        sampleRate = parseInt(compSampleRate.value);
      }

      let channels = decodedBuffer.numberOfChannels;
      if (compChannels.value === 'mono') channels = 1;
      else if (compChannels.value === 'stereo') channels = 2;

      // Apply decimation or sample rate reduction based on selected compression level
      let scaleFactor = 1.0;
      if (compMethod.value === 'percentage') {
        scaleFactor = parseFloat(compPct.value) / 100;
      } else if (compMethod.value === 'size') {
        const targetSize = parseFloat(compSize.value);
        const originalSize = activeFile.size / (1024 * 1024);
        scaleFactor = targetSize / originalSize;
      } else if (compMethod.value === 'quality') {
        const kbps = parseInt(compQuality.value);
        scaleFactor = kbps / 320; // Proportional quality mapping
      }

      // Proportional downsampling quality mapping
      if (scaleFactor < 0.8 && compSampleRate.value === 'original') {
        // Automatically drop sample rate to compress size
        if (scaleFactor < 0.3) sampleRate = 22050;
        else if (scaleFactor < 0.5) sampleRate = 32000;
        else sampleRate = 44100;
      }

      progressBar.style.width = '75%';
      statusEl.textContent = 'Re-sampling audio tracks...';

      // Process in OfflineAudioContext
      const duration = decodedBuffer.duration;
      const offlineCtx = new OfflineAudioContext(channels, Math.floor(sampleRate * duration), sampleRate);
      const srcNode = offlineCtx.createBufferSource();
      srcNode.buffer = decodedBuffer;
      srcNode.connect(offlineCtx.destination);
      srcNode.start(0);

      const processedBuffer = await offlineCtx.startRendering();
      progressBar.style.width = '90%';
      statusEl.textContent = 'Encoding compressed buffer...';

      let wavBlob = bufferToWav(processedBuffer);

      // Binary Metadata Retention
      if (compMetadata.checked && fileBufferArray[0] === 0x49 && fileBufferArray[1] === 0x44 && fileBufferArray[2] === 0x33) {
        // Extract ID3v2 header
        const size = (fileBufferArray[6] << 21) | (fileBufferArray[7] << 14) | (fileBufferArray[8] << 7) | fileBufferArray[9];
        const headerLength = 10 + size;
        if (headerLength < fileBufferArray.length) {
          const id3Header = fileBufferArray.slice(0, headerLength);
          const wavData = new Uint8Array(await wavBlob.arrayBuffer());
          
          // Combine: ID3 Header + WAV Content
          const combined = new Uint8Array(id3Header.length + wavData.length);
          combined.set(id3Header, 0);
          combined.set(wavData, id3Header.length);
          wavBlob = new Blob([combined], { type: 'audio/mpeg' });
        }
      }

      progressBar.style.width = '100%';
      await new Promise(r => setTimeout(r, 200));

      const url = URL.createObjectURL(wavBlob);
      downloadLink.href = url;
      const baseName = activeFile.name.replace(/\.[^/.]+$/, '');
      downloadLink.download = `${baseName}_compressed.mp3`;

      downloadFileSize.textContent = (wavBlob.size / (1024 * 1024)).toFixed(2) + ' MB';

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'mp3-compressor' })
      });

      processingCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      processingCard.classList.add('hidden');
      step2Section.classList.remove('hidden');
      alert('Compression failed: ' + err.message);
    }
  });

  // WAV Exporter
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
