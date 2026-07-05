// ==========================================
// AUDIO FADE IN/OUT — Standalone Tool Engine
// ==========================================
(function () {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="audio-fade"]');
  if (!workbench) return;

  // Elements
  const dropZone = document.getElementById('fade-drop-zone');
  const fileInput = document.getElementById('fade-file-input');
  const uploadCard = document.getElementById('fade-upload-card');
  const fileInfoCard = document.getElementById('fade-file-info');
  const controlsArea = document.getElementById('fade-controls-area');
  const actionArea = document.getElementById('fade-action-area');
  const progressCard = document.getElementById('fade-progress-card');
  const progressBar = document.getElementById('fade-progress-bar');
  const progressStatus = document.getElementById('fade-progress-status');
  const downloadCard = document.getElementById('fade-download-card');
  const downloadLink = document.getElementById('fade-download-link');
  const downloadInfo = document.getElementById('fade-download-info');
  const btnProcess = document.getElementById('fade-btn-process');
  const btnNewFile = document.getElementById('fade-btn-new-file');
  const btnAnother = document.getElementById('fade-btn-another');
  const btnPlay = document.getElementById('fade-btn-play');
  const btnStop = document.getElementById('fade-btn-stop');
  const playIcon = document.getElementById('fade-play-icon');
  const pauseIcon = document.getElementById('fade-pause-icon');
  const canvas = document.getElementById('fade-waveform-canvas');

  const fadeInSlider = document.getElementById('fade-in-slider');
  const fadeOutSlider = document.getElementById('fade-out-slider');
  const fadeInVal = document.getElementById('fade-in-val');
  const fadeOutVal = document.getElementById('fade-out-val');
  const exportFormat = document.getElementById('fade-export-format');

  const infoName = document.getElementById('fade-info-name');
  const infoSize = document.getElementById('fade-info-size');
  const infoDuration = document.getElementById('fade-info-duration');
  const infoSrate = document.getElementById('fade-info-srate');

  // State
  let audioContext = null;
  let audioBuffer = null;
  let activeSource = null;
  let isPlaying = false;
  let playbackStart = 0;
  let pausedAt = 0;

  // Drag & Drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.style.borderColor = ''; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
  dropZone.addEventListener('click', e => { if (e.target !== fileInput) fileInput.click(); });

  // Slider listeners
  fadeInSlider.addEventListener('input', () => {
    fadeInVal.textContent = fadeInSlider.value + 's';
    updateExportNote();
    // Update preset active state
    document.querySelectorAll('.fade-preset-in').forEach(b => b.classList.toggle('active', b.dataset.val === fadeInSlider.value));
  });
  fadeOutSlider.addEventListener('input', () => {
    fadeOutVal.textContent = fadeOutSlider.value + 's';
    updateExportNote();
    document.querySelectorAll('.fade-preset-out').forEach(b => b.classList.toggle('active', b.dataset.val === fadeOutSlider.value));
  });

  // Preset buttons
  document.querySelectorAll('.fade-preset-in').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      fadeInSlider.value = btn.dataset.val;
      fadeInVal.textContent = btn.dataset.val + 's';
      document.querySelectorAll('.fade-preset-in').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateExportNote();
    });
  });
  document.querySelectorAll('.fade-preset-out').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      fadeOutSlider.value = btn.dataset.val;
      fadeOutVal.textContent = btn.dataset.val + 's';
      document.querySelectorAll('.fade-preset-out').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateExportNote();
    });
  });

  function updateExportNote() {
    const note = exportFormat.parentElement.querySelector('span');
    if (note) {
      note.textContent = `The export will fade in for ${fadeInSlider.value}s and fade out over the last ${fadeOutSlider.value}s.`;
    }
  }

  // File handling
  async function handleFile(file) {
    infoName.textContent = file.name;
    infoSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    uploadCard.classList.add('hidden');
    fileInfoCard.classList.remove('hidden');
    controlsArea.classList.remove('hidden');
    controlsArea.style.display = 'grid';
    actionArea.classList.remove('hidden');
    downloadCard.classList.add('hidden');
    progressCard.classList.add('hidden');

    try {
      const arrayBuffer = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      infoDuration.textContent = formatTime(audioBuffer.duration) + ' (' + audioBuffer.duration.toFixed(1) + 's)';
      infoSrate.textContent = audioBuffer.sampleRate + ' Hz';
      drawWaveform(audioBuffer);
    } catch (err) {
      console.error(err);
      infoName.textContent = 'Error decoding file';
    }
  }

  // New file / another
  btnNewFile.addEventListener('click', resetUI);
  btnAnother.addEventListener('click', resetUI);

  function resetUI() {
    audioBuffer = null;
    stopAudio();
    fileInput.value = '';
    uploadCard.classList.remove('hidden');
    fileInfoCard.classList.add('hidden');
    controlsArea.classList.add('hidden');
    actionArea.classList.add('hidden');
    downloadCard.classList.add('hidden');
    progressCard.classList.add('hidden');
  }

  // Playback
  btnPlay.addEventListener('click', () => { isPlaying ? pauseAudio() : playAudio(); });
  btnStop.addEventListener('click', stopAudio);

  function playAudio() {
    if (!audioBuffer || !audioContext) return;
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    activeSource = audioContext.createBufferSource();
    activeSource.buffer = audioBuffer;
    activeSource.connect(audioContext.destination);
    playbackStart = audioContext.currentTime - pausedAt;
    activeSource.start(0, pausedAt);
    activeSource.onended = () => { if (isPlaying) stopAudio(); };
  }

  function pauseAudio() {
    if (!isPlaying) return;
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    if (activeSource) try { activeSource.stop(); } catch (e) {}
    pausedAt = audioContext.currentTime - playbackStart;
  }

  function stopAudio() {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    if (activeSource) try { activeSource.stop(); } catch (e) {}
    pausedAt = 0;
  }

  // Process
  btnProcess.addEventListener('click', async () => {
    if (!audioBuffer) return;
    stopAudio();

    progressCard.classList.remove('hidden');
    actionArea.classList.add('hidden');
    progressBar.style.width = '10%';
    progressStatus.textContent = 'Applying fade in/out...';

    try {
      const fadeIn = parseFloat(fadeInSlider.value);
      const fadeOut = parseFloat(fadeOutSlider.value);
      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;

      progressBar.style.width = '30%';
      progressStatus.textContent = 'Compiling audio frames...';

      const offlineCtx = new OfflineAudioContext(channels, Math.floor(sampleRate * duration), sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = offlineCtx.createGain();

      // Fade in
      if (fadeIn > 0) {
        gainNode.gain.setValueAtTime(0, 0);
        gainNode.gain.linearRampToValueAtTime(1, Math.min(fadeIn, duration));
      } else {
        gainNode.gain.setValueAtTime(1, 0);
      }

      // Fade out
      if (fadeOut > 0) {
        const outStart = Math.max(0, duration - fadeOut);
        gainNode.gain.setValueAtTime(1, outStart);
        gainNode.gain.linearRampToValueAtTime(0, duration);
      }

      source.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      source.start(0);

      progressBar.style.width = '60%';
      progressStatus.textContent = 'Rendering faded track...';

      const outputBuffer = await offlineCtx.startRendering();

      progressBar.style.width = '90%';
      progressStatus.textContent = 'Encoding output...';

      const wavBlob = bufferToWav(outputBuffer);
      const ext = exportFormat.value;
      const sizeKb = (wavBlob.size / 1024).toFixed(1);

      downloadLink.href = URL.createObjectURL(wavBlob);
      downloadLink.download = `audio_faded.${ext}`;
      downloadInfo.textContent = `File Size: ${sizeKb} KB | Format: ${ext.toUpperCase()} | Duration: ${formatTime(duration)} | Fade In: ${fadeIn}s | Fade Out: ${fadeOut}s`;

      progressBar.style.width = '100%';
      progressCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

      // Update the waveform with the faded audio
      audioBuffer = outputBuffer;
      drawWaveform(audioBuffer);

      // Stats
      fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'audio-fade' })
      }).catch(() => {});

    } catch (err) {
      console.error(err);
      progressStatus.textContent = 'Error: ' + err.message;
      progressBar.style.width = '0%';
    }
  });

  // Waveform drawing
  function drawWaveform(buffer) {
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth * (window.devicePixelRatio || 1);
    const height = canvas.clientHeight * (window.devicePixelRatio || 1);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const data = buffer.getChannelData(0);
    const barWidth = 3;
    const barGap = 2;
    const totalBarWidth = barWidth + barGap;
    const numBars = Math.floor(width / totalBarWidth);
    const step = Math.ceil(data.length / numBars);
    const amp = height / 2;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#00f2fe');
    gradient.addColorStop(0.5, '#4facfe');
    gradient.addColorStop(1, '#00f2fe');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = barWidth;
    ctx.lineCap = 'round';

    for (let i = 0; i < numBars; i++) {
      let min = 1.0, max = -1.0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < data.length) {
          if (data[idx] < min) min = data[idx];
          if (data[idx] > max) max = data[idx];
        }
      }
      const x = i * totalBarWidth + barWidth / 2;
      const magnitude = Math.max(0.04, max - min);
      const barH = (magnitude / 2) * height * 0.85;
      ctx.beginPath();
      ctx.moveTo(x, amp - barH);
      ctx.lineTo(x, amp + barH);
      ctx.stroke();
    }
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // WAV encoder
  function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    let result;
    if (numOfChan === 2) {
      const L = buffer.getChannelData(0), R = buffer.getChannelData(1);
      const length = L.length + R.length;
      result = new Float32Array(length);
      let idx = 0, inp = 0;
      while (idx < length) { result[idx++] = L[inp]; result[idx++] = R[inp]; inp++; }
    } else {
      result = buffer.getChannelData(0);
    }
    const bufLen = result.length * 2;
    const ab = new ArrayBuffer(44 + bufLen);
    const v = new DataView(ab);
    const ws = (view, off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    ws(v, 0, 'RIFF'); v.setUint32(4, 36 + bufLen, true); ws(v, 8, 'WAVE'); ws(v, 12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numOfChan, true);
    v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * numOfChan * 2, true);
    v.setUint16(32, numOfChan * 2, true); v.setUint16(34, 16, true); ws(v, 36, 'data');
    v.setUint32(40, bufLen, true);
    for (let i = 0, off = 44; i < result.length; i++, off += 2) {
      const s = Math.max(-1, Math.min(1, result[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([v], { type: 'audio/wav' });
  }
})();
