// Voice Recorder Tool JS
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="voice-recorder"]');
  if (!workbench) return;

  const btnStart = document.getElementById('btn-start-record');
  const btnStop = document.getElementById('btn-stop-record');
  const btnRecordAgain = document.getElementById('btn-record-again');
  const micRing = document.getElementById('mic-ring');
  const recordingPulse = document.getElementById('recording-pulse');
  const timerEl = document.getElementById('recorder-timer');
  const statusEl = document.getElementById('recorder-status');
  const recorderCanvas = document.getElementById('recorder-canvas');
  const downloadCard = document.getElementById('recorder-download-card');
  const downloadLink = document.getElementById('recorder-download-link');
  const outputInfo = document.getElementById('recorder-output-info');

  let mediaRecorder = null;
  let chunks = [];
  let timerInterval = null;
  let seconds = 0;
  let analyser = null;
  let animFrame = null;

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  btnStart.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup analyser for live waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      mediaRecorder = new MediaRecorder(stream);
      chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = `recording_${Date.now()}.wav`;
        outputInfo.textContent = `Duration: ${formatTime(seconds)} | Format: WAV Audio`;

        downloadCard.classList.remove('hidden');
        btnStart.classList.remove('hidden');
        btnStop.classList.add('hidden');
        micRing.style.borderColor = 'rgba(0,242,254,0.15)';
        micRing.style.background = 'rgba(0,242,254,0.05)';
        recordingPulse.classList.add('hidden');
        recorderCanvas.style.display = 'none';
        statusEl.textContent = 'Recording saved. Ready to download.';

        clearInterval(timerInterval);
        cancelAnimationFrame(animFrame);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      seconds = 0;
      timerEl.textContent = formatTime(0);
      timerInterval = setInterval(() => {
        seconds++;
        timerEl.textContent = formatTime(seconds);
      }, 1000);

      // Update UI
      btnStart.classList.add('hidden');
      btnStop.classList.remove('hidden');
      downloadCard.classList.add('hidden');
      micRing.style.borderColor = 'rgba(239,68,68,0.5)';
      micRing.style.background = 'rgba(239,68,68,0.06)';
      recordingPulse.classList.remove('hidden');
      recorderCanvas.style.display = 'block';
      statusEl.textContent = '🔴 Recording in progress...';

      // Live waveform draw
      const ctx2d = recorderCanvas.getContext('2d');
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      function drawLiveWave() {
        animFrame = requestAnimationFrame(drawLiveWave);
        analyser.getByteTimeDomainData(dataArray);
        
        ctx2d.clearRect(0, 0, recorderCanvas.width, recorderCanvas.height);
        ctx2d.lineWidth = 2;
        ctx2d.strokeStyle = '#00f2fe';
        ctx2d.beginPath();
        
        const sliceWidth = recorderCanvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * recorderCanvas.height) / 2;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
          x += sliceWidth;
        }
        ctx2d.lineTo(recorderCanvas.width, recorderCanvas.height / 2);
        ctx2d.stroke();
      }
      drawLiveWave();

    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Microphone access denied. Please allow microphone permissions.';
      statusEl.style.color = 'var(--danger)';
    }
  });

  btnStop.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  });

  btnRecordAgain.addEventListener('click', () => {
    downloadCard.classList.add('hidden');
    seconds = 0;
    timerEl.textContent = '00:00';
    statusEl.textContent = 'Click the button below to start recording';
    statusEl.style.color = '';
    chunks = [];
  });
})();


