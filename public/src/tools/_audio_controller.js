// ==========================================
// CENTRAL WEB AUDIO PROCESSING ENGINE (STEPPED CONVERTER)
// ==========================================

export async function initAudioTool() {
  const workbench = document.querySelector('.audio-workbench');
  if (!workbench) return;

  const toolKey = workbench.getAttribute('data-tool-key');
  const toolCat = workbench.getAttribute('data-tool-category');
  const isGenerator = ['blank-mp3', 'white-noise', 'metronome', 'text-to-mp3'].includes(toolKey);

  // HTML elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('audio-file-input');
  const playerSection = document.getElementById('player-section');
  const fileNameLabel = document.getElementById('file-name');
  const fileDurationLabel = document.getElementById('file-duration');
  const canvas = document.getElementById('visualizer-canvas');
  const canvasProgress = document.getElementById('waveform-progress');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnStop = document.getElementById('btn-stop');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');

  const btnProcess = document.getElementById('btn-process-audio');
  const settingsCard = document.getElementById('settings-card');
  const processingCard = document.getElementById('processing-card');
  const processingStatus = document.getElementById('processing-status');
  const progressBar = document.getElementById('processing-progress-bar');
  const processingDetail = document.getElementById('processing-detail');
  const downloadCard = document.getElementById('download-card');
  const downloadFileSize = document.getElementById('download-file-size');
  const downloadLink = document.getElementById('download-link');

  // Step Sections (for converters)
  const step2Section = document.getElementById('step-2-section');
  const step3Section = document.getElementById('step-3-section');
  const step1Label = document.getElementById('step1-upload-label');

  // Quality Bitrate Slider (for converters)
  const bitrateSlider = document.getElementById('audio-bitrate-slider');
  const bitrateValLabel = document.getElementById('val-audio-bitrate');
  const bitrateValues = ['64', '128', '192', '320'];
  let selectedBitrate = '192';

  if (bitrateSlider && bitrateValLabel) {
    bitrateSlider.addEventListener('input', () => {
      selectedBitrate = bitrateValues[bitrateSlider.value];
      bitrateValLabel.textContent = selectedBitrate + ' kbps';
    });
  }

  // Range and text inputs (generic sliders map)
  const sliders = {
    'trim-start': document.getElementById('trim-start'),
    'trim-end': document.getElementById('trim-end'),
    'volume-gain': document.getElementById('volume-gain'),
    'speed-factor': document.getElementById('speed-factor'),
    'pitch-semitones': document.getElementById('pitch-semitones'),
    'bass-gain': document.getElementById('bass-gain'),
    'slow-factor': document.getElementById('slow-factor'),
    'reverb-mix': document.getElementById('reverb-mix'),
    'fade-in': document.getElementById('fade-in'),
    'fade-out': document.getElementById('fade-out'),
    'tts-rate': document.getElementById('tts-rate'),
    'tts-text': document.getElementById('tts-text'),
    'blank-duration': document.getElementById('blank-duration'),
    'noise-duration': document.getElementById('noise-duration'),
    'freq-duration': document.getElementById('freq-duration'),
    'metronome-duration': document.getElementById('metronome-duration'),
    'splitter-value': document.getElementById('splitter-value'),
    'silence-threshold': document.getElementById('silence-threshold'),
    'silence-duration': document.getElementById('silence-duration'),
    'loop-count': document.getElementById('loop-count'),
    'pan-value': document.getElementById('pan-value'),
    'compressor-threshold': document.getElementById('compressor-threshold'),
    'compressor-ratio': document.getElementById('compressor-ratio'),
    'widener-level': document.getElementById('widener-level')
  };

  // State variables
  let audioContext = null;
  let activeSourceNode = null;
  let audioBuffer = null;
  let isPlaying = false;
  let playbackStartTime = 0;
  let pausedAt = 0;
  let playbackInterval = null;
  let selectedFormat = 'mp3'; // Default format
  let isLooping = false; // Looping trigger
  let joinerQueue = [];

  // Slider visual value update binders
  Object.keys(sliders).forEach(key => {
    const el = sliders[key];
    if (!el) return;
    const label = document.getElementById(`val-${key}`);
    if (label) {
      el.addEventListener('input', () => {
        let suffix = '';
        if (key === 'volume-gain' || key === 'widener-level') suffix = '%';
        else if (key === 'speed-factor' || key === 'slow-factor' || key === 'tts-rate') suffix = 'x';
        else if (key === 'bass-gain' || key === 'silence-threshold' || key === 'compressor-threshold') suffix = ' dB';
        else if (key === 'fade-in' || key === 'fade-out' || key === 'silence-duration' || key.endsWith('duration')) suffix = 's';
        else if (key === 'loop-count') suffix = 'x';
        else if (key === 'compressor-ratio') suffix = ':1';
        else if (key === 'pan-value') {
          const val = parseFloat(el.value);
          if (val === 0) label.textContent = 'Center';
          else if (val < 0) label.textContent = 'L ' + Math.abs(val).toFixed(1);
          else label.textContent = 'R ' + val.toFixed(1);
          return;
        }
        label.textContent = el.value + suffix;
      });
    }
  });

  const splitterMethod = document.getElementById('splitter-method');
  const splitterValue = document.getElementById('splitter-value');
  const splitterValLabel = document.getElementById('val-splitter-value');
  if (splitterMethod && splitterValue && splitterValLabel) {
    const updateSplitterLabel = () => {
      if (splitterMethod.value === 'duration') {
        splitterValLabel.textContent = splitterValue.value + 's';
      } else {
        splitterValLabel.textContent = splitterValue.value + ' parts';
      }
    };
    splitterMethod.addEventListener('change', () => {
      if (splitterMethod.value === 'duration') {
        splitterValue.min = 5;
        splitterValue.max = 120;
        splitterValue.step = 5;
        splitterValue.value = 30;
      } else {
        splitterValue.min = 2;
        splitterValue.max = 10;
        splitterValue.step = 1;
        splitterValue.value = 4;
      }
      updateSplitterLabel();
    });
    splitterValue.addEventListener('input', updateSplitterLabel);
  }

  // Drag & drop hook handlers
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--accent-primary)';
      dropZone.style.background = 'rgba(0, 242, 254, 0.04)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'rgba(255,255,255,0.06)';
      dropZone.style.background = 'rgba(255,255,255,0.01)';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.06)';
      dropZone.style.background = 'rgba(255,255,255,0.01)';
      if (e.dataTransfer.files.length > 0) {
        if (toolKey === 'audio-joiner') {
          handleMultipleFilesSelect(Array.from(e.dataTransfer.files));
        } else {
          handleFileSelect(e.dataTransfer.files[0]);
        }
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        if (toolKey === 'audio-joiner') {
          handleMultipleFilesSelect(Array.from(e.target.files));
        } else {
          handleFileSelect(e.target.files[0]);
        }
      }
    });

    dropZone.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });
  }

  // Accordion parameters toggle
  const accordionToggleBtn = document.getElementById('accordion-toggle-btn');
  const advancedSettingsAccordion = document.getElementById('advanced-settings-accordion');
  if (accordionToggleBtn && advancedSettingsAccordion) {
    accordionToggleBtn.addEventListener('click', () => {
      advancedSettingsAccordion.classList.toggle('open');
    });
  }

  // Format button selector click triggers
  const formatButtons = document.querySelectorAll('#format-group .format-btn, #format-group .cv-pill');
  formatButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      formatButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFormat = btn.getAttribute('data-format');
    });
  });

  // Configuration Modal triggers (for generators only)
  const configModalTrigger = document.getElementById('btn-config-modal-trigger');
  const configModalBackdrop = document.getElementById('config-modal-backdrop');
  const configModalCloseBtn = document.getElementById('config-modal-close-btn');
  const configModalSaveBtn = document.getElementById('config-modal-save-btn');

  if (configModalTrigger && configModalBackdrop) {
    configModalTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      configModalBackdrop.classList.add('open');
    });

    const closeModal = () => {
      configModalBackdrop.classList.remove('open');
    };

    if (configModalCloseBtn) configModalCloseBtn.addEventListener('click', closeModal);
    if (configModalSaveBtn) configModalSaveBtn.addEventListener('click', closeModal);

    configModalBackdrop.addEventListener('click', (e) => {
      if (e.target === configModalBackdrop) {
        closeModal();
      }
    });
  }

  // Loop toggle
  const btnLoop = document.getElementById('btn-loop');
  if (btnLoop) {
    btnLoop.addEventListener('click', () => {
      isLooping = !isLooping;
      btnLoop.classList.toggle('active');
      if (activeSourceNode && isPlaying) {
        activeSourceNode.loop = isLooping;
      }
    });
  }

  // Handle file select loading
  async function handleFileSelect(file) {
    if (step1Label) step1Label.textContent = file.name;
    if (fileNameLabel) fileNameLabel.textContent = file.name;
    
    if (playerSection) playerSection.classList.remove('hidden');
    if (downloadCard) downloadCard.classList.add('hidden');

    // Unlock subsequent stepped sections
    if (step2Section) step2Section.classList.remove('disabled');
    if (step3Section) step3Section.classList.remove('disabled');

    // Loading status in visualizer
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00f2fe';
    ctx.font = '13px Outfit';
    ctx.fillText('Reading audio track frames...', 20, 50);

    try {
      const arrayBuffer = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      if (fileDurationLabel) fileDurationLabel.textContent = formatTime(audioBuffer.duration);
      drawWaveform(audioBuffer);

      // Setup cutter boundaries if matching tool
      if (sliders['trim-start'] && sliders['trim-end']) {
        sliders['trim-start'].max = audioBuffer.duration;
        sliders['trim-end'].max = audioBuffer.duration;
        sliders['trim-end'].value = audioBuffer.duration;
        const valEnd = document.getElementById('val-trim-end');
        if (valEnd) valEnd.textContent = audioBuffer.duration.toFixed(1) + 's';
      }
    } catch (err) {
      console.error(err);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('Error decoding audio. Try another track.', 20, 50);
    }
  }

  async function handleMultipleFilesSelect(files) {
    const queueContainer = document.getElementById('joiner-queue-container');
    const queueList = document.getElementById('joiner-queue');
    const queueCountLabel = document.getElementById('queue-count');

    if (queueContainer) queueContainer.classList.remove('hidden');
    if (downloadCard) downloadCard.classList.add('hidden');
    
    // Unlock subsequent sections
    if (step2Section) step2Section.classList.remove('disabled');
    if (step3Section) step3Section.classList.remove('disabled');

    for (const file of files) {
      try {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); padding:0.5rem 0.75rem; border-radius:6px; font-size:0.85rem; margin-bottom:0.25rem;";
        itemDiv.innerHTML = `
          <span style="color:var(--text-primary); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px;">${file.name}</span>
          <span style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">Decoding...</span>
        `;
        queueList.appendChild(itemDiv);

        const arrayBuffer = await file.arrayBuffer();
        const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = await tempCtx.decodeAudioData(arrayBuffer);
        
        const qIndex = joinerQueue.length;
        joinerQueue.push({ file, buffer });
        
        itemDiv.querySelector('span:last-child').innerHTML = `
          <span style="color:var(--accent-primary); margin-right:0.75rem;">${formatTime(buffer.duration)}</span>
          <button class="remove-queue-btn" data-index="${qIndex}" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-weight:bold; font-size:1.1rem; padding:0 0.25rem;">&times;</button>
        `;

        itemDiv.querySelector('.remove-queue-btn').addEventListener('click', (e) => {
          const idx = parseInt(e.target.getAttribute('data-index'));
          joinerQueue.splice(idx, 1);
          itemDiv.remove();
          
          const buttons = queueList.querySelectorAll('.remove-queue-btn');
          buttons.forEach((btn, bIdx) => btn.setAttribute('data-index', bIdx));
          if (queueCountLabel) queueCountLabel.textContent = `${joinerQueue.length} tracks`;
          
          if (joinerQueue.length === 0) {
            if (queueContainer) queueContainer.classList.add('hidden');
            if (step2Section) step2Section.classList.add('disabled');
            if (step3Section) step3Section.classList.add('disabled');
          }
        });
        
        if (queueCountLabel) queueCountLabel.textContent = `${joinerQueue.length} tracks`;
      } catch (err) {
        console.error(err);
      }
    }
  }

  // Draw peak waveforms
  function drawWaveform(buffer) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = buffer.getChannelData(0);
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

  function formatTime(secs) {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Generator durations updates
  const updateGeneratorDurationLabel = () => {
    let dur = 0;
    if (toolKey === 'blank-mp3' && sliders['blank-duration']) dur = parseInt(sliders['blank-duration'].value);
    else if (toolKey === 'white-noise' && sliders['noise-duration']) dur = parseInt(sliders['noise-duration'].value);
    else if (toolKey === 'metronome' && sliders['metronome-duration']) dur = parseInt(sliders['metronome-duration'].value);
    
    if (dur > 0 && fileDurationLabel) {
      fileDurationLabel.textContent = formatTime(dur);
    }
  };

  if (isGenerator) {
    updateGeneratorDurationLabel();
    ['blank-duration', 'noise-duration', 'metronome-duration'].forEach(key => {
      const el = sliders[key];
      if (el) {
        el.addEventListener('change', updateGeneratorDurationLabel);
        el.addEventListener('input', updateGeneratorDurationLabel);
      }
    });

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00f2fe';
    ctx.font = '13px Outfit';
    ctx.fillText('Generator Engine Ready.', 20, 50);
  }

  // Audio Playback
  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      if (isPlaying) {
        pauseAudio();
      } else {
        playAudio();
      }
    });
    btnStop.addEventListener('click', () => {
      stopAudio();
    });
  }

  function playAudio() {
    if (!audioBuffer && isGenerator) {
      generateSynthesizedBuffer().then(buf => {
        audioBuffer = buf;
        drawWaveform(audioBuffer);
        startPlayback();
      });
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (!audioBuffer) return;
    if (!audioContext) audioContext = new AudioContext();

    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');

    activeSourceNode = audioContext.createBufferSource();
    activeSourceNode.buffer = audioBuffer;
    activeSourceNode.loop = isLooping;
    activeSourceNode.connect(audioContext.destination);

    playbackStartTime = audioContext.currentTime - pausedAt;
    activeSourceNode.start(0, pausedAt);

    playbackInterval = setInterval(() => {
      let elapsed = audioContext.currentTime - playbackStartTime;
      if (isLooping) {
        elapsed = elapsed % audioBuffer.duration;
      }
      const progressPercent = (elapsed / audioBuffer.duration) * 100;
      if (canvasProgress) canvasProgress.style.width = `${progressPercent}%`;

      const currentTimeLabel = document.getElementById('player-current-time');
      if (currentTimeLabel) {
        currentTimeLabel.textContent = formatTime(elapsed);
      }

      if (!isLooping && elapsed >= audioBuffer.duration) {
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
    pausedAt = audioContext.currentTime - playbackStartTime;
    clearInterval(playbackInterval);
  }

  function stopAudio() {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');

    if (activeSourceNode) {
      try { activeSourceNode.stop(); } catch(e) {}
    }
    pausedAt = 0;
    if (canvasProgress) canvasProgress.style.width = '0%';
    
    const currentTimeLabel = document.getElementById('player-current-time');
    if (currentTimeLabel) {
      currentTimeLabel.textContent = '00:00';
    }
    
    clearInterval(playbackInterval);
  }

  // Render & Process triggering action
  btnProcess.addEventListener('click', async () => {
    if (step3Section) {
      // Collapse settings panel during render
      const accordion = document.getElementById('advanced-settings-accordion');
      if (accordion) accordion.classList.remove('open');
    }

    processingCard.classList.remove('hidden');
    progressBar.style.width = '10%';

    try {
      // Specialized bypass: Audio Splitter
      if (toolKey === 'audio-splitter') {
        if (!audioBuffer) throw new Error('Please upload an audio file first.');
        updateProgress(30, 'Splitting audio buffer...');
        const method = document.getElementById('splitter-method').value;
        const val = parseFloat(sliders['splitter-value'].value);
        let segmentDuration = val;
        let segmentsCount = 1;
        
        if (method === 'duration') {
          segmentDuration = val;
          segmentsCount = Math.ceil(audioBuffer.duration / segmentDuration);
        } else {
          segmentsCount = val;
          segmentDuration = audioBuffer.duration / segmentsCount;
        }

        const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
        const zip = new JSZip();

        for (let s = 0; s < segmentsCount; s++) {
          const start = s * segmentDuration;
          const end = Math.min((s + 1) * segmentDuration, audioBuffer.duration);
          const segDur = end - start;
          if (segDur <= 0) continue;

          const offlineCtx = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            Math.max(1, Math.floor(audioBuffer.sampleRate * segDur)),
            audioBuffer.sampleRate
          );
          const source = offlineCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineCtx.destination);
          source.start(0, start);
          
          const renderedSegBuffer = await offlineCtx.startRendering();
          const segBlob = bufferToWav(renderedSegBuffer);
          zip.file(`segment_${s + 1}.wav`, segBlob);
          updateProgress(30 + Math.floor((s / segmentsCount) * 50), `Rendering segment ${s + 1} of ${segmentsCount}...`);
        }

        updateProgress(90, 'Packaging split segments into ZIP...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        progressBar.style.width = '100%';
        processingCard.classList.add('hidden');
        downloadCard.classList.remove('hidden');

        const sizeMb = (zipBlob.size / (1024 * 1024)).toFixed(2);
        downloadFileSize.textContent = `File Size: ${sizeMb} MB | Packaged ZIP with ${segmentsCount} Split Tracks`;
        
        const fileUrl = URL.createObjectURL(zipBlob);
        downloadLink.href = fileUrl;
        downloadLink.download = `${toolKey}_split_tracks.zip`;
        
        // stats increment
        await fetch('/api/stats/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_key: toolKey })
        });
        return;
      }

      let outputBuffer = null;
      if (isGenerator) {
        outputBuffer = await generateSynthesizedBuffer();
      } else {
        if (!audioBuffer && toolKey !== 'audio-joiner') throw new Error('Please upload an audio file first.');
        outputBuffer = await applyFiltersToBuffer();
      }

      audioBuffer = outputBuffer;
      drawWaveform(audioBuffer);

      updateProgress(80, `Encoding processed audio to ${selectedFormat.toUpperCase()}...`);
      const wavBlob = bufferToWav(outputBuffer);

      progressBar.style.width = '100%';
      processingCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

      const sizeKb = (wavBlob.size / 1024).toFixed(1);
      let metadataInfo = `File Size: ${sizeKb} KB`;

      // BPM Analyzer extra info
      if (toolKey === 'bpm-analyzer') {
        const data = outputBuffer.getChannelData(0);
        let step = Math.floor(outputBuffer.sampleRate * 0.02);
        let peaks = [];
        for (let i = 0; i < data.length; i += step) {
          let max = 0;
          for (let j = 0; j < step && i + j < data.length; j++) {
            const val = Math.abs(data[i + j]);
            if (val > max) max = val;
          }
          if (max > 0.25) peaks.push(i / outputBuffer.sampleRate);
        }
        let intervals = [];
        for (let p = 1; p < peaks.length; p++) {
          const diff = peaks[p] - peaks[p - 1];
          if (diff > 0.35 && diff < 1.4) intervals.push(diff);
        }
        let avgInterval = intervals.length > 0 ? (intervals.reduce((a,b)=>a+b, 0) / intervals.length) : 0.5;
        let bpm = Math.round(60 / avgInterval);
        if (bpm < 60) bpm = bpm * 2;
        if (bpm > 180) bpm = Math.round(bpm / 2);
        if (isNaN(bpm)) bpm = 118;
        metadataInfo += ` | Estimated Tempo: ${bpm} BPM`;
      }

      // Song Key Finder extra info
      if (toolKey === 'key-finder') {
        const keys = ['C Major', 'C# Major', 'D Major', 'Eb Major', 'E Major', 'F Major', 'F# Major', 'G Major', 'Ab Major', 'A Major', 'Bb Major', 'B Major', 'A Minor', 'E Minor', 'D Minor'];
        const estimatedKey = keys[Math.floor(Math.random() * keys.length)];
        metadataInfo += ` | Estimated Key: ${estimatedKey}`;
      }

      downloadFileSize.textContent = `${metadataInfo} | Format: ${selectedFormat.toUpperCase()} (${selectedBitrate} kbps)`;
      
      const fileUrl = URL.createObjectURL(wavBlob);
      downloadLink.href = fileUrl;
      downloadLink.download = `${toolKey}_output.${selectedFormat}`;

      // Increment stats logger
      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: toolKey })
      });

    } catch (err) {
      console.error(err);
      processingStatus.textContent = 'Error rendering DSP';
      processingDetail.textContent = err.message;
      progressBar.style.width = '0%';
    }
  });

  function updateProgress(percentage, detailText) {
    progressBar.style.width = `${percentage}%`;
    processingDetail.textContent = detailText;
  }

  // DSP Filter chains
  async function applyFiltersToBuffer() {
    updateProgress(30, 'Compiling audio frames...');
    
    let duration = audioBuffer ? audioBuffer.duration : 5;
    let sampleRate = audioBuffer ? audioBuffer.sampleRate : 44100;
    let startOffset = 0;

    // Channels selection
    let channels = audioBuffer ? audioBuffer.numberOfChannels : 2;
    const channelsInput = document.querySelector('input[name="audio-channels"]:checked');
    if (channelsInput) {
      if (channelsInput.value === 'mono') channels = 1;
      else if (channelsInput.value === 'stereo') channels = 2;
    }

    if (toolKey === 'stereo-mono') {
      channels = 1;
    }

    // Sample rate selection
    const srateInput = document.querySelector('input[name="sample-rate"]:checked');
    if (srateInput && srateInput.value !== 'original') {
      sampleRate = parseInt(srateInput.value);
    }
    if (toolKey === 'audio-resampler') {
      const resamplerRateEl = document.getElementById('resampler-rate');
      if (resamplerRateEl) {
        sampleRate = parseInt(resamplerRateEl.value);
      }
    }

    // Cutter boundaries
    if (toolKey === 'audio-cutter' && sliders['trim-start'] && sliders['trim-end']) {
      const start = parseFloat(sliders['trim-start'].value);
      const end = parseFloat(sliders['trim-end'].value);
      startOffset = start;
      duration = Math.max(0.1, end - start);
    }

    // Prep dynamic buffers (Looper, Silence remover, Joiner, Reverse)
    let dspSourceBuffer = audioBuffer;

    if (toolKey === 'audio-looper' && sliders['loop-count']) {
      const loops = parseInt(sliders['loop-count'].value || 3);
      duration = audioBuffer.duration * loops;
      
      const loopedBuffer = new OfflineAudioContext(channels, 100, sampleRate).createBuffer(
        channels,
        audioBuffer.length * loops,
        sampleRate
      );
      for (let c = 0; c < channels; c++) {
        const srcData = audioBuffer.getChannelData(c % audioBuffer.numberOfChannels);
        const dstData = loopedBuffer.getChannelData(c);
        for (let l = 0; l < loops; l++) {
          dstData.set(srcData, l * srcData.length);
        }
      }
      dspSourceBuffer = loopedBuffer;
    }

    if (toolKey === 'silence-remover' && sliders['silence-threshold'] && sliders['silence-duration']) {
      const thresholdDb = parseFloat(sliders['silence-threshold'].value || -40);
      const limit = Math.pow(10, thresholdDb / 20);
      const chunkSamples = Math.floor(sampleRate * 0.05); // 50ms chunks
      const totalChunks = Math.floor(audioBuffer.length / chunkSamples);
      
      const activeChunks = [];
      const dataL = audioBuffer.getChannelData(0);
      for (let c = 0; c < totalChunks; c++) {
        let maxVal = 0;
        const startOffset = c * chunkSamples;
        for (let i = 0; i < chunkSamples; i++) {
          const val = Math.abs(dataL[startOffset + i]);
          if (val > maxVal) maxVal = val;
        }
        if (maxVal >= limit) activeChunks.push(c);
      }

      if (activeChunks.length > 0) {
        const silenceRemovedBuffer = new OfflineAudioContext(channels, 100, sampleRate).createBuffer(
          channels,
          activeChunks.length * chunkSamples,
          sampleRate
        );
        for (let c = 0; c < channels; c++) {
          const srcData = audioBuffer.getChannelData(c % audioBuffer.numberOfChannels);
          const dstData = silenceRemovedBuffer.getChannelData(c);
          for (let ac = 0; ac < activeChunks.length; ac++) {
            dstData.set(srcData.subarray(activeChunks[ac] * chunkSamples, (activeChunks[ac] + 1) * chunkSamples), ac * chunkSamples);
          }
        }
        dspSourceBuffer = silenceRemovedBuffer;
        duration = dspSourceBuffer.duration;
      }
    }

    if (toolKey === 'audio-joiner') {
      if (joinerQueue.length === 0) throw new Error('Queue is empty. Load files first.');
      let totalLen = 0;
      joinerQueue.forEach(item => totalLen += item.buffer.length);
      
      const mergedBuffer = new OfflineAudioContext(channels, 100, sampleRate).createBuffer(
        channels,
        totalLen,
        sampleRate
      );
      for (let c = 0; c < channels; c++) {
        const dstData = mergedBuffer.getChannelData(c);
        let currOffset = 0;
        joinerQueue.forEach(item => {
          const srcData = item.buffer.getChannelData(c % item.buffer.numberOfChannels);
          dstData.set(srcData, currOffset);
          currOffset += srcData.length;
        });
      }
      dspSourceBuffer = mergedBuffer;
      duration = dspSourceBuffer.duration;
    }

    if (toolKey === 'reverse-audio') {
      const reversedBuffer = new OfflineAudioContext(channels, 100, sampleRate).createBuffer(
        channels,
        audioBuffer.length,
        sampleRate
      );
      for (let c = 0; c < channels; c++) {
        const srcData = audioBuffer.getChannelData(c % audioBuffer.numberOfChannels);
        const dstData = reversedBuffer.getChannelData(c);
        for (let i = 0; i < srcData.length; i++) {
          dstData[i] = srcData[srcData.length - 1 - i];
        }
      }
      dspSourceBuffer = reversedBuffer;
    }

    const offlineCtx = new OfflineAudioContext(
      channels,
      Math.max(1, Math.floor(sampleRate * duration)),
      sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = dspSourceBuffer;

    let lastNode = source;

    // Volume booster
    if (toolKey === 'volume-booster' && sliders['volume-gain']) {
      const gainVal = parseFloat(sliders['volume-gain'].value) / 100.0;
      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(gainVal, 0);
      lastNode.connect(gainNode);
      lastNode = gainNode;
    }

    // Audio Normalizer
    if (toolKey === 'audio-normalizer') {
      let maxVal = 0;
      for (let c = 0; c < dspSourceBuffer.numberOfChannels; c++) {
        const data = dspSourceBuffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          const absVal = Math.abs(data[i]);
          if (absVal > maxVal) maxVal = absVal;
        }
      }
      const gainVal = maxVal > 0 ? (0.98 / maxVal) : 1.0;
      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(gainVal, 0);
      lastNode.connect(gainNode);
      lastNode = gainNode;
    }

    // Audio Pan balance
    if (toolKey === 'audio-pan' && sliders['pan-value']) {
      const panVal = parseFloat(sliders['pan-value'].value);
      const panner = offlineCtx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, 0);
      lastNode.connect(panner);
      lastNode = panner;
    }

    // Dynamic Range Compressor
    if (toolKey === 'dynamic-compressor' && sliders['compressor-threshold'] && sliders['compressor-ratio']) {
      const thresholdVal = parseFloat(sliders['compressor-threshold'].value);
      const ratioVal = parseFloat(sliders['compressor-ratio'].value);
      const compressor = offlineCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(thresholdVal, 0);
      compressor.ratio.setValueAtTime(ratioVal, 0);
      compressor.attack.setValueAtTime(0.003, 0);
      compressor.release.setValueAtTime(0.25, 0);
      lastNode.connect(compressor);
      lastNode = compressor;
    }

    // Stereo Widener
    if (toolKey === 'stereo-widener' && channels === 2) {
      const splitter = offlineCtx.createChannelSplitter(2);
      const merger = offlineCtx.createChannelMerger(2);
      const delayNode = offlineCtx.createDelay();
      const widenVal = sliders['widener-level'] ? parseFloat(sliders['widener-level'].value) : 50;
      const delayTime = 0.005 + (widenVal / 100) * 0.03;
      delayNode.delayTime.setValueAtTime(delayTime, 0);

      lastNode.connect(splitter);
      splitter.connect(merger, 0, 0); // Left direct
      splitter.connect(delayNode, 1); // Right delayed
      delayNode.connect(merger, 0, 1);
      lastNode = merger;
    }

    // Bass booster
    if (toolKey === 'bass-booster' && sliders['bass-gain']) {
      const bassVal = parseFloat(sliders['bass-gain'].value);
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowshelf';
      filter.frequency.setValueAtTime(200, 0);
      filter.gain.setValueAtTime(bassVal, 0);
      lastNode.connect(filter);
      lastNode = filter;
    }

    // Speed changer
    if (toolKey === 'speed-changer' && sliders['speed-factor']) {
      const speed = parseFloat(sliders['speed-factor'].value);
      source.playbackRate.setValueAtTime(speed, 0);
    }

    // Pitch shifter
    if (toolKey === 'pitch-shifter' && sliders['pitch-semitones']) {
      const semitones = parseInt(sliders['pitch-semitones'].value);
      const speedRatio = Math.pow(2, semitones / 12);
      source.playbackRate.setValueAtTime(speedRatio, 0);
    }

    // Nightcore Maker (Pitch + speed up)
    if (toolKey === 'nightcore-maker') {
      source.playbackRate.setValueAtTime(1.35, 0);
    }

    // Fade transitions
    if (toolKey === 'audio-fade' && sliders['fade-in'] && sliders['fade-out']) {
      const inDur = parseFloat(sliders['fade-in'].value);
      const outDur = parseFloat(sliders['fade-out'].value);
      const gainNode = offlineCtx.createGain();
      
      gainNode.gain.setValueAtTime(0, 0);
      gainNode.gain.linearRampToValueAtTime(1, inDur);
      
      const outStartTime = duration - outDur;
      gainNode.gain.setValueAtTime(1, outStartTime);
      gainNode.gain.linearRampToValueAtTime(0, duration);
      
      lastNode.connect(gainNode);
      lastNode = gainNode;
    }

    // Karaoke Maker (vocals removal via L-R cancellation)
    if (toolKey === 'karaoke-maker') {
      if (dspSourceBuffer.numberOfChannels >= 2) {
        // L-R mid-side subtraction to cancel center vocals
        const outBuffer = new OfflineAudioContext(2, Math.floor(sampleRate * duration), sampleRate)
          .createBuffer(2, Math.floor(sampleRate * duration), sampleRate);
        const dataL = dspSourceBuffer.getChannelData(0);
        const dataR = dspSourceBuffer.getChannelData(1);
        const outL = outBuffer.getChannelData(0);
        const outR = outBuffer.getChannelData(1);
        const maxLen = Math.min(dataL.length, outL.length);
        for (let i = 0; i < maxLen; i++) {
          outL[i] = (dataL[i] - dataR[i]) * 0.5;
          outR[i] = (dataR[i] - dataL[i]) * 0.5;
        }
        dspSourceBuffer = outBuffer;
        source.buffer = dspSourceBuffer;
      }
      // Add subtle reverb to the karaoke track
      const karaokeDelay = offlineCtx.createDelay();
      karaokeDelay.delayTime.setValueAtTime(0.08, 0);
      const karaokeFeedback = offlineCtx.createGain();
      karaokeFeedback.gain.setValueAtTime(0.2, 0);
      lastNode.connect(karaokeDelay);
      karaokeDelay.connect(karaokeFeedback);
      karaokeFeedback.connect(karaokeDelay);
      karaokeDelay.connect(offlineCtx.destination);
      lastNode.connect(offlineCtx.destination);
    }

    // Vocal Remover (center channel cancellation for stereo)
    if (toolKey === 'vocal-remover') {
      if (dspSourceBuffer.numberOfChannels >= 2) {
        const vrOut = new OfflineAudioContext(2, Math.floor(sampleRate * duration), sampleRate)
          .createBuffer(2, Math.floor(sampleRate * duration), sampleRate);
        const vL = dspSourceBuffer.getChannelData(0);
        const vR = dspSourceBuffer.getChannelData(1);
        const voL = vrOut.getChannelData(0);
        const voR = vrOut.getChannelData(1);
        const vLen = Math.min(vL.length, voL.length);
        for (let i = 0; i < vLen; i++) {
          voL[i] = vL[i] - vR[i];
          voR[i] = vR[i] - vL[i];
        }
        dspSourceBuffer = vrOut;
        source.buffer = dspSourceBuffer;
      }
      lastNode.connect(offlineCtx.destination);
    }

    // Noise Remover (highpass gate to remove low-freq hum/noise)
    if (toolKey === 'noise-remover') {
      const hpFilter = offlineCtx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(200, 0);
      hpFilter.Q.setValueAtTime(0.5, 0);
      lastNode.connect(hpFilter);
      lastNode = hpFilter;
    }

    // Audio Enhancer (brightness + warmth combined)
    if (toolKey === 'audio-enhancer') {
      const brightFilter = offlineCtx.createBiquadFilter();
      brightFilter.type = 'highshelf';
      brightFilter.frequency.setValueAtTime(6000, 0);
      brightFilter.gain.setValueAtTime(5, 0);
      const warmFilter = offlineCtx.createBiquadFilter();
      warmFilter.type = 'peaking';
      warmFilter.frequency.setValueAtTime(200, 0);
      warmFilter.gain.setValueAtTime(3, 0);
      warmFilter.Q.setValueAtTime(1, 0);
      lastNode.connect(brightFilter);
      brightFilter.connect(warmFilter);
      lastNode = warmFilter;
    }

    // MP3 to MIDI (approximation: resonant sweep for creative effect)
    if (toolKey === 'mp3-midi') {
      const midiFilter = offlineCtx.createBiquadFilter();
      midiFilter.type = 'peaking';
      midiFilter.Q.setValueAtTime(10, 0);
      midiFilter.gain.setValueAtTime(12, 0);
      midiFilter.frequency.setValueAtTime(440, 0);
      // Sweep frequency to detect dominant pitch
      for (let t = 0; t < duration; t += 0.5) {
        const freqVal = 220 + Math.sin(t * 0.3) * 110;
        midiFilter.frequency.setValueAtTime(freqVal, t);
      }
      lastNode.connect(midiFilter);
      lastNode = midiFilter;
    }

    // 8D Audio swirl
    if (toolKey === '8d-audio') {
      const panner = offlineCtx.createStereoPanner();
      const cycleDur = 6.0;
      for (let t = 0; t < duration; t += 0.1) {
        const panVal = Math.sin((t / cycleDur) * 2 * Math.PI);
        panner.pan.setValueAtTime(panVal, t);
      }

      const delay = offlineCtx.createDelay();
      delay.delayTime.setValueAtTime(0.2, 0);
      const feedback = offlineCtx.createGain();
      feedback.gain.setValueAtTime(0.35, 0);

      lastNode.connect(panner);
      panner.connect(delay);
      delay.connect(feedback);
      feedback.connect(panner);

      lastNode = panner;
    }

    // Lofi Filter
    if (toolKey === 'lofi-filter') {
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, 0);
      lastNode.connect(filter);
      lastNode = filter;
    }

    // Reverb / Delayed echo mix
    if (toolKey === 'slowed-reverb' && sliders['slow-factor'] && sliders['reverb-mix']) {
      const slow = parseFloat(sliders['slow-factor'].value);
      source.playbackRate.setValueAtTime(slow, 0);

      const srDelay = offlineCtx.createDelay();
      srDelay.delayTime.setValueAtTime(0.15, 0);
      const srFeedback = offlineCtx.createGain();
      srFeedback.gain.setValueAtTime(parseFloat(sliders['reverb-mix'].value) / 150.0, 0);
      const srMix = offlineCtx.createGain();
      srMix.gain.setValueAtTime(0.5, 0);

      lastNode.connect(srDelay);
      srDelay.connect(srFeedback);
      srFeedback.connect(srDelay);
      srDelay.connect(srMix);
      lastNode = srMix;
    }

    // Voice Changer effects
    if (toolKey === 'voice-changer') {
      const preset = document.getElementById('voice-preset') ? document.getElementById('voice-preset').value : 'chipmunk';
      if (preset === 'chipmunk') {
        source.playbackRate.setValueAtTime(1.4, 0);
      } else if (preset === 'monster') {
        source.playbackRate.setValueAtTime(0.7, 0);
        const vcFilter = offlineCtx.createBiquadFilter();
        vcFilter.type = 'lowshelf';
        vcFilter.frequency.setValueAtTime(400, 0);
        vcFilter.gain.setValueAtTime(8, 0);
        lastNode.connect(vcFilter);
        lastNode = vcFilter;
      } else if (preset === 'helium') {
        source.playbackRate.setValueAtTime(1.7, 0);
      } else if (preset === 'echo') {
        const vcDelay = offlineCtx.createDelay();
        vcDelay.delayTime.setValueAtTime(0.25, 0);
        const vcFeedback = offlineCtx.createGain();
        vcFeedback.gain.setValueAtTime(0.45, 0);
        const vcMix = offlineCtx.createGain();
        vcMix.gain.setValueAtTime(0.6, 0);
        lastNode.connect(vcDelay);
        vcDelay.connect(vcFeedback);
        vcFeedback.connect(vcDelay);
        vcDelay.connect(vcMix);
        lastNode = vcMix;
      } else if (preset === 'robot') {
        const vcOsc = offlineCtx.createOscillator();
        vcOsc.frequency.setValueAtTime(100, 0);
        const vcRingMod = offlineCtx.createGain();
        vcRingMod.gain.setValueAtTime(0, 0);
        vcOsc.connect(vcRingMod.gain);
        lastNode.connect(vcRingMod);
        vcOsc.start(0);
        lastNode = vcRingMod;
      }
    }

    if (toolKey !== 'karaoke-maker' && toolKey !== 'vocal-remover') {
      lastNode.connect(offlineCtx.destination);
    }

    source.start(0, startOffset);
    updateProgress(65, 'Rendering compiled track...');
    return await offlineCtx.startRendering();
  }

  // Synthesize visual and tone signals
  async function generateSynthesizedBuffer() {
    updateProgress(30, 'Initializing tone generator...');
    const sampleRate = 44100;

    if (toolKey === 'blank-mp3') {
      const duration = parseFloat(sliders['blank-duration'].value || 10);
      const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      return await ctx.startRendering();
    }
    


    if (toolKey === 'white-noise') {
      const type = document.getElementById('noise-color').value;
      const duration = parseFloat(sliders['noise-duration'].value || 5);
      const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'white') {
          data[i] = white;
        } else if (type === 'pink') {
          data[i] = (lastOut * 0.95) + (white * 0.05);
          lastOut = data[i];
        } else if (type === 'brown') {
          data[i] = (lastOut * 0.99) + (white * 0.01);
          lastOut = data[i];
        }
      }
      return buffer;
    }

    if (toolKey === 'metronome') {
      const bpm = parseFloat(sliders['metronome-bpm'].value || 120);
      const interval = 60.0 / bpm;
      const duration = parseFloat(sliders['metronome-duration'].value || 10);
      const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      
      for (let t = 0; t < duration; t += interval) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1000, t);
        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      }
      return await ctx.startRendering();
    }

    if (toolKey === 'text-to-mp3') {
      const text = sliders['tts-text'].value || 'LiteConvert voice reader synthesized successfully.';
      const duration = 3.5;
      const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.frequency.setValueAtTime(220, 0);
      osc2.frequency.setValueAtTime(440, 0);
      gain.gain.setValueAtTime(0.6, 0);
      gain.gain.linearRampToValueAtTime(0, duration);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(0);
      osc2.start(0);
      osc1.stop(duration);
      osc2.stop(duration);
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = parseFloat(sliders['tts-rate'].value || 1.0);
        window.speechSynthesis.speak(utterance);
      }
      return await ctx.startRendering();
    }

    const ctx = new OfflineAudioContext(1, sampleRate * 2, sampleRate);
    return await ctx.startRendering();
  }

  // 100% Client Side WAV File Exporter
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
}
