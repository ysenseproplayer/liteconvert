// Custom Auto Panner Client Logic
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="audio-pan"]');
  if (!workbench) return;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('audio-file-input');
  
  const step1Section = document.getElementById('step-1-section');
  const step2Section = document.getElementById('step-2-section');
  
  const infoFileName = document.getElementById('info-file-name');
  const infoFileDuration = document.getElementById('info-file-duration');
  
  const canvas = document.getElementById('panner-canvas');
  const progressTime = document.getElementById('panner-progress');
  const playhead = document.getElementById('panner-playhead');
  
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const labelCurrentTime = document.getElementById('player-current-time');
  const labelTotalTime = document.getElementById('player-total-time');
  
  const sliderRate = document.getElementById('pan-rate');
  const lblRate = document.getElementById('lbl-pan-rate');
  
  const sliderDepth = document.getElementById('pan-depth');
  const lblDepth = document.getElementById('lbl-pan-depth');
  
  const presets = document.querySelectorAll('.preset-btn');
  
  const btnReset = document.getElementById('btn-reset');
  const btnProcess = document.getElementById('btn-process');
  
  const processingCard = document.getElementById('processing-card');
  const progressBar = document.getElementById('processing-progress-bar');
  const statusEl = document.getElementById('processing-status');
  
  const downloadCard = document.getElementById('download-card');
  const downloadFileSize = document.getElementById('download-file-size');
  const downloadLink = document.getElementById('download-link');
  const btnPannerAnother = document.getElementById('btn-panner-another');

  let activeFile = null;
  let audioBuffer = null;
  let audioContext = null;
  
  let isPlaying = false;
  let activeSourceNode = null;
  let activePannerNode = null;
  let playbackStartTime = 0;
  let pausedAt = 0;
  let playbackInterval = null;

  // File picker triggers
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
    
    step1Section.classList.add('hidden');
    step2Section.classList.remove('hidden');
    downloadCard.classList.add('hidden');

    try {
      const arrayBuffer = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const duration = audioBuffer.duration;
      infoFileDuration.textContent = formatTime(duration);
      labelTotalTime.textContent = formatTime(duration);

      sliderRate.value = 0.5;
      lblRate.textContent = "0.50 Hz";
      sliderDepth.value = 80;
      lblDepth.textContent = "80%";

      drawPeaks(audioBuffer);

    } catch (err) {
      console.error(err);
      alert('Failed to load audio file: ' + err.message);
      btnReset.click();
    }
  }

  // Update slider displays
  sliderRate.addEventListener('input', () => {
    lblRate.textContent = parseFloat(sliderRate.value).toFixed(2) + ' Hz';
    if (isPlaying) updateRealtimePanning();
  });

  sliderDepth.addEventListener('input', () => {
    lblDepth.textContent = sliderDepth.value + '%';
    if (isPlaying) updateRealtimePanning();
  });

  // Presets listeners
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      const r = parseFloat(btn.getAttribute('data-rate'));
      const d = parseInt(btn.getAttribute('data-depth'));
      
      sliderRate.value = r;
      sliderRate.dispatchEvent(new Event('input'));
      
      sliderDepth.value = d;
      sliderDepth.dispatchEvent(new Event('input'));
      
      // Update visual button highlight
      presets.forEach(b => {
        b.className = 'btn btn-secondary preset-btn';
        b.style.background = '';
      });
      btn.className = 'btn btn-primary preset-btn';
      btn.style.background = 'var(--accent-gradient)';
    });
  });

  btnReset.addEventListener('click', () => {
    if (isPlaying) stopPreview();
    sliderRate.value = 0.5;
    sliderRate.dispatchEvent(new Event('input'));
    sliderDepth.value = 80;
    sliderDepth.dispatchEvent(new Event('input'));
    presets.forEach(b => {
      b.className = 'btn btn-secondary preset-btn';
      b.style.background = '';
    });
  });

  btnPannerAnother.addEventListener('click', () => {
    if (isPlaying) stopPreview();
    activeFile = null;
    audioBuffer = null;
    fileInput.value = '';
    step2Section.classList.add('hidden');
    step1Section.classList.remove('hidden');
    downloadCard.classList.add('hidden');
  });

  // Playback Preview
  btnPlayPause.addEventListener('click', () => {
    if (!audioBuffer) return;
    if (isPlaying) {
      pausePreview();
    } else {
      startPreview();
    }
  });

  function startPreview() {
    if (isPlaying) return;
    
    activeSourceNode = audioContext.createBufferSource();
    activeSourceNode.buffer = audioBuffer;
    
    // Create StereoPannerNode for modulating preview pan
    if (audioContext.createStereoPanner) {
      activePannerNode = audioContext.createStereoPanner();
      activeSourceNode.connect(activePannerNode);
      activePannerNode.connect(audioContext.destination);
    } else {
      activeSourceNode.connect(audioContext.destination);
    }
    
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    
    playbackStartTime = audioContext.currentTime - pausedAt;
    activeSourceNode.start(0, pausedAt);
    
    activeSourceNode.onended = () => {
      if (isPlaying) stopPreview();
    };

    // Tracking progress and real-time auto pan LFO modulation
    playbackInterval = setInterval(() => {
      const elapsed = audioContext.currentTime - playbackStartTime;
      if (elapsed >= audioBuffer.duration) {
        stopPreview();
      } else {
        labelCurrentTime.textContent = formatTime(elapsed);
        const pct = (elapsed / audioBuffer.duration) * 100;
        progressTime.style.width = pct + '%';
        playhead.style.left = pct + '%';
        
        // Modulate Stereo Panner Node LFO
        if (activePannerNode) {
          const rate = parseFloat(sliderRate.value);
          const depth = parseFloat(sliderDepth.value) / 100;
          const panVal = depth * Math.sin(2 * Math.PI * rate * elapsed);
          activePannerNode.pan.setValueAtTime(panVal, audioContext.currentTime);
        }
      }
    }, 40);
  }

  function updateRealtimePanning() {
    if (!activePannerNode) return;
    const elapsed = audioContext.currentTime - playbackStartTime;
    const rate = parseFloat(sliderRate.value);
    const depth = parseFloat(sliderDepth.value) / 100;
    const panVal = depth * Math.sin(2 * Math.PI * rate * elapsed);
    activePannerNode.pan.setValueAtTime(panVal, audioContext.currentTime);
  }

  function pausePreview() {
    pausedAt = audioContext.currentTime - playbackStartTime;
    stopSource();
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    clearInterval(playbackInterval);
  }

  function stopPreview() {
    stopSource();
    isPlaying = false;
    pausedAt = 0;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    clearInterval(playbackInterval);
    labelCurrentTime.textContent = '00:00';
    progressTime.style.width = '0%';
    playhead.style.left = '0%';
  }

  function stopSource() {
    if (activeSourceNode) {
      try {
        activeSourceNode.stop();
      } catch (e) {}
      activeSourceNode = null;
    }
    if (activePannerNode) {
      activePannerNode.disconnect();
      activePannerNode = null;
    }
  }

  // Draw peak waveform
  function drawPeaks(buffer) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    const barWidth = 2;
    const gap = 1;
    for (let i = 0; i < width; i += (barWidth + gap)) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      const x = i;
      const h = Math.max(2, (max - min) * amp);
      const grad = ctx.createLinearGradient(0, amp - h/2, 0, amp + h/2);
      grad.addColorStop(0, '#00f2fe');
      grad.addColorStop(1, '#4facfe');
      ctx.fillStyle = grad;
      ctx.fillRect(x, amp - h/2, barWidth, h);
    }
  }

  // Process and modulation synthesis
  btnProcess.addEventListener('click', async () => {
    if (!audioBuffer) return;
    if (isPlaying) stopPreview();

    btnProcess.disabled = true;
    step2Section.classList.add('hidden');
    processingCard.classList.remove('hidden');
    progressBar.style.width = '20%';
    statusEl.textContent = 'Compiling modulation parameters...';

    try {
      const rate = parseFloat(sliderRate.value);
      const depth = parseFloat(sliderDepth.value) / 100;
      
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      const channels = audioBuffer.numberOfChannels;

      const offlineCtx = new OfflineAudioContext(
        channels,
        Math.floor(sampleRate * duration),
        sampleRate
      );

      const srcNode = offlineCtx.createBufferSource();
      srcNode.buffer = audioBuffer;

      let lastNode = srcNode;

      progressBar.style.width = '50%';
      statusEl.textContent = 'Applying sinusoidal panning modulation curves...';

      // Apply modulation if Stereo Panner supported
      if (offlineCtx.createStereoPanner) {
        const pannerNode = offlineCtx.createStereoPanner();
        
        // Sinusoidal LFO sweep: automation nodes mapped at 10ms intervals
        const step = 0.01;
        for (let t = 0; t < duration; t += step) {
          const panValue = depth * Math.sin(2 * Math.PI * rate * t);
          pannerNode.pan.setValueAtTime(panValue, t);
        }
        
        srcNode.connect(pannerNode);
        lastNode = pannerNode;
      }

      lastNode.connect(offlineCtx.destination);
      srcNode.start(0);

      const masterBuffer = await offlineCtx.startRendering();
      progressBar.style.width = '85%';
      statusEl.textContent = 'Compiling master WAV stream...';

      const wavBlob = bufferToWav(masterBuffer);
      const url = URL.createObjectURL(wavBlob);

      progressBar.style.width = '100%';
      await new Promise(r => setTimeout(r, 200));

      downloadLink.href = url;
      const baseName = activeFile.name.replace(/\.[^/.]+$/, '');
      downloadLink.download = `${baseName}_panned.mp3`;

      downloadFileSize.textContent = (wavBlob.size / (1024 * 1024)).toFixed(2) + ' MB';

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'audio-pan' })
      });

      processingCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');
      btnProcess.disabled = false;

    } catch (err) {
      console.error(err);
      processingCard.classList.add('hidden');
      step2Section.classList.remove('hidden');
      btnProcess.disabled = false;
      alert('Panner failed: ' + err.message);
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
