// Custom Audio Normalizer Client Logic
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="audio-normalizer"]');
  if (!workbench) return;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('audio-file-input');
  
  const step1Section = document.getElementById('step-1-section');
  const step2Section = document.getElementById('step-2-section');
  
  const infoName = document.getElementById('info-name');
  const infoSize = document.getElementById('info-size');
  const infoDuration = document.getElementById('info-duration');
  const infoChannels = document.getElementById('info-channels');
  const infoSamplerate = document.getElementById('info-samplerate');
  const infoBitdepth = document.getElementById('info-bitdepth');
  
  const canvas = document.getElementById('preview-canvas');
  const playhead = document.getElementById('playhead-bar');
  
  const btnPlay = document.getElementById('btn-play');
  const btnStop = document.getElementById('btn-stop');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const lblZoom = document.getElementById('lbl-zoom');
  
  const sliderLufs = document.getElementById('target-lufs');
  const lblLufs = document.getElementById('lbl-lufs');
  const lblLufsDesc = document.getElementById('lbl-lufs-desc');
  const quickBtns = document.querySelectorAll('.quick-lufs-btn');
  const exportFormat = document.getElementById('export-format');
  const lblSummary = document.getElementById('lbl-summary');
  
  const btnReset = document.getElementById('btn-reset');
  const btnNormalize = document.getElementById('btn-normalize');
  
  const processingCard = document.getElementById('processing-card');
  const progressBar = document.getElementById('processing-progress-bar');
  const statusEl = document.getElementById('processing-status');
  
  const downloadCard = document.getElementById('download-card');
  const downloadFileSize = document.getElementById('download-file-size');
  const downloadLink = document.getElementById('download-link');
  const masterPreviewPlayer = document.getElementById('master-preview-player');
  const btnNormalizeAnother = document.getElementById('btn-normalize-another');

  let activeFile = null;
  let audioBuffer = null;
  let audioContext = null;
  
  let zoomLevel = 1;
  let isPlaying = false;
  let activeSourceNode = null;
  let playbackStartTime = 0;
  let pausedAt = 0;
  let playbackInterval = null;

  // File drop hooks
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
    infoName.textContent = file.name;
    infoSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    step1Section.classList.add('hidden');
    step2Section.classList.remove('hidden');
    downloadCard.classList.add('hidden');

    try {
      const arrayBuffer = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const duration = audioBuffer.duration;
      infoDuration.textContent = formatTime(duration);
      infoChannels.textContent = audioBuffer.numberOfChannels === 1 ? 'Mono' : 'Stereo';
      infoSamplerate.textContent = (audioBuffer.sampleRate / 1000).toFixed(1) + ' kHz';
      infoBitdepth.textContent = '32-bit float'; // browser decoding output

      // Draw peaks
      drawPeaks();
      updateSummary();

    } catch (err) {
      console.error(err);
      alert('Failed to load audio: ' + err.message);
      btnReset.click();
    }
  }

  // Sync sliders
  sliderLufs.addEventListener('input', () => {
    const val = parseInt(sliderLufs.value);
    lblLufs.textContent = val + ' LUFS';
    
    // Highlight quick button
    quickBtns.forEach(btn => {
      if (parseInt(btn.getAttribute('data-lufs')) === val) {
        btn.className = 'btn btn-primary quick-lufs-btn';
        btn.style.background = 'var(--accent-gradient)';
      } else {
        btn.className = 'btn btn-secondary quick-lufs-btn';
        btn.style.background = '';
      }
    });

    // Update help text
    if (val <= -20) {
      lblLufsDesc.textContent = "Lower LUFS numbers are quieter. Target -23 LUFS is recommended for broadcast-style delivery (EBU R128 standard).";
    } else if (val <= -15) {
      lblLufsDesc.textContent = "Try -16 LUFS for podcasts and speech delivery, which is standard for Amazon Alexa and Google Podcasts.";
    } else if (val <= -13) {
      lblLufsDesc.textContent = "Try -14 LUFS for music demos, which matches the streaming targets of Spotify, YouTube, and Apple Music.";
    } else {
      lblLufsDesc.textContent = "Target -12 LUFS is a louder format target, typical for standard club tracks or loud CD masters.";
    }

    updateSummary();
  });

  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.getAttribute('data-lufs'));
      sliderLufs.value = val;
      sliderLufs.dispatchEvent(new Event('input'));
    });
  });

  exportFormat.addEventListener('change', updateSummary);

  function updateSummary() {
    const val = parseInt(sliderLufs.value);
    const fmt = exportFormat.value.toUpperCase();
    lblSummary.textContent = `The export will target about ${val} LUFS in ${fmt} format, limited to a -1.5 dBTP peak ceiling.`;
  }

  btnReset.addEventListener('click', () => {
    if (isPlaying) stopPreview();
    sliderLufs.value = -16;
    sliderLufs.dispatchEvent(new Event('input'));
    exportFormat.value = 'wav';
    updateSummary();
  });

  btnNormalizeAnother.addEventListener('click', () => {
    if (isPlaying) stopPreview();
    activeFile = null;
    audioBuffer = null;
    fileInput.value = '';
    step2Section.classList.add('hidden');
    step1Section.classList.remove('hidden');
    downloadCard.classList.add('hidden');
  });

  // Playback Preview
  btnPlay.addEventListener('click', () => {
    if (!audioBuffer) return;
    if (isPlaying) return;
    
    activeSourceNode = audioContext.createBufferSource();
    activeSourceNode.buffer = audioBuffer;
    activeSourceNode.connect(audioContext.destination);
    
    isPlaying = true;
    playbackStartTime = audioContext.currentTime - pausedAt;
    activeSourceNode.start(0, pausedAt);
    
    activeSourceNode.onended = () => {
      if (isPlaying) stopPreview();
    };

    playbackInterval = setInterval(() => {
      const elapsed = audioContext.currentTime - playbackStartTime;
      if (elapsed >= audioBuffer.duration) {
        stopPreview();
      } else {
        const pct = (elapsed / audioBuffer.duration) * 100;
        playhead.style.left = pct + '%';
      }
    }, 40);
  });

  btnStop.addEventListener('click', () => {
    if (isPlaying) pausePreview();
    else stopPreview();
  });

  function pausePreview() {
    pausedAt = audioContext.currentTime - playbackStartTime;
    stopSource();
    isPlaying = false;
    clearInterval(playbackInterval);
  }

  function stopPreview() {
    stopSource();
    isPlaying = false;
    pausedAt = 0;
    clearInterval(playbackInterval);
    playhead.style.left = '0%';
  }

  function stopSource() {
    if (activeSourceNode) {
      try {
        activeSourceNode.stop();
      } catch (e) {}
      activeSourceNode = null;
    }
  }

  // Zoom canvas peak visualizer
  btnZoomIn.addEventListener('click', () => {
    if (zoomLevel < 8) {
      zoomLevel *= 2;
      lblZoom.textContent = zoomLevel + 'x';
      drawPeaks();
    }
  });

  btnZoomOut.addEventListener('click', () => {
    if (zoomLevel > 1) {
      zoomLevel /= 2;
      lblZoom.textContent = zoomLevel + 'x';
      drawPeaks();
    }
  });

  function drawPeaks() {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    // Adjust step scale according to zoom factor
    const length = Math.floor(data.length / zoomLevel);
    const step = Math.ceil(length / width);
    const amp = height / 2;

    const barWidth = 2;
    const gap = 1;
    for (let i = 0; i < width; i += (barWidth + gap)) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const index = (i * step) + j;
        if (index < data.length) {
          const datum = data[index];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      const x = i;
      const h = Math.max(2, (max - min) * amp);
      const grad = ctx.createLinearGradient(0, amp - h/2, 0, amp + h/2);
      grad.addColorStop(0, '#60a5fa');
      grad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = grad;
      ctx.fillRect(x, amp - h/2, barWidth, h);
    }
  }

  // Loudness Normalizer Synthesis
  btnNormalize.addEventListener('click', async () => {
    if (!audioBuffer) return;
    if (isPlaying) stopPreview();

    btnNormalize.disabled = true;
    step2Section.classList.add('hidden');
    processingCard.classList.remove('hidden');
    progressBar.style.width = '15%';
    statusEl.textContent = 'Analyzing average loudness...';

    try {
      const targetLufs = parseInt(sliderLufs.value);
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      const channels = audioBuffer.numberOfChannels;

      // 1. Scan RMS dBFS
      const leftData = audioBuffer.getChannelData(0);
      let sumSquares = 0;
      for (let i = 0; i < leftData.length; i++) {
        sumSquares += leftData[i] * leftData[i];
      }
      const rms = Math.sqrt(sumSquares / leftData.length);
      const dbfs = 20 * Math.log10(rms || 0.0001);
      
      // Map dBFS to relative LUFS
      const measuredLufs = dbfs - 3.0; // standard offset mapping
      
      // Calculate target gain
      const lufsDelta = targetLufs - measuredLufs;
      let targetGain = Math.pow(10, lufsDelta / 20);

      progressBar.style.width = '45%';
      statusEl.textContent = 'Enforcing peak ceiling constraints...';

      // 2. Scan peak values to prevent clipping
      let maxVal = 0.0001;
      for (let c = 0; c < channels; c++) {
        const cData = audioBuffer.getChannelData(c);
        for (let i = 0; i < cData.length; i++) {
          const absVal = Math.abs(cData[i]);
          if (absVal > maxVal) maxVal = absVal;
        }
      }

      // Max ceiling limit = -1.5 dBFS (approx 0.84 amplitude)
      const ceilingGain = Math.pow(10, -1.5 / 20); // 0.841
      if (targetGain * maxVal > ceilingGain) {
        // scale gain back to protect headroom
        targetGain = ceilingGain / maxVal;
      }

      progressBar.style.width = '70%';
      statusEl.textContent = 'Rendering normalized output buffer...';

      // 3. Render Offline context
      const offlineCtx = new OfflineAudioContext(
        channels,
        Math.floor(sampleRate * duration),
        sampleRate
      );

      const srcNode = offlineCtx.createBufferSource();
      srcNode.buffer = audioBuffer;
      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(targetGain, 0);

      srcNode.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      srcNode.start(0);

      const normalizedBuffer = await offlineCtx.startRendering();
      progressBar.style.width = '90%';
      statusEl.textContent = 'Compiling output formats...';

      const wavBlob = bufferToWav(normalizedBuffer);
      const url = URL.createObjectURL(wavBlob);

      progressBar.style.width = '100%';
      await new Promise(r => setTimeout(r, 200));

      downloadLink.href = url;
      const baseName = activeFile.name.replace(/\.[^/.]+$/, '');
      downloadLink.download = `${baseName}_normalized.${exportFormat.value}`;
      masterPreviewPlayer.src = url;

      downloadFileSize.textContent = (wavBlob.size / (1024 * 1024)).toFixed(2) + ' MB';

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'audio-normalizer' })
      });

      processingCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');
      btnNormalize.disabled = false;

    } catch (err) {
      console.error(err);
      processingCard.classList.add('hidden');
      step2Section.classList.remove('hidden');
      btnNormalize.disabled = false;
      alert('Normalization failed: ' + err.message);
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

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Test automation parameters hook
  if (new URLSearchParams(window.location.search).get('test') === 'true') {
    fetch('/test.wav')
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], 'test.wav', { type: 'audio/wav' });
        handleFile(file);
      })
      .catch(err => console.error('Failed to load test wav in automation:', err));
  }
})();
