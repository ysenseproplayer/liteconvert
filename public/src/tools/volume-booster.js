// ==========================================
// MP3 VOLUME BOOSTER — Standalone Tool Engine
// ==========================================
(function () {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="volume-booster"]');
  if (!workbench) return;

  const dropZone = document.getElementById('vol-drop-zone');
  const fileInput = document.getElementById('vol-file-input');
  const uploadCard = document.getElementById('vol-upload-card');
  const editorArea = document.getElementById('vol-editor-area');
  const fileNameEl = document.getElementById('vol-file-name');
  const canvas = document.getElementById('vol-waveform-canvas');
  const timeStart = document.getElementById('vol-time-start');
  const timeDuration = document.getElementById('vol-time-duration');
  const timeEnd = document.getElementById('vol-time-end');
  const btnPlay = document.getElementById('vol-btn-play');
  const playIcon = document.getElementById('vol-play-icon');
  const pauseIcon = document.getElementById('vol-pause-icon');
  const gainSlider = document.getElementById('vol-gain-slider');
  const gainVal = document.getElementById('vol-gain-val');
  const formatSel = document.getElementById('vol-format');
  const btnSave = document.getElementById('vol-btn-save');
  const btnReset = document.getElementById('vol-btn-reset');
  const btnNewFile = document.getElementById('vol-btn-new-file');
  const progressCard = document.getElementById('vol-progress-card');
  const progressBar = document.getElementById('vol-progress-bar');
  const progressStatus = document.getElementById('vol-progress-status');
  const downloadCard = document.getElementById('vol-download-card');
  const downloadLink = document.getElementById('vol-download-link');
  const downloadInfo = document.getElementById('vol-download-info');
  const btnAnother = document.getElementById('vol-btn-another');

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

  // Volume slider
  gainSlider.addEventListener('input', () => {
    const pct = parseInt(gainSlider.value);
    const dB = pct === 0 ? '-∞' : (20 * Math.log10(pct / 100)).toFixed(1);
    gainVal.textContent = dB === '-∞' ? '-∞ dB' : (dB >= 0 ? '+' : '') + dB + ' dB';
  });
  // Initialize label
  gainVal.textContent = '0 dB';

  async function handleFile(file) {
    fileNameEl.textContent = file.name;
    uploadCard.classList.add('hidden');
    editorArea.classList.remove('hidden');
    editorArea.style.display = 'block';
    downloadCard.classList.add('hidden');
    progressCard.classList.add('hidden');

    try {
      const ab = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioContext.decodeAudioData(ab);

      timeStart.textContent = '00:00.0';
      timeDuration.textContent = formatTime(audioBuffer.duration);
      timeEnd.textContent = formatTimePrecise(audioBuffer.duration);
      drawWaveform(audioBuffer);
    } catch (err) {
      console.error(err);
      fileNameEl.textContent = 'Error decoding file';
    }
  }

  // Reset / New
  btnReset.addEventListener('click', () => {
    gainSlider.value = 100;
    gainVal.textContent = '0 dB';
  });
  btnNewFile.addEventListener('click', resetUI);
  btnAnother.addEventListener('click', resetUI);

  function resetUI() {
    audioBuffer = null;
    stopAudio();
    fileInput.value = '';
    gainSlider.value = 100;
    gainVal.textContent = '0 dB';
    uploadCard.classList.remove('hidden');
    editorArea.classList.add('hidden');
    downloadCard.classList.add('hidden');
    progressCard.classList.add('hidden');
  }

  // Playback
  btnPlay.addEventListener('click', () => { isPlaying ? pauseAudio() : playAudio(); });

  function playAudio() {
    if (!audioBuffer || !audioContext) return;
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    activeSource = audioContext.createBufferSource();
    activeSource.buffer = audioBuffer;

    // Apply volume gain for preview
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(parseInt(gainSlider.value) / 100.0, 0);
    activeSource.connect(gain);
    gain.connect(audioContext.destination);

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

  // Save / Process
  btnSave.addEventListener('click', async () => {
    if (!audioBuffer) return;
    stopAudio();

    progressCard.classList.remove('hidden');
    editorArea.classList.add('hidden');
    progressBar.style.width = '10%';
    progressStatus.textContent = 'Adjusting volume...';

    try {
      const gainPercent = parseInt(gainSlider.value);
      const gainMultiplier = gainPercent / 100.0;
      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;

      progressBar.style.width = '30%';

      const offlineCtx = new OfflineAudioContext(channels, Math.floor(sampleRate * duration), sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(gainMultiplier, 0);

      source.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      source.start(0);

      progressBar.style.width = '60%';
      progressStatus.textContent = 'Rendering boosted track...';

      const outputBuffer = await offlineCtx.startRendering();

      progressBar.style.width = '90%';
      const wavBlob = bufferToWav(outputBuffer);
      const ext = formatSel.value;
      const sizeMb = (wavBlob.size / (1024 * 1024)).toFixed(2);
      const dB = gainPercent === 0 ? '-∞' : (20 * Math.log10(gainPercent / 100)).toFixed(1);

      downloadLink.href = URL.createObjectURL(wavBlob);
      downloadLink.download = `volume_boosted.${ext}`;
      downloadInfo.textContent = `File Size: ${sizeMb} MB | Format: ${ext.toUpperCase()} | Volume: ${dB >= 0 ? '+' : ''}${dB} dB (${gainPercent}%)`;

      progressBar.style.width = '100%';
      progressCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

      fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'volume-booster' })
      }).catch(() => {});

    } catch (err) {
      console.error(err);
      progressStatus.textContent = 'Error: ' + err.message;
      progressBar.style.width = '0%';
    }
  });

  // Drawing
  function drawWaveform(buffer) {
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth * (window.devicePixelRatio || 1);
    const h = canvas.clientHeight * (window.devicePixelRatio || 1);
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const data = buffer.getChannelData(0);
    const barW = 3, gap = 1.5;
    const total = barW + gap;
    const numBars = Math.floor(w / total);
    const step = Math.ceil(data.length / numBars);
    const amp = h / 2;

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#00ff88');
    grad.addColorStop(0.5, '#00f2fe');
    grad.addColorStop(1, '#00ff88');

    ctx.fillStyle = grad;
    for (let i = 0; i < numBars; i++) {
      let min = 1.0, max = -1.0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < data.length) {
          if (data[idx] < min) min = data[idx];
          if (data[idx] > max) max = data[idx];
        }
      }
      const x = i * total;
      const magnitude = Math.max(0.02, max - min);
      const barH = (magnitude / 2) * h * 0.9;
      ctx.fillRect(x, amp - barH, barW, barH * 2);
    }
  }

  function formatTime(s) { return `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`; }
  function formatTimePrecise(s) { return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toFixed(1).padStart(4,'0')}`; }

  // WAV encoder
  function bufferToWav(buffer) {
    const ch = buffer.numberOfChannels, sr = buffer.sampleRate;
    let result;
    if (ch === 2) {
      const L = buffer.getChannelData(0), R = buffer.getChannelData(1);
      result = new Float32Array(L.length + R.length);
      let idx = 0, inp = 0;
      while (idx < result.length) { result[idx++] = L[inp]; result[idx++] = R[inp]; inp++; }
    } else { result = buffer.getChannelData(0); }
    const bufLen = result.length * 2;
    const ab = new ArrayBuffer(44 + bufLen);
    const v = new DataView(ab);
    const ws = (view, off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    ws(v, 0, 'RIFF'); v.setUint32(4, 36 + bufLen, true); ws(v, 8, 'WAVE'); ws(v, 12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true);
    v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); ws(v, 36, 'data');
    v.setUint32(40, bufLen, true);
    for (let i = 0, off = 44; i < result.length; i++, off += 2) {
      const s = Math.max(-1, Math.min(1, result[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([v], { type: 'audio/wav' });
  }
})();
