// ==========================================
// AUDIO REVERSE — Standalone Tool Engine
// ==========================================
(function () {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="reverse-audio"]');
  if (!workbench) return;

  const dropZone = document.getElementById('rev-drop-zone');
  const fileInput = document.getElementById('rev-file-input');
  const uploadCard = document.getElementById('rev-upload-card');
  const previewCard = document.getElementById('rev-preview-card');
  const actionArea = document.getElementById('rev-action-area');
  const fileNameEl = document.getElementById('rev-file-name');
  const durationEl = document.getElementById('rev-duration');
  const canvas = document.getElementById('rev-waveform-canvas');
  const btnPlay = document.getElementById('rev-btn-play');
  const playIcon = document.getElementById('rev-play-icon');
  const pauseIcon = document.getElementById('rev-pause-icon');
  const playLabel = document.getElementById('rev-play-label');
  const btnNewFile = document.getElementById('rev-btn-new-file');
  const btnProcess = document.getElementById('rev-btn-process');
  const progressCard = document.getElementById('rev-progress-card');
  const progressBar = document.getElementById('rev-progress-bar');
  const progressStatus = document.getElementById('rev-progress-status');
  const downloadCard = document.getElementById('rev-download-card');
  const downloadLink = document.getElementById('rev-download-link');
  const downloadInfo = document.getElementById('rev-download-info');
  const btnAnother = document.getElementById('rev-btn-another');

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

  async function handleFile(file) {
    fileNameEl.textContent = file.name;
    uploadCard.classList.add('hidden');
    previewCard.classList.remove('hidden');
    actionArea.classList.remove('hidden');
    downloadCard.classList.add('hidden');
    progressCard.classList.add('hidden');

    try {
      const ab = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioContext.decodeAudioData(ab);
      durationEl.textContent = `0:00 / ${formatTime(audioBuffer.duration)}`;
      drawWaveform(audioBuffer);
    } catch (err) {
      console.error(err);
      fileNameEl.textContent = 'Error decoding file';
    }
  }

  // Reset
  btnNewFile.addEventListener('click', resetUI);
  btnAnother.addEventListener('click', resetUI);

  function resetUI() {
    audioBuffer = null;
    stopAudio();
    fileInput.value = '';
    uploadCard.classList.remove('hidden');
    previewCard.classList.add('hidden');
    actionArea.classList.add('hidden');
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
    playLabel.textContent = 'Pause';
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
    playLabel.textContent = 'Play';
    if (activeSource) try { activeSource.stop(); } catch (e) {}
    pausedAt = audioContext.currentTime - playbackStart;
  }

  function stopAudio() {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    playLabel.textContent = 'Play';
    if (activeSource) try { activeSource.stop(); } catch (e) {}
    pausedAt = 0;
  }

  // Process
  btnProcess.addEventListener('click', async () => {
    if (!audioBuffer) return;
    stopAudio();

    progressCard.classList.remove('hidden');
    actionArea.classList.add('hidden');
    previewCard.classList.add('hidden');
    progressBar.style.width = '10%';
    progressStatus.textContent = 'Reversing audio samples...';

    try {
      const channels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const length = audioBuffer.length;

      progressBar.style.width = '30%';

      // Create reversed buffer manually
      const offCtx = new OfflineAudioContext(channels, 100, sampleRate);
      const reversedBuffer = offCtx.createBuffer(channels, length, sampleRate);

      for (let c = 0; c < channels; c++) {
        const srcData = audioBuffer.getChannelData(c);
        const dstData = reversedBuffer.getChannelData(c);
        for (let i = 0; i < srcData.length; i++) {
          dstData[i] = srcData[srcData.length - 1 - i];
        }
      }

      progressBar.style.width = '70%';
      progressStatus.textContent = 'Encoding reversed audio...';

      const wavBlob = bufferToWav(reversedBuffer);
      const sizeMb = (wavBlob.size / (1024 * 1024)).toFixed(2);

      downloadLink.href = URL.createObjectURL(wavBlob);
      downloadLink.download = 'reversed_audio.wav';
      downloadInfo.textContent = `File Size: ${sizeMb} MB | Format: WAV | Duration: ${formatTime(audioBuffer.duration)}`;

      // Update the buffer and waveform for playback
      audioBuffer = reversedBuffer;
      drawWaveform(audioBuffer);

      progressBar.style.width = '100%';
      progressCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

      fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'reverse-audio' })
      }).catch(() => {});

    } catch (err) {
      console.error(err);
      progressStatus.textContent = 'Error: ' + err.message;
      progressBar.style.width = '0%';
    }
  });

  // Waveform
  function drawWaveform(buffer) {
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth * (window.devicePixelRatio || 1);
    const h = canvas.clientHeight * (window.devicePixelRatio || 1);
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const data = buffer.getChannelData(0);
    const barW = 3, gap = 2;
    const total = barW + gap;
    const numBars = Math.floor(w / total);
    const step = Math.ceil(data.length / numBars);
    const amp = h / 2;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(0.5, '#8b5cf6');
    grad.addColorStop(1, '#6366f1');

    ctx.strokeStyle = grad;
    ctx.lineWidth = barW;
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
      const x = i * total + barW / 2;
      const magnitude = Math.max(0.04, max - min);
      const barH = (magnitude / 2) * h * 0.85;
      ctx.beginPath();
      ctx.moveTo(x, amp - barH);
      ctx.lineTo(x, amp + barH);
      ctx.stroke();
    }
  }

  function formatTime(s) { return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; }

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
