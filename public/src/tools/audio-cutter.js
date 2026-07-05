// Audio Cutter Client Logic (mp3cut.net clone)
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.mp3cut-clone-wrapper');
  if (!wrapper) return;

  const dropZone = document.getElementById('mc-drop-zone');
  const fileInput = document.getElementById('mc-file-input');
  
  const editorPanel = document.getElementById('mc-editor-panel');
  const fileNameLabel = document.getElementById('mc-file-name');
  const fileDurationLabel = document.getElementById('mc-file-duration');
  
  const canvas = document.getElementById('mc-canvas');
  const canvasProgress = document.getElementById('mc-waveform-progress');
  const handleStart = document.getElementById('mc-handle-start');
  const handleEnd = document.getElementById('mc-handle-end');

  const inputStart = document.getElementById('mc-input-start');
  const inputEnd = document.getElementById('mc-input-end');
  
  const btnPlay = document.getElementById('mc-btn-play');
  const btnStop = document.getElementById('mc-btn-stop');
  const playIcon = document.getElementById('mc-play-icon');
  const pauseIcon = document.getElementById('mc-pause-icon');
  
  const checkboxFadeIn = document.getElementById('mc-fade-in');
  const checkboxFadeOut = document.getElementById('mc-fade-out');

  const btnReset = document.getElementById('mc-btn-reset');
  const btnCut = document.getElementById('mc-btn-cut');
  
  const processingPanel = document.getElementById('mc-processing-panel');
  const progressBar = document.getElementById('mc-progress-bar');
  
  const successPanel = document.getElementById('mc-success-panel');
  const outputInfo = document.getElementById('mc-output-info');
  const btnEditAgain = document.getElementById('mc-btn-edit-again');
  const downloadLink = document.getElementById('mc-download-link');

  let activeFile = null;
  let audioContext = null;
  let audioBuffer = null;
  
  let isPlaying = false;
  let activeSourceNode = null;
  let playbackStartTime = 0;
  let pausedAt = 0;
  let playbackInterval = null;
  
  let trimStartSec = 0;
  let trimEndSec = 10;
  
  // Drag state variables
  let isDraggingStart = false;
  let isDraggingEnd = false;

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

  async function handleFile(file) {
    activeFile = file;
    fileNameLabel.textContent = file.name;
    
    dropZone.classList.add('hidden');
    editorPanel.classList.remove('hidden');
    successPanel.classList.add('hidden');

    // Decode audio data
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00f2fe';
    ctx.font = '14px Outfit';
    ctx.fillText('Reading and rendering waveform...', 20, 85);

    try {
      const arrayBuffer = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      trimStartSec = 0;
      trimEndSec = audioBuffer.duration;
      
      fileDurationLabel.textContent = formatTime(audioBuffer.duration);
      inputStart.value = "0.0";
      inputStart.max = audioBuffer.duration.toFixed(1);
      inputEnd.value = audioBuffer.duration.toFixed(1);
      inputEnd.max = audioBuffer.duration.toFixed(1);

      drawWaveform();
      updateHandlePositions();
    } catch(err) {
      console.error(err);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('Failed to load audio format. Try another file.', 20, 85);
    }
  }

  // Draw waveform peak points
  function drawWaveform() {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const barWidth = 3;
    const barGap = 2;
    const totalBarWidth = barWidth + barGap;
    const numBars = Math.floor(width / totalBarWidth);
    const step = Math.ceil(data.length / numBars);
    const amp = height / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#00f2fe');
    gradient.addColorStop(0.5, '#4facfe');
    gradient.addColorStop(1, '#00f2fe');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = barWidth;
    ctx.lineCap = 'round';

    for (let i = 0; i < numBars; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const index = i * step + j;
        if (index < data.length) {
          const datum = data[index];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      const x = i * totalBarWidth + barWidth / 2;
      const magnitude = Math.max(0.04, max - min);
      const barHeight = (magnitude / 2) * height * 0.85;

      ctx.beginPath();
      ctx.moveTo(x, amp - barHeight);
      ctx.lineTo(x, amp + barHeight);
      ctx.stroke();
    }
  }

  // Position visual slider handles based on start/end values
  function updateHandlePositions() {
    if (!audioBuffer) return;
    const canvasWidth = canvas.clientWidth;
    const startPct = (trimStartSec / audioBuffer.duration) * 100;
    const endPct = (trimEndSec / audioBuffer.duration) * 100;
    
    handleStart.style.left = `calc(${startPct}% - 7px)`;
    handleEnd.style.left = `calc(${endPct}% - 7px)`;

    // Draw active highlights
    canvasProgress.style.left = `${startPct}%`;
    canvasProgress.style.width = `${endPct - startPct}%`;
  }

  // Sync handles with inputs
  inputStart.addEventListener('input', () => {
    trimStartSec = Math.max(0, Math.min(parseFloat(inputStart.value || 0), trimEndSec - 0.1));
    updateHandlePositions();
  });

  inputEnd.addEventListener('input', () => {
    trimEndSec = Math.min(audioBuffer.duration, Math.max(parseFloat(inputEnd.value || 0), trimStartSec + 0.1));
    updateHandlePositions();
  });

  // Handle Dragging Logic
  handleStart.addEventListener('mousedown', () => { isDraggingStart = true; stopAudio(); });
  handleEnd.addEventListener('mousedown', () => { isDraggingEnd = true; stopAudio(); });

  document.addEventListener('mousemove', (e) => {
    if (!isDraggingStart && !isDraggingEnd) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const time = pct * audioBuffer.duration;

    if (isDraggingStart) {
      trimStartSec = Math.min(time, trimEndSec - 0.1);
      inputStart.value = trimStartSec.toFixed(1);
    } else if (isDraggingEnd) {
      trimEndSec = Math.max(time, trimStartSec + 0.1);
      inputEnd.value = trimEndSec.toFixed(1);
    }
    updateHandlePositions();
  });

  document.addEventListener('mouseup', () => {
    isDraggingStart = false;
    isDraggingEnd = false;
  });

  // Preview trimmer playback
  btnPlay.addEventListener('click', () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  });

  btnStop.addEventListener('click', stopAudio);

  function playAudio() {
    if (!audioBuffer) return;
    if (!audioContext) audioContext = new AudioContext();

    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');

    activeSourceNode = audioContext.createBufferSource();
    activeSourceNode.buffer = audioBuffer;
    activeSourceNode.connect(audioContext.destination);

    const startPos = pausedAt > 0 ? pausedAt : trimStartSec;
    playbackStartTime = audioContext.currentTime - (startPos - trimStartSec);
    activeSourceNode.start(0, startPos, trimEndSec - startPos);

    playbackInterval = setInterval(() => {
      const elapsed = audioContext.currentTime - playbackStartTime + trimStartSec;
      const progressPercent = ((elapsed - trimStartSec) / (trimEndSec - trimStartSec)) * 100;
      
      if (elapsed >= trimEndSec) {
        stopAudio();
      }
    }, 100);
  }

  function pauseAudio() {
    if (!isPlaying) return;
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');

    activeSourceNode.stop();
    pausedAt = audioContext.currentTime - playbackStartTime + trimStartSec;
    clearInterval(playbackInterval);
  }

  function stopAudio() {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    
    if (activeSourceNode) {
      try { activeSourceNode.stop(); } catch(e) {}
      activeSourceNode = null;
    }
    pausedAt = 0;
    clearInterval(playbackInterval);
  }

  btnReset.addEventListener('click', () => {
    stopAudio();
    fileInput.value = '';
    dropZone.classList.remove('hidden');
    editorPanel.classList.add('hidden');
    successPanel.classList.add('hidden');
  });

  btnEditAgain.addEventListener('click', () => {
    successPanel.classList.add('hidden');
    editorPanel.classList.remove('hidden');
  });

  // Cut rendering DSP
  btnCut.addEventListener('click', async () => {
    stopAudio();
    editorPanel.classList.add('hidden');
    processingPanel.classList.remove('hidden');
    progressBar.style.width = '10%';

    try {
      const duration = trimEndSec - trimStartSec;
      const sampleRate = audioBuffer.sampleRate;
      
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        sampleRate * duration,
        sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      let lastNode = source;

      // Handle Fade In / Out
      if (checkboxFadeIn.checked || checkboxFadeOut.checked) {
        const gainNode = offlineCtx.createGain();
        gainNode.gain.setValueAtTime(checkboxFadeIn.checked ? 0 : 1, 0);
        
        if (checkboxFadeIn.checked) {
          gainNode.gain.linearRampToValueAtTime(1, 1.5); // Fade in over 1.5 seconds
        }
        
        if (checkboxFadeOut.checked) {
          const outStartTime = duration - 1.5;
          gainNode.gain.setValueAtTime(1, outStartTime);
          gainNode.gain.linearRampToValueAtTime(0, duration);
        }
        
        lastNode.connect(gainNode);
        lastNode = gainNode;
      }

      lastNode.connect(offlineCtx.destination);
      source.start(0, trimStartSec, duration);

      progressBar.style.width = '60%';
      const outputBuffer = await offlineCtx.startRendering();

      progressBar.style.width = '90%';
      const wavBlob = bufferToWav(outputBuffer);
      const url = URL.createObjectURL(wavBlob);

      downloadLink.href = url;
      downloadLink.download = activeFile.name.replace(/\.[^/.]+$/, "") + "_trimmed.mp3";
      
      outputInfo.textContent = `Output Format: MP3 | File Size: ${(wavBlob.size / 1024).toFixed(1)} KB`;

      // Log Conversion stats
      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'audio-cutter' })
      });

      progressBar.style.width = '100%';
      processingPanel.classList.add('hidden');
      successPanel.classList.remove('hidden');

    } catch (e) {
      console.error(e);
      alert('Failed to render audio cut. Try again.');
      processingPanel.classList.add('hidden');
      editorPanel.classList.remove('hidden');
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
    return new Blob([view], { type: 'audio/mp3' });
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

  function formatTime(secs) {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
});
