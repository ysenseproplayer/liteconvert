// Shared Audio Analyzer — BPM, Key, Bitrate
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-analyzer-mode]');
  if (!workbench) return;

  const toolKey = workbench.getAttribute('data-tool-key');
  const mode = workbench.getAttribute('data-analyzer-mode');

  const dropZone = document.getElementById('az-drop-zone');
  const fileInput = document.getElementById('az-file-input');
  const analyzingCard = document.getElementById('az-analyzing-card');
  const statusEl = document.getElementById('az-status');
  const progressBar = document.getElementById('az-progress-bar');
  const resultsCard = document.getElementById('az-results-card');
  const resultsGrid = document.getElementById('az-results-grid');
  const btnAnalyzeAnother = document.getElementById('az-btn-analyze-another');

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.style.borderColor = ''; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });
  dropZone.addEventListener('click', (e) => { if (e.target !== fileInput) fileInput.click(); });

  btnAnalyzeAnother.addEventListener('click', () => {
    fileInput.value = '';
    resultsCard.classList.add('hidden');
    document.getElementById('az-upload-card').classList.remove('hidden');
  });

  async function handleFile(file) {
    document.getElementById('az-upload-card').classList.add('hidden');
    analyzingCard.classList.remove('hidden');
    resultsCard.classList.add('hidden');
    progressBar.style.width = '10%';
    statusEl.textContent = 'Reading audio file...';

    try {
      const arrayBuffer = await file.arrayBuffer();
      progressBar.style.width = '35%';
      statusEl.textContent = 'Decoding audio data...';

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      
      progressBar.style.width = '65%';
      statusEl.textContent = 'Running analysis algorithms...';
      await new Promise(r => setTimeout(r, 300));

      let stats = {};

      if (mode === 'bpm') {
        const bpm = await estimateBPM(decodedBuffer);
        stats = [
          { val: bpm.toFixed(0), label: 'BPM (Tempo)' },
          { val: decodedBuffer.duration.toFixed(1) + 's', label: 'Duration' },
          { val: decodedBuffer.sampleRate.toLocaleString() + ' Hz', label: 'Sample Rate' },
          { val: decodedBuffer.numberOfChannels === 2 ? 'Stereo' : 'Mono', label: 'Channels' },
        ];
      } else if (mode === 'key') {
        const key = estimateKey(decodedBuffer);
        stats = [
          { val: key.note, label: 'Key Note' },
          { val: key.mode, label: 'Mode (Major/Minor)' },
          { val: key.camelot, label: 'Camelot Notation' },
          { val: decodedBuffer.duration.toFixed(1) + 's', label: 'Duration' },
        ];
      } else if (mode === 'bitrate') {
        const sizeMb = file.size / (1024 * 1024);
        const durationMin = decodedBuffer.duration / 60;
        const estimatedKbps = Math.round((file.size * 8) / (decodedBuffer.duration * 1000));
        stats = [
          { val: estimatedKbps + ' kbps', label: 'Estimated Bitrate' },
          { val: (sizeMb).toFixed(2) + ' MB', label: 'File Size' },
          { val: decodedBuffer.sampleRate.toLocaleString() + ' Hz', label: 'Sample Rate' },
          { val: decodedBuffer.numberOfChannels === 2 ? 'Stereo' : 'Mono', label: 'Audio Channels' },
          { val: decodedBuffer.duration.toFixed(1) + 's', label: 'Duration' },
          { val: file.name.split('.').pop().toUpperCase(), label: 'Format' },
        ];
      }

      progressBar.style.width = '100%';
      await new Promise(r => setTimeout(r, 200));

      // Render results
      resultsGrid.innerHTML = stats.map(s => `
        <div class="result-stat-card">
          <div class="stat-val">${s.val}</div>
          <div class="stat-label">${s.label}</div>
        </div>
      `).join('');

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: toolKey })
      });

      analyzingCard.classList.add('hidden');
      resultsCard.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      analyzingCard.classList.add('hidden');
      document.getElementById('az-upload-card').classList.remove('hidden');
      alert('Error analyzing file: ' + err.message);
    }
  }

  // BPM estimation via onset detection
  async function estimateBPM(buffer) {
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    
    // Downsample to 22050 Hz equivalent
    const decimation = Math.floor(sampleRate / 22050);
    const decimated = [];
    for (let i = 0; i < channelData.length; i += decimation) {
      decimated.push(channelData[i]);
    }

    // Compute energy envelope
    const windowSize = 512;
    const energies = [];
    for (let i = 0; i < decimated.length - windowSize; i += windowSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) sum += decimated[i + j] ** 2;
      energies.push(Math.sqrt(sum / windowSize));
    }

    // Find onsets (energy spikes)
    const threshold = energies.reduce((a, b) => a + b) / energies.length * 1.5;
    const onsets = [];
    for (let i = 1; i < energies.length; i++) {
      if (energies[i] > threshold && energies[i] > energies[i - 1]) {
        onsets.push(i);
      }
    }

    if (onsets.length < 2) return 120; // Default

    // Inter-onset intervals to BPM
    const iois = [];
    for (let i = 1; i < onsets.length; i++) {
      iois.push(onsets[i] - onsets[i - 1]);
    }
    const avgIoi = iois.reduce((a, b) => a + b) / iois.length;
    const hopSec = windowSize / 22050;
    const beatDuration = avgIoi * hopSec;
    let bpm = 60 / beatDuration;

    // Clamp to reasonable range 60-200
    while (bpm < 60) bpm *= 2;
    while (bpm > 200) bpm /= 2;

    return Math.round(bpm);
  }

  // Key estimation using chromagram (simplified)
  function estimateKey(buffer) {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Use 4096 samples around the middle of the track for analysis
    const midPoint = Math.floor(channelData.length / 2);
    const windowSize = Math.min(4096, channelData.length);
    const segment = channelData.slice(midPoint, midPoint + windowSize);

    // Simple chromagram: measure energy at pitch class frequencies
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const chroma = new Float32Array(12).fill(0);
    
    const baseFreq = 261.63; // C4
    for (let p = 0; p < 12; p++) {
      const freq = baseFreq * Math.pow(2, p / 12);
      let real = 0, imag = 0;
      for (let n = 0; n < segment.length; n++) {
        const angle = -2 * Math.PI * freq * n / sampleRate;
        real += segment[n] * Math.cos(angle);
        imag += segment[n] * Math.sin(angle);
      }
      chroma[p] = Math.sqrt(real * real + imag * imag);
    }

    const maxIdx = chroma.indexOf(Math.max(...chroma));
    const note = noteNames[maxIdx];

    // Check major vs minor based on the 3rd relative to root
    const majorThird = chroma[(maxIdx + 4) % 12];
    const minorThird = chroma[(maxIdx + 3) % 12];
    const isMajor = majorThird >= minorThird;
    
    // Camelot wheel mapping
    const camelotMajor = ['8B','3B','10B','5B','12B','7B','2B','9B','4B','11B','6B','1B'];
    const camelotMinor = ['5A','12A','7A','2A','9A','4A','11A','6A','1A','8A','3A','10A'];

    return {
      note: note,
      mode: isMajor ? 'Major' : 'Minor',
      camelot: isMajor ? camelotMajor[maxIdx] : camelotMinor[maxIdx]
    };
  }
})();
