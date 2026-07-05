// ==========================================
// METRONOME CLICK GENERATOR — Standalone Engine
// ==========================================
(function () {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="metronome"]');
  if (!workbench) return;

  const bpmInput = document.getElementById('met-bpm');
  const signatureInput = document.getElementById('met-signature');
  const soundInput = document.getElementById('met-sound');
  const measuresInput = document.getElementById('met-measures');
  const btnGenerate = document.getElementById('met-btn-generate');
  const configCard = document.getElementById('met-config-card');

  const progressCard = document.getElementById('met-progress-card');
  const progressBar = document.getElementById('met-progress-bar');
  const progressStatus = document.getElementById('met-progress-status');

  const downloadCard = document.getElementById('met-download-card');
  const downloadLink = document.getElementById('met-download-link');
  const downloadInfo = document.getElementById('met-download-info');
  const btnPlay = document.getElementById('met-btn-play');
  const playIcon = document.getElementById('met-play-icon');
  const pauseIcon = document.getElementById('met-pause-icon');
  const playLabel = document.getElementById('met-play-label');
  const btnReset = document.getElementById('met-btn-reset');

  let audioContext = null;
  let audioBuffer = null;
  let activeSource = null;
  let isPlaying = false;
  let playbackStart = 0;
  let pausedAt = 0;

  // Reset
  btnReset.addEventListener('click', () => {
    stopAudio();
    audioBuffer = null;
    configCard.classList.remove('hidden');
    downloadCard.classList.add('hidden');
    progressCard.classList.add('hidden');
  });

  // Playback
  btnPlay.addEventListener('click', () => { isPlaying ? pauseAudio() : playAudio(); });

  function playAudio() {
    if (!audioBuffer) return;
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    playLabel.textContent = 'Pause Preview';

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
    playLabel.textContent = 'Preview Click';
    if (activeSource) try { activeSource.stop(); } catch (e) {}
    pausedAt = audioContext.currentTime - playbackStart;
  }

  function stopAudio() {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    playLabel.textContent = 'Preview Click';
    if (activeSource) try { activeSource.stop(); } catch (e) {}
    pausedAt = 0;
  }

  // Generation
  btnGenerate.addEventListener('click', async () => {
    const bpm = Math.min(300, Math.max(40, parseInt(bpmInput.value || 120)));
    const signature = signatureInput.value;
    const soundType = soundInput.value;
    const measures = Math.min(500, Math.max(1, parseInt(measuresInput.value || 4)));

    progressCard.classList.remove('hidden');
    configCard.classList.add('hidden');
    progressBar.style.width = '10%';
    progressStatus.textContent = 'Preparing metronome variables...';

    try {
      const sampleRate = 44100;
      
      // Determine beats per measure
      let beatsPerMeasure = 4;
      let beatInterval = 60.0 / bpm; // default quarter note beat interval
      
      if (signature === '3/4') {
        beatsPerMeasure = 3;
        beatInterval = 60.0 / bpm;
      } else if (signature === '6/8') {
        beatsPerMeasure = 6;
        beatInterval = 30.0 / bpm; // eighth notes are twice as fast
      } else if (signature === 'none') {
        beatsPerMeasure = 1; // Straight click
        beatInterval = 60.0 / bpm;
      }

      const totalBeats = measures * beatsPerMeasure;
      const totalDuration = totalBeats * beatInterval;
      
      progressBar.style.width = '40%';
      progressStatus.textContent = `Synthesizing ${totalBeats} click beats...`;

      // offline context rendering
      const offlineCtx = new OfflineAudioContext(1, Math.max(1, Math.floor(sampleRate * totalDuration)), sampleRate);

      for (let i = 0; i < totalBeats; i++) {
        const time = i * beatInterval;
        const isAccent = (signature !== 'none' && i % beatsPerMeasure === 0);
        
        let freq = 800;
        let decay = 0.04;
        let type = 'sine';
        let volume = 0.8;
        
        // Define click sounds
        if (soundType === 'classic') {
          freq = isAccent ? 1200 : 900;
          decay = 0.03;
          type = 'sine';
        } else if (soundType === 'digital') {
          freq = isAccent ? 1000 : 800;
          decay = 0.08;
          type = 'sine';
        } else if (soundType === 'woodblock') {
          freq = isAccent ? 1600 : 1200;
          decay = 0.05;
          type = 'triangle';
          volume = 0.7; // triangle wave is naturally louder
        }

        const osc = offlineCtx.createOscillator();
        const gainNode = offlineCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(volume, time + 0.001);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + decay);

        osc.connect(gainNode);
        gainNode.connect(offlineCtx.destination);

        osc.start(time);
        osc.stop(time + decay);
      }

      progressBar.style.width = '80%';
      progressStatus.textContent = 'Rendering track buffer...';

      audioBuffer = await offlineCtx.startRendering();

      progressBar.style.width = '95%';
      progressStatus.textContent = 'Formatting WAV file...';

      const wavBlob = bufferToWav(audioBuffer);
      const sizeKb = (wavBlob.size / 1024).toFixed(1);

      downloadLink.href = URL.createObjectURL(wavBlob);
      downloadLink.download = `click_track_${bpm}bpm_${signature.replace('/','-')}.wav`;
      downloadInfo.textContent = `File Size: ${sizeKb} KB | BPM: ${bpm} | Signature: ${signature.toUpperCase()} | Measures: ${measures} | Duration: ${formatTime(totalDuration)}`;

      progressBar.style.width = '100%';
      progressCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

      // Stats
      fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'metronome' })
      }).catch(() => {});

    } catch (err) {
      console.error(err);
      progressStatus.textContent = 'Error: ' + err.message;
      progressBar.style.width = '0%';
    }
  });

  function formatTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

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
