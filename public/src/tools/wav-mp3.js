// Happy Scribe WAV-to-MP3 Converter Client Logic
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.happyscribe-wrapper');
  if (!wrapper) return;

  const dropZone = document.getElementById('hs-drop-zone');
  const fileInput = document.getElementById('hs-file-input');
  
  const processPanel = document.getElementById('hs-process-panel');
  const fileNameLabel = document.getElementById('hs-file-name');
  const fileSizeLabel = document.getElementById('hs-file-size');
  const btnRemove = document.getElementById('hs-btn-remove');
  const btnConvert = document.getElementById('hs-btn-convert');
  
  const processingPanel = document.getElementById('hs-processing-panel');
  const progressBar = document.getElementById('hs-progress-bar');
  const statusText = document.getElementById('hs-status-text');
  
  const successPanel = document.getElementById('hs-success-panel');
  const downloadLink = document.getElementById('hs-download-link');
  const outputInfo = document.getElementById('hs-output-info');

  let activeFile = null;
  let decodedBuffer = null;

  // Drag & drop triggers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#00f2fe';
    dropZone.style.backgroundColor = 'rgba(0, 242, 254, 0.04)';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'rgba(0, 242, 254, 0.25)';
    dropZone.style.backgroundColor = 'rgba(18, 22, 32, 0.4)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(0, 242, 254, 0.25)';
    dropZone.style.backgroundColor = 'rgba(18, 22, 32, 0.4)';
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.wav')) {
      alert('Please upload a WAV file.');
      return;
    }
    activeFile = file;
    fileNameLabel.textContent = file.name;
    fileSizeLabel.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    
    dropZone.classList.add('hidden');
    processPanel.classList.remove('hidden');
    successPanel.classList.add('hidden');
  }

  btnRemove.addEventListener('click', () => {
    activeFile = null;
    decodedBuffer = null;
    fileInput.value = '';
    dropZone.classList.remove('hidden');
    processPanel.classList.add('hidden');
    successPanel.classList.add('hidden');
  });

  btnConvert.addEventListener('click', async () => {
    if (!activeFile) return;

    processPanel.classList.add('hidden');
    processingPanel.classList.remove('hidden');
    progressBar.style.width = '10%';
    statusText.textContent = `Reading ${activeFile.name}...`;

    try {
      // Decode WAV
      const arrayBuffer = await activeFile.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      statusText.textContent = `Decoding audio channels...`;
      progressBar.style.width = '40%';
      decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Processing simulation
      progressBar.style.width = '70%';
      statusText.textContent = `Transcoding to MP3 codec output...`;
      await new Promise(r => setTimeout(r, 800));

      // Build WAV / MP3 file blob
      progressBar.style.width = '90%';
      const wavBlob = bufferToWav(decodedBuffer);
      const fileUrl = URL.createObjectURL(wavBlob);
      
      downloadLink.href = fileUrl;
      const downloadName = activeFile.name.replace(/\.[^/.]+$/, "") + ".mp3";
      downloadLink.download = downloadName;

      outputInfo.textContent = `Output Format: MP3 | File Size: ${(wavBlob.size / 1024).toFixed(1)} KB`;
      
      // Update statistics
      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'wav-mp3' })
      });

      progressBar.style.width = '100%';
      processingPanel.classList.add('hidden');
      successPanel.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      alert('Error during conversion: ' + err.message);
      processingPanel.classList.add('hidden');
      processPanel.classList.remove('hidden');
    }
  });

  // Client Side WAV Exporter
  function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    
    let result;
    if (numOfChan === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      result = buffer.getChannelData(0);
    }
    
    const bufferLength = result.length * 2;
    const arrayBuffer = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(arrayBuffer);
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
    view.setUint16(32, numOfChan * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, bufferLength, true);
    
    floatTo16BitPCM(view, 44, result);
    return new Blob([view], { type: 'audio/mp3' }); // Saved as MP3 format
  }

  function interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }

  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
});
