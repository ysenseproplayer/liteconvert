// Multi-Track Audio Mixer client logic using Web Audio API
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="multi-track-mixer"]');
  if (!workbench) return;

  const drop1 = document.getElementById('mx-drop-1');
  const input1 = document.getElementById('mx-input-1');
  const info1 = document.getElementById('mx-info-1');
  const volWrap1 = document.getElementById('mx-vol-wrap-1');
  const sliderVol1 = document.getElementById('mx-vol-1');
  const labelVol1 = document.getElementById('mx-val-1');

  const drop2 = document.getElementById('mx-drop-2');
  const input2 = document.getElementById('mx-input-2');
  const info2 = document.getElementById('mx-info-2');
  const volWrap2 = document.getElementById('mx-vol-wrap-2');
  const sliderVol2 = document.getElementById('mx-vol-2');
  const labelVol2 = document.getElementById('mx-val-2');

  const btnMix = document.getElementById('mx-btn-mix');
  const processingCard = document.getElementById('mx-processing-card');
  const statusEl = document.getElementById('mx-status');
  const progressBar = document.getElementById('mx-progress');
  const resultCard = document.getElementById('mx-result-card');
  const outputInfo = document.getElementById('mx-output-info');
  const previewPlayer = document.getElementById('mx-preview-player');
  const downloadLink = document.getElementById('mx-download-link');

  let trackBuffer1 = null;
  let trackBuffer2 = null;

  setupDrop(drop1, input1, async (file) => {
    info1.textContent = 'Decoding track 1...';
    info1.classList.remove('hidden');
    try {
      trackBuffer1 = await decodeFile(file);
      info1.textContent = `✓ ${file.name} (${trackBuffer1.duration.toFixed(1)}s)`;
      volWrap1.classList.remove('hidden');
      checkReady();
    } catch (err) {
      info1.textContent = 'Error decoding: ' + err.message;
      trackBuffer1 = null;
      checkReady();
    }
  });

  setupDrop(drop2, input2, async (file) => {
    info2.textContent = 'Decoding track 2...';
    info2.classList.remove('hidden');
    try {
      trackBuffer2 = await decodeFile(file);
      info2.textContent = `✓ ${file.name} (${trackBuffer2.duration.toFixed(1)}s)`;
      volWrap2.classList.remove('hidden');
      checkReady();
    } catch (err) {
      info2.textContent = 'Error decoding: ' + err.message;
      trackBuffer2 = null;
      checkReady();
    }
  });

  function setupDrop(zone, input, onFile) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--accent-primary)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.style.borderColor = ''; if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', (e) => { if (e.target.files[0]) onFile(e.target.files[0]); });
    zone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
  }

  // Volume slider labels
  sliderVol1.addEventListener('input', () => labelVol1.textContent = sliderVol1.value + '%');
  sliderVol2.addEventListener('input', () => labelVol2.textContent = sliderVol2.value + '%');

  function checkReady() {
    btnMix.disabled = !(trackBuffer1 && trackBuffer2);
  }

  async function decodeFile(file) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  }

  btnMix.addEventListener('click', async () => {
    if (!trackBuffer1 || !trackBuffer2) return;
    
    btnMix.disabled = true;
    processingCard.classList.remove('hidden');
    resultCard.classList.add('hidden');
    
    progressBar.style.width = '20%';
    statusEl.textContent = 'Compiling audio timeline...';

    try {
      const sampleRate = Math.max(trackBuffer1.sampleRate, trackBuffer2.sampleRate);
      const duration = Math.max(trackBuffer1.duration, trackBuffer2.duration);
      const channels = Math.max(trackBuffer1.numberOfChannels, trackBuffer2.numberOfChannels);

      const offlineCtx = new OfflineAudioContext(
        channels,
        Math.floor(sampleRate * duration),
        sampleRate
      );

      // Track 1
      const source1 = offlineCtx.createBufferSource();
      source1.buffer = trackBuffer1;
      const gain1 = offlineCtx.createGain();
      gain1.gain.setValueAtTime(parseFloat(sliderVol1.value) / 100, 0);
      source1.connect(gain1);
      gain1.connect(offlineCtx.destination);

      // Track 2
      const source2 = offlineCtx.createBufferSource();
      source2.buffer = trackBuffer2;
      const gain2 = offlineCtx.createGain();
      gain2.gain.setValueAtTime(parseFloat(sliderVol2.value) / 100, 0);
      source2.connect(gain2);
      gain2.connect(offlineCtx.destination);

      progressBar.style.width = '50%';
      statusEl.textContent = 'Mixing track channels...';

      source1.start(0);
      source2.start(0);

      const mixedBuffer = await offlineCtx.startRendering();
      progressBar.style.width = '85%';
      statusEl.textContent = 'Encoding mixed track to WAV...';

      const wavBlob = bufferToWav(mixedBuffer);
      const url = URL.createObjectURL(wavBlob);

      progressBar.style.width = '100%';
      await new Promise(r => setTimeout(r, 200));

      downloadLink.href = url;
      downloadLink.download = 'mixed_master.wav';
      previewPlayer.src = url;

      outputInfo.textContent = `File Size: ${(wavBlob.size/1024/1024).toFixed(2)} MB | Duration: ${mixedBuffer.duration.toFixed(1)}s`;

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'multi-track-mixer' })
      });

      processingCard.classList.add('hidden');
      resultCard.classList.remove('hidden');
      btnMix.disabled = false;

    } catch (err) {
      console.error(err);
      processingCard.classList.add('hidden');
      btnMix.disabled = false;
      alert('Error mixing tracks: ' + err.message);
    }
  });

  // WAV Exporter helper
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
    return new Blob([view], { type: 'audio/wav' });
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
})();
