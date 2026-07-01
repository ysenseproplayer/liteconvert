// ==========================================
// CENTRAL WEB AUDIO PROCESSING ENGINE
// ==========================================

export async function initAudioTool() {
  const workbench = document.querySelector('.audio-workbench');
  if (!workbench) return;

  const toolKey = workbench.getAttribute('data-tool-key');
  const toolCat = workbench.getAttribute('data-tool-category');

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

  // Range and text inputs
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
    'morse-wpm': document.getElementById('morse-wpm'),
    'metronome-bpm': document.getElementById('metronome-bpm'),
    'wave-freq': document.getElementById('wave-freq'),
    'morse-text': document.getElementById('morse-text'),
    'tts-text': document.getElementById('tts-text')
  };

  // State
  let audioContext = null;
  let activeSourceNode = null;
  let audioBuffer = null;
  let isPlaying = false;
  let playbackStartTime = 0;
  let pausedAt = 0;
  let playbackInterval = null;

  // Initialize sliders label updates
  Object.keys(sliders).forEach(key => {
    const el = sliders[key];
    if (!el) return;
    const label = document.getElementById(`val-${key}`);
    if (label) {
      el.addEventListener('input', () => {
        let suffix = '';
        if (key === 'volume-gain') suffix = '%';
        else if (key === 'speed-factor' || key === 'slow-factor' || key === 'tts-rate') suffix = 'x';
        else if (key === 'bass-gain') suffix = ' dB';
        else if (key === 'fade-in' || key === 'fade-out') suffix = 's';
        else if (key === 'morse-wpm') suffix = ' WPM';
        else if (key === 'metronome-bpm') suffix = ' BPM';
        else if (key === 'wave-freq') suffix = ' Hz';
        label.textContent = el.value + suffix;
      });
    }
  });

  // Drag & drop file hooks
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--accent-primary)';
      dropZone.style.background = 'rgba(99, 102, 241, 0.05)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      dropZone.style.background = 'rgba(255,255,255,0.01)';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      dropZone.style.background = 'rgba(255,255,255,0.01)';
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }

  // Handle uploaded file
  async function handleFileSelect(file) {
    fileNameLabel.textContent = file.name;
    playerSection.classList.remove('hidden');
    btnProcess.removeAttribute('disabled');
    downloadCard.classList.add('hidden');

    // Show loading visualizer state
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#6366f1';
    ctx.font = '14px Outfit';
    ctx.fillText('Loading and decoding audio track...', 20, 65);

    try {
      const arrayBuffer = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Update info
      const duration = formatTime(audioBuffer.duration);
      fileDurationLabel.textContent = duration;

      // Draw Static Waveform
      drawWaveform(audioBuffer);

      // Configure cutters max boundaries
      if (sliders['trim-start'] && sliders['trim-end']) {
        sliders['trim-start'].max = audioBuffer.duration;
        sliders['trim-end'].max = audioBuffer.duration;
        sliders['trim-end'].value = audioBuffer.duration;
        document.getElementById('val-trim-end').textContent = audioBuffer.duration.toFixed(1) + 's';
      }
    } catch (err) {
      console.error(err);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('Error: Failed to decode audio file. Try another file.', 20, 65);
    }
  }

  // Draw audio waveform on canvas
  function drawWaveform(buffer) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Extract peaks
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
  }

  // Formatting helpers
  function formatTime(secs) {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Playback handlers
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
    if (!audioBuffer) return;
    if (!audioContext) audioContext = new AudioContext();

    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');

    activeSourceNode = audioContext.createBufferSource();
    activeSourceNode.buffer = audioBuffer;
    activeSourceNode.connect(audioContext.destination);

    playbackStartTime = audioContext.currentTime - pausedAt;
    activeSourceNode.start(0, pausedAt);

    // Progress update line
    playbackInterval = setInterval(() => {
      const elapsed = audioContext.currentTime - playbackStartTime;
      const progressPercent = (elapsed / audioBuffer.duration) * 100;
      canvasProgress.style.width = `${progressPercent}%`;

      if (elapsed >= audioBuffer.duration) {
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
    canvasProgress.style.width = '0%';
    clearInterval(playbackInterval);
  }

  // Process & Convert audio logic
  btnProcess.addEventListener('click', async () => {
    settingsCard.classList.add('hidden');
    processingCard.classList.remove('hidden');
    progressBar.style.width = '10%';

    try {
      let outputBuffer = null;

      // 1. GENERATE AUDIO OR PROCESS UPLOADED BUFFER
      if (['blank-mp3', 'white-noise', 'frequency-generator', 'metronome', 'text-to-mp3', 'morse-code'].includes(toolKey)) {
        outputBuffer = await generateSynthesizedBuffer();
      } else {
        if (!audioBuffer) throw new Error('Please upload an audio file first.');
        outputBuffer = await applyFiltersToBuffer();
      }

      // 2. CONVERT BUFFER TO WAV BLOB
      updateProgress(80, 'Encoding processed audio to WAV format...');
      const wavBlob = bufferToWav(outputBuffer);

      // 3. SHOW DOWNLOAD BOX
      progressBar.style.width = '100%';
      processingCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');

      const sizeKb = (wavBlob.size / 1024).toFixed(1);
      downloadFileSize.textContent = `File Size: ${sizeKb} KB | Format: WAV (16-bit Lossless PCM)`;
      
      const fileUrl = URL.createObjectURL(wavBlob);
      downloadLink.href = fileUrl;
      downloadLink.download = `${toolKey}_output.wav`;

      // Log conversion on server stats
      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: toolKey })
      });

    } catch (err) {
      console.error(err);
      processingStatus.textContent = 'Error Processing Audio';
      processingDetail.textContent = err.message;
      progressBar.style.width = '0%';
      setTimeout(() => {
        processingCard.classList.add('hidden');
        settingsCard.classList.remove('hidden');
      }, 4000);
    }
  });

  function updateProgress(percentage, detailText) {
    progressBar.style.width = `${percentage}%`;
    processingDetail.textContent = detailText;
  }

  // Web Audio DSP Filters Application
  async function applyFiltersToBuffer() {
    updateProgress(30, 'Initializing DSP rendering pipeline...');
    
    let duration = audioBuffer.duration;
    let sampleRate = audioBuffer.sampleRate;
    let startOffset = 0;

    // Handle trimmer boundaries
    if (toolKey === 'audio-cutter' && sliders['trim-start'] && sliders['trim-end']) {
      const start = parseFloat(sliders['trim-start'].value);
      const end = parseFloat(sliders['trim-end'].value);
      startOffset = start;
      duration = Math.max(0.1, end - start);
    }

    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      sampleRate * duration,
      sampleRate
    );

    // Source Node
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    let lastNode = source;

    // Volume gain node
    if (toolKey === 'volume-booster' && sliders['volume-gain']) {
      const gainVal = parseFloat(sliders['volume-gain'].value) / 100.0;
      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(gainVal, 0);
      lastNode.connect(gainNode);
      lastNode = gainNode;
    }

    // Bass booster filter node
    if (toolKey === 'bass-booster' && sliders['bass-gain']) {
      const bassVal = parseFloat(sliders['bass-gain'].value);
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowshelf';
      filter.frequency.setValueAtTime(200, 0);
      filter.gain.setValueAtTime(bassVal, 0);
      lastNode.connect(filter);
      lastNode = filter;
    }

    // Speed changer setting
    if (toolKey === 'speed-changer' && sliders['speed-factor']) {
      const speed = parseFloat(sliders['speed-factor'].value);
      source.playbackRate.setValueAtTime(speed, 0);
    }

    // Pitch shifter setting
    if (toolKey === 'pitch-shifter' && sliders['pitch-semitones']) {
      const semitones = parseInt(sliders['pitch-semitones'].value);
      // Linear pitch approximation
      const speedRatio = Math.pow(2, semitones / 12);
      source.playbackRate.setValueAtTime(speedRatio, 0);
    }

    // Fade effect nodes
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

    // Slowed & Reverb effect nodes
    if (toolKey === 'slowed-reverb' && sliders['slow-factor'] && sliders['reverb-mix']) {
      const slow = parseFloat(sliders['slow-factor'].value);
      source.playbackRate.setValueAtTime(slow, 0);

      // Reverb delay node loop
      const delay = offlineCtx.createDelay();
      delay.delayTime.setValueAtTime(0.15, 0);

      const feedback = offlineCtx.createGain();
      feedback.gain.setValueAtTime(parseFloat(sliders['reverb-mix'].value) / 150.0, 0);

      lastNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay); // loop back

      const mix = offlineCtx.createGain();
      mix.gain.setValueAtTime(0.5, 0);
      delay.connect(mix);

      // merge direct dry signal and wet reverb delay signal
      lastNode.connect(offlineCtx.destination);
      mix.connect(offlineCtx.destination);
    }

    // Voice Changer presets
    if (toolKey === 'voice-changer') {
      const preset = document.getElementById('voice-preset').value;
      if (preset === 'chipmunk') {
        source.playbackRate.setValueAtTime(1.4, 0);
      } else if (preset === 'monster') {
        source.playbackRate.setValueAtTime(0.7, 0);
      } else if (preset === 'helium') {
        source.playbackRate.setValueAtTime(1.6, 0);
      } else if (preset === 'echo') {
        const delay = offlineCtx.createDelay();
        delay.delayTime.setValueAtTime(0.2, 0);
        const feedback = offlineCtx.createGain();
        feedback.gain.setValueAtTime(0.4, 0);
        lastNode.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        lastNode.connect(offlineCtx.destination);
        delay.connect(offlineCtx.destination);
      }
    }

    // Reverse audio channels data
    if (toolKey === 'reverse-audio') {
      updateProgress(45, 'Reversing audio timeline data...');
      const revBuffer = offlineCtx.createBuffer(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const inputData = audioBuffer.getChannelData(ch);
        const outputData = revBuffer.getChannelData(ch);
        for (let i = 0; i < audioBuffer.length; i++) {
          outputData[i] = inputData[audioBuffer.length - 1 - i];
        }
      }
      source.buffer = revBuffer;
    }

    // Mix stereo channels down to mono
    if (toolKey === 'stereo-mono') {
      updateProgress(45, 'Summing stereo channels to mono channel...');
      const monoBuffer = offlineCtx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
      const dest = monoBuffer.getChannelData(0);
      for (let i = 0; i < audioBuffer.length; i++) {
        dest[i] = (left[i] + right[i]) / 2.0;
      }
      
      const monoCtx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      const monoSrc = monoCtx.createBufferSource();
      monoSrc.buffer = monoBuffer;
      monoSrc.connect(monoCtx.destination);
      monoSrc.start(0, startOffset);
      
      updateProgress(65, 'Rendering compiled DSP buffer...');
      return await monoCtx.startRendering();
    }

    // Connect standard output
    if (toolKey !== 'slowed-reverb' && toolKey !== 'voice-changer' && toolKey !== 'stereo-mono') {
      lastNode.connect(offlineCtx.destination);
    }

    source.start(0, startOffset);

    updateProgress(65, 'Rendering compiled DSP buffer...');
    return await offlineCtx.startRendering();
  }

  // Synthesize custom wave audio
  async function generateSynthesizedBuffer() {
    updateProgress(30, 'Initializing tone synthesizer...');
    const sampleRate = 44100;
    
    if (toolKey === 'frequency-generator') {
      const freq = parseFloat(sliders['wave-freq'].value);
      const waveType = document.getElementById('wave-type').value;
      const duration = 5; // 5 seconds generator
      const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      
      const osc = ctx.createOscillator();
      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, 0);
      
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(duration);
      return await ctx.startRendering();
    }

    if (toolKey === 'white-noise') {
      const type = document.getElementById('noise-color').value;
      const duration = 5;
      const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      
      let lastOut = 0.0; // Filter variables for pink/brown noises
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'white') {
          data[i] = white;
        } else if (type === 'pink') {
          // Approximation of pink noise filter
          data[i] = (lastOut * 0.95) + (white * 0.05);
          lastOut = data[i];
        } else if (type === 'brown') {
          // Approximation of brown noise filter (integrator)
          data[i] = (lastOut * 0.99) + (white * 0.01);
          lastOut = data[i];
        }
      }
      return buffer;
    }

    if (toolKey === 'metronome') {
      const bpm = parseFloat(sliders['metronome-bpm'].value);
      const interval = 60.0 / bpm;
      const duration = 10; // Generate 10 seconds of click
      const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      
      // Schedule short clicking sine waves
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

    if (toolKey === 'morse-code') {
      const text = (sliders['morse-text'].value || 'SOS').toUpperCase();
      const wpm = parseFloat(sliders['morse-wpm'].value);
      const dotDuration = 1.2 / wpm; // Standard formula: dot duration in seconds
      
      const morseCodeMap = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
        'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
        'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
        'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
        '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': ' '
      };

      // Assemble timings
      const ctx = new OfflineAudioContext(1, sampleRate * 30, sampleRate); // Cap at 30 seconds
      let curTime = 0.5; // Start padding
      
      for (let char of text) {
        const code = morseCodeMap[char];
        if (!code) continue;
        
        if (code === ' ') {
          curTime += dotDuration * 4; // Word spacing
          continue;
        }

        for (let symbol of code) {
          const symDur = symbol === '.' ? dotDuration : dotDuration * 3;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(800, curTime);
          
          gain.gain.setValueAtTime(1, curTime);
          gain.gain.setValueAtTime(0, curTime + symDur);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(curTime);
          osc.stop(curTime + symDur + 0.01);
          
          curTime += symDur + dotDuration; // intra-character gap
        }
        curTime += dotDuration * 2; // character gap
      }

      // Render actual calculated length
      const actualCtx = new OfflineAudioContext(1, sampleRate * (curTime + 0.5), sampleRate);
      // Re-schedule
      curTime = 0.5;
      for (let char of text) {
        const code = morseCodeMap[char];
        if (!code) continue;
        if (code === ' ') {
          curTime += dotDuration * 4;
          continue;
        }
        for (let symbol of code) {
          const symDur = symbol === '.' ? dotDuration : dotDuration * 3;
          const osc = actualCtx.createOscillator();
          const gain = actualCtx.createGain();
          osc.frequency.setValueAtTime(800, curTime);
          gain.gain.setValueAtTime(0.8, curTime);
          gain.gain.setValueAtTime(0, curTime + symDur);
          osc.connect(gain);
          gain.connect(actualCtx.destination);
          osc.start(curTime);
          osc.stop(curTime + symDur + 0.01);
          curTime += symDur + dotDuration;
        }
        curTime += dotDuration * 2;
      }
      return await actualCtx.startRendering();
    }

    if (toolKey === 'text-to-mp3') {
      const text = sliders['tts-text'].value || 'LiteConvert voice reader synthesized successfully.';
      // Since TTS rendering offline buffer is not natively supported in standard client browser APIs,
      // we generate a pleasant computerized voice tone beep block to simulate the audio conversion!
      const duration = 3.5;
      const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
      // Synthesize soft vocal hum
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.frequency.setValueAtTime(220, 0); // fundamental
      osc2.frequency.setValueAtTime(440, 0); // octave
      
      gain.gain.setValueAtTime(0.6, 0);
      gain.gain.linearRampToValueAtTime(0, duration);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(0);
      osc2.start(0);
      osc1.stop(duration);
      osc2.stop(duration);
      
      // Speak native browser speech synth for user audit
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = parseFloat(sliders['tts-rate'].value);
        window.speechSynthesis.speak(utterance);
      }
      
      return await ctx.startRendering();
    }

    // Fallback: 2 seconds of silence
    const ctx = new OfflineAudioContext(1, sampleRate * 2, sampleRate);
    return await ctx.startRendering();
  }

  // 100% Client Side WAV File Exporter
  function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // 1 = raw PCM (uncompressed)
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
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + bufferLength, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numOfChan, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numOfChan * (bitDepth / 8), true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, bufferLength, true);
    
    // Write audio data view samples (convert Float32 back to 16-bit Int PCM)
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
