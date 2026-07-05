// Custom Audio Looper Client Logic
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="audio-looper"]');
  if (!workbench) return;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('audio-file-input');
  
  const step1Section = document.getElementById('step-1-section');
  const step2Section = document.getElementById('step-2-section');
  
  const infoFileName = document.getElementById('info-file-name');
  const infoFileDuration = document.getElementById('info-file-duration');
  
  const canvas = document.getElementById('looper-canvas');
  const progressBarTime = document.getElementById('looper-progress');
  const shadeLeft = document.getElementById('looper-shade-left');
  const shadeRight = document.getElementById('looper-shade-right');
  
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const labelCurrentTime = document.getElementById('player-current-time');
  const labelTotalTime = document.getElementById('player-total-time');
  
  const sliderStart = document.getElementById('loop-start');
  const valStart = document.getElementById('val-loop-start');
  
  const sliderEnd = document.getElementById('loop-end');
  const valEnd = document.getElementById('val-loop-end');
  
  const sliderCount = document.getElementById('loop-count');
  const numCount = document.getElementById('num-loop-count');
  
  const sliderCrossfade = document.getElementById('loop-crossfade');
  const valCrossfade = document.getElementById('val-crossfade');
  
  const lblLoopDuration = document.getElementById('lbl-loop-duration');
  const lblTotalDuration = document.getElementById('lbl-total-duration');
  
  const btnReset = document.getElementById('btn-reset');
  const btnLoop = document.getElementById('btn-loop');
  
  const processingCard = document.getElementById('processing-card');
  const progressBar = document.getElementById('processing-progress-bar');
  const statusEl = document.getElementById('processing-status');
  
  const downloadCard = document.getElementById('download-card');
  const downloadFileSize = document.getElementById('download-file-size');
  const downloadLink = document.getElementById('download-link');
  const btnLoopAnother = document.getElementById('btn-loop-another');

  let activeFile = null;
  let audioBuffer = null;
  let audioContext = null;
  
  let isPlaying = false;
  let activeSourceNode = null;
  let playbackStartTime = 0;
  let pausedAt = 0;
  let playbackInterval = null;

  // Drag & drop handlers
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

      // Initialize Slider values and bounds
      sliderStart.max = duration;
      sliderStart.value = 0;
      valStart.textContent = "0.00";
      
      sliderEnd.max = duration;
      sliderEnd.value = duration;
      valEnd.textContent = duration.toFixed(2);
      
      sliderCount.value = 4;
      numCount.value = 4;
      sliderCrossfade.value = 50;
      valCrossfade.textContent = "50";

      // Draw Waveform peaks
      drawPeaks(audioBuffer);
      updateInfoStats();

    } catch (err) {
      console.error(err);
      alert('Failed to load audio: ' + err.message);
      btnReset.click();
    }
  }

  function updateInfoStats() {
    if (!audioBuffer) return;
    const start = parseFloat(sliderStart.value);
    const end = parseFloat(sliderEnd.value);
    const count = parseInt(sliderCount.value);
    const crossfadeMs = parseInt(sliderCrossfade.value);
    const crossfadeSec = crossfadeMs / 1000;

    const loopDuration = end - start;
    lblLoopDuration.textContent = loopDuration.toFixed(2) + 's';

    // Calculate total duration: (LoopDuration * Count) - (Count - 1) * Crossfade
    const totalOutSec = Math.max(0.1, (loopDuration * count) - (count - 1) * crossfadeSec);
    lblTotalDuration.textContent = totalOutSec.toFixed(2) + 's (' + formatTime(totalOutSec) + ')';
  }

  // Visual Slider input triggers
  sliderStart.addEventListener('input', () => {
    let startVal = parseFloat(sliderStart.value);
    const endVal = parseFloat(sliderEnd.value);
    
    if (startVal >= endVal) {
      startVal = Math.max(0, endVal - 0.1);
      sliderStart.value = startVal;
    }
    valStart.textContent = startVal.toFixed(2);
    
    const pct = (startVal / audioBuffer.duration) * 100;
    shadeLeft.style.width = pct + '%';
    
    updateInfoStats();
    if (isPlaying) stopPreview();
  });

  sliderEnd.addEventListener('input', () => {
    const startVal = parseFloat(sliderStart.value);
    let endVal = parseFloat(sliderEnd.value);
    
    if (endVal <= startVal) {
      endVal = Math.min(audioBuffer.duration, startVal + 0.1);
      sliderEnd.value = endVal;
    }
    valEnd.textContent = endVal.toFixed(2);
    
    const pct = (endVal / audioBuffer.duration) * 100;
    shadeRight.style.left = pct + '%';
    
    updateInfoStats();
    if (isPlaying) stopPreview();
  });

  // Sync Loop counts
  sliderCount.addEventListener('input', () => { numCount.value = sliderCount.value; updateInfoStats(); });
  numCount.addEventListener('input', () => { sliderCount.value = numCount.value; updateInfoStats(); });
  sliderCrossfade.addEventListener('input', () => { valCrossfade.textContent = sliderCrossfade.value; updateInfoStats(); });

  btnReset.addEventListener('click', () => {
    if (isPlaying) stopPreview();
    sliderStart.value = 0;
    sliderStart.dispatchEvent(new Event('input'));
    sliderEnd.value = audioBuffer ? audioBuffer.duration : 0;
    sliderEnd.dispatchEvent(new Event('input'));
    sliderCount.value = 4;
    numCount.value = 4;
    sliderCrossfade.value = 50;
    valCrossfade.textContent = "50";
    updateInfoStats();
  });

  btnLoopAnother.addEventListener('click', () => {
    if (isPlaying) stopPreview();
    activeFile = null;
    audioBuffer = null;
    fileInput.value = '';
    step2Section.classList.add('hidden');
    step1Section.classList.remove('hidden');
    downloadCard.classList.add('hidden');
  });

  // Playback Preview handlers
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
    
    const start = parseFloat(sliderStart.value);
    const end = parseFloat(sliderEnd.value);
    
    activeSourceNode = audioContext.createBufferSource();
    activeSourceNode.buffer = audioBuffer;
    activeSourceNode.connect(audioContext.destination);
    
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    
    playbackStartTime = audioContext.currentTime - pausedAt;
    activeSourceNode.start(0, start + pausedAt, end - start - pausedAt);
    
    activeSourceNode.onended = () => {
      if (isPlaying) {
        stopPreview();
      }
    };

    // Tracking bar
    playbackInterval = setInterval(() => {
      const elapsed = audioContext.currentTime - playbackStartTime;
      const currentPos = start + elapsed;
      if (currentPos >= end) {
        stopPreview();
      } else {
        labelCurrentTime.textContent = formatTime(currentPos);
        const progressPct = (currentPos / audioBuffer.duration) * 100;
        progressBarTime.style.width = progressPct + '%';
      }
    }, 50);
  }

  function pausePreview() {
    if (!isPlaying) return;
    pausedAt += audioContext.currentTime - playbackStartTime;
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
    labelCurrentTime.textContent = formatTime(parseFloat(sliderStart.value));
    progressBarTime.style.width = (parseFloat(sliderStart.value) / audioBuffer.duration * 100) + '%';
  }

  function stopSource() {
    if (activeSourceNode) {
      try {
        activeSourceNode.stop();
      } catch (e) {}
      activeSourceNode = null;
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

  // Create Loop & Export Timeline
  btnLoop.addEventListener('click', async () => {
    if (!audioBuffer) return;
    if (isPlaying) stopPreview();

    btnLoop.disabled = true;
    step2Section.classList.add('hidden');
    processingCard.classList.remove('hidden');
    progressBar.style.width = '15%';
    statusEl.textContent = 'Preparing loop segments...';

    try {
      const start = parseFloat(sliderStart.value);
      const end = parseFloat(sliderEnd.value);
      const count = parseInt(sliderCount.value);
      const crossfadeMs = parseInt(sliderCrossfade.value);
      const crossfadeSec = crossfadeMs / 1000;
      
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      const loopDuration = end - start;

      // Extract original segment buffer representing LoopStart to LoopEnd
      const segmentSamples = Math.floor(loopDuration * sampleRate);
      const segmentBuffer = audioContext.createBuffer(channels, segmentSamples, sampleRate);
      
      const startSampleIndex = Math.floor(start * sampleRate);
      for (let c = 0; c < channels; c++) {
        const src = audioBuffer.getChannelData(c);
        const dst = segmentBuffer.getChannelData(c);
        for (let s = 0; s < segmentSamples; s++) {
          if (startSampleIndex + s < src.length) {
            dst[s] = src[startSampleIndex + s];
          }
        }
      }

      progressBar.style.width = '40%';
      statusEl.textContent = 'Scheduling loop overlays...';

      // Output length calculation: TotalDuration in samples
      const totalOutSec = (loopDuration * count) - (count - 1) * crossfadeSec;
      const totalOutSamples = Math.floor(totalOutSec * sampleRate);

      const offlineCtx = new OfflineAudioContext(channels, totalOutSamples, sampleRate);

      // Add segment source repetitions into timeline
      for (let i = 0; i < count; i++) {
        const srcNode = offlineCtx.createBufferSource();
        srcNode.buffer = segmentBuffer;
        
        const gainNode = offlineCtx.createGain();
        
        // Time offset position for this loop index
        const tStart = i * (loopDuration - crossfadeSec);
        const tEnd = tStart + loopDuration;

        // Apply gain schedules for linear crossfading
        if (crossfadeSec > 0 && count > 1) {
          // Fade IN (overlaying previous loop fadeout)
          if (i > 0) {
            gainNode.gain.setValueAtTime(0, tStart);
            gainNode.gain.linearRampToValueAtTime(1, tStart + crossfadeSec);
          } else {
            gainNode.gain.setValueAtTime(1, tStart);
          }
          
          // Fade OUT (overlaying next loop fadein)
          if (i < count - 1) {
            gainNode.gain.setValueAtTime(1, tEnd - crossfadeSec);
            gainNode.gain.linearRampToValueAtTime(0, tEnd);
          }
        } else {
          gainNode.gain.setValueAtTime(1, tStart);
        }

        srcNode.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        srcNode.start(tStart);
      }

      progressBar.style.width = '75%';
      statusEl.textContent = 'Stretching loop overlays...';

      const masterBuffer = await offlineCtx.startRendering();
      progressBar.style.width = '90%';
      statusEl.textContent = 'Compiling output master...';

      const wavBlob = bufferToWav(masterBuffer);
      const url = URL.createObjectURL(wavBlob);

      progressBar.style.width = '100%';
      await new Promise(r => setTimeout(r, 200));

      downloadLink.href = url;
      const baseName = activeFile.name.replace(/\.[^/.]+$/, '');
      downloadLink.download = `${baseName}_looped.mp3`;

      downloadFileSize.textContent = (wavBlob.size / (1024 * 1024)).toFixed(2) + ' MB';

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'audio-looper' })
      });

      processingCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');
      btnLoop.disabled = false;

    } catch (err) {
      console.error(err);
      processingCard.classList.add('hidden');
      step2Section.classList.remove('hidden');
      btnLoop.disabled = false;
      alert('Looper failed: ' + err.message);
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

  // Test hook for automated environments
  if (new URLSearchParams(window.location.search).get('test') === 'true') {
    fetch('/test.wav')
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], 'test.wav', { type: 'audio/wav' });
        handleFile(file);
      })
      .catch(err => console.error('Failed to load test file in automation:', err));
  }
})();
