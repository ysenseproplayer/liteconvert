// ==========================================
// BLANK MP3 GENERATOR — Standalone Engine
// ==========================================
(function () {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="blank-mp3"]');
  if (!workbench) return;

  const durationSlider = document.getElementById('blk-duration-slider');
  const durationVal = document.getElementById('blk-duration-val');
  const presetButtons = document.querySelectorAll('.blk-preset');
  const formatSel = document.getElementById('blk-format');
  const btnGenerate = document.getElementById('blk-btn-generate');
  const generatorCard = document.getElementById('blk-generator-card');

  const progressCard = document.getElementById('blk-progress-card');
  const progressBar = document.getElementById('blk-progress-bar');
  const progressStatus = document.getElementById('blk-progress-status');

  const downloadCard = document.getElementById('blk-download-card');
  const downloadLink = document.getElementById('blk-download-link');
  const downloadInfo = document.getElementById('blk-download-info');
  const btnReset = document.getElementById('blk-btn-reset');

  let selectedDuration = 10; // default 10 seconds

  // Slider change handler
  durationSlider.addEventListener('input', () => {
    selectedDuration = parseInt(durationSlider.value);
    durationVal.textContent = selectedDuration + 's';
    
    // De-activate presets unless matched exactly
    presetButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val) === selectedDuration);
    });
  });

  // Preset button click handlers
  presetButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDuration = parseInt(btn.dataset.val);
      durationSlider.value = selectedDuration;
      durationVal.textContent = selectedDuration + 's';
    });
  });

  // Reset/Generate another handler
  btnReset.addEventListener('click', () => {
    selectedDuration = 10;
    durationSlider.value = 10;
    durationVal.textContent = '10s';
    presetButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('.blk-preset[data-val="10"]').classList.add('active');

    generatorCard.classList.remove('hidden');
    downloadCard.classList.add('hidden');
    progressCard.classList.add('hidden');
  });

  // Main Generator Action
  btnGenerate.addEventListener('click', async () => {
    progressCard.classList.remove('hidden');
    generatorCard.classList.add('hidden');
    progressBar.style.width = '10%';
    progressStatus.textContent = 'Initializing silent buffer...';

    try {
      const sampleRate = 44100;
      const channels = 1; // mono is sufficient for silence
      
      progressBar.style.width = '40%';
      progressStatus.textContent = `Synthesizing ${selectedDuration}s silent track...`;
      
      // Render blank buffer
      const offlineCtx = new OfflineAudioContext(channels, sampleRate * selectedDuration, sampleRate);
      const outputBuffer = await offlineCtx.startRendering();

      progressBar.style.width = '85%';
      progressStatus.textContent = 'Encoding output...';

      const wavBlob = bufferToWav(outputBuffer);
      const ext = formatSel.value;
      const sizeKb = (wavBlob.size / 1024).toFixed(1);

      downloadLink.href = URL.createObjectURL(wavBlob);
      downloadLink.download = `blank_${selectedDuration}s.${ext}`;
      downloadInfo.textContent = `File Size: ${sizeKb} KB | Format: ${ext.toUpperCase()} | Duration: ${selectedDuration}s of pure silence`;

      progressBar.style.width = '100%';
      progressCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

      // Increment stats
      fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'blank-mp3' })
      }).catch(() => {});

    } catch (err) {
      console.error(err);
      progressStatus.textContent = 'Error: ' + err.message;
      progressBar.style.width = '0%';
    }
  });

  // WAV encoder
  function bufferToWav(buffer) {
    const ch = buffer.numberOfChannels, sr = buffer.sampleRate;
    let result = buffer.getChannelData(0);
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
