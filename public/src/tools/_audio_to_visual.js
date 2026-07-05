// Shared Audio-to-Image / Audio-to-GIF combiner using Canvas + MediaRecorder
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="audio-to-image"], .audio-workbench[data-tool-key="audio-to-gif"]');
  if (!workbench) return;

  const toolKey = workbench.getAttribute('data-tool-key');

  const audioDrop = document.getElementById('ati-audio-drop');
  const audioInput = document.getElementById('ati-audio-input');
  const audioInfo = document.getElementById('ati-audio-info');

  const imgDrop = document.getElementById('ati-img-drop');
  const imgInput = document.getElementById('ati-img-input');
  const imgPreviewWrap = document.getElementById('ati-img-preview-wrap');
  const imgPreview = document.getElementById('ati-img-preview');

  const btnCombine = document.getElementById('ati-btn-combine');
  const processingCard = document.getElementById('ati-processing-card');
  const statusEl = document.getElementById('ati-status');
  const resultCard = document.getElementById('ati-result-card');
  const outputInfo = document.getElementById('ati-output-info');
  const previewPlayer = document.getElementById('ati-preview-player');
  const downloadLink = document.getElementById('ati-download-link');

  let audioFile = null;
  let imgFile = null;
  let imgElement = null;

  setupDrop(audioDrop, audioInput, (file) => {
    audioFile = file;
    audioInfo.textContent = `✓ ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
    audioInfo.classList.remove('hidden');
    checkReady();
  });

  setupDrop(imgDrop, imgInput, (file) => {
    imgFile = file;
    const url = URL.createObjectURL(file);
    imgPreview.src = url;
    imgPreviewWrap.classList.remove('hidden');
    
    imgElement = new Image();
    imgElement.onload = () => checkReady();
    imgElement.src = url;
  });

  function setupDrop(zone, input, onFile) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--accent-primary)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.style.borderColor = ''; if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', (e) => { if (e.target.files[0]) onFile(e.target.files[0]); });
    zone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
  }

  function checkReady() {
    btnCombine.disabled = !(audioFile && imgFile && imgElement && imgElement.complete);
  }

  btnCombine.addEventListener('click', async () => {
    if (!audioFile || !imgElement) return;
    
    btnCombine.disabled = true;
    processingCard.classList.remove('hidden');
    resultCard.classList.add('hidden');
    statusEl.textContent = 'Setting up canvas...';

    try {
      // Create canvas with image dimensions
      const canvas = document.createElement('canvas');
      const W = imgElement.naturalWidth || 640;
      const H = imgElement.naturalHeight || 480;
      canvas.width = W;
      canvas.height = H;
      const ctx2d = canvas.getContext('2d');
      ctx2d.drawImage(imgElement, 0, 0, W, H);

      statusEl.textContent = 'Setting up audio stream...';

      // Get audio as stream from Audio element
      const audioEl = new Audio();
      audioEl.src = URL.createObjectURL(audioFile);
      
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);

      // Canvas stream at 10fps
      const canvasStream = canvas.captureStream(10);
      // Combine video + audio tracks
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      statusEl.textContent = 'Recording combined file...';

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
        ? 'video/webm;codecs=vp8,opus' 
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = audioFile.name.replace(/\.[^/.]+$/, '') + '_visual.webm';
        
        previewPlayer.src = url;
        previewPlayer.style.display = 'block';
        outputInfo.textContent = `File Size: ${(blob.size/1024/1024).toFixed(2)} MB | Format: WebM Video with Audio`;

        await fetch('/api/stats/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_key: toolKey })
        });

        processingCard.classList.add('hidden');
        resultCard.classList.remove('hidden');
        btnCombine.disabled = false;
      };

      recorder.start();
      audioEl.play();

      // Stop after audio finishes
      audioEl.onended = () => {
        recorder.stop();
        combinedStream.getTracks().forEach(t => t.stop());
      };

      // Fallback: stop after max 3 minutes
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          audioEl.pause();
          combinedStream.getTracks().forEach(t => t.stop());
        }
      }, 180000);

    } catch (err) {
      console.error(err);
      processingCard.classList.add('hidden');
      btnCombine.disabled = false;
      alert('Error combining files: ' + err.message + '\n\nNote: This tool requires a modern browser with MediaRecorder support.');
    }
  });
})();
