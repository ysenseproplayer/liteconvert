// Advanced Multitrack Audio Joiner Client Logic
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="audio-joiner"]');
  if (!workbench) return;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('audio-file-input');
  
  const step1Section = document.getElementById('step-1-section');
  const step2Section = document.getElementById('step-2-section');
  
  const tracksStack = document.getElementById('joiner-tracks-stack');
  const tracksCountLabel = document.getElementById('queue-tracks-count');
  
  const btnAddMore = document.getElementById('btn-add-more');
  const btnResetTimeline = document.getElementById('btn-reset-timeline');
  const btnStitch = document.getElementById('btn-stitch');
  
  const processingCard = document.getElementById('processing-card');
  const progressBar = document.getElementById('processing-progress-bar');
  const statusEl = document.getElementById('processing-status');
  
  const downloadCard = document.getElementById('download-card');
  const downloadFileSize = document.getElementById('download-file-size');
  const downloadLink = document.getElementById('download-link');
  const masterPreviewPlayer = document.getElementById('master-preview-player');
  const btnJoinAnother = document.getElementById('btn-join-another');

  // Track sequence list
  let tracks = [];
  let trackCounter = 0;

  // File Picker bindings
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.style.borderColor = '';
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFiles(e.target.files); });
  dropZone.addEventListener('click', (e) => { if (e.target !== fileInput) fileInput.click(); });
  
  btnAddMore.addEventListener('click', () => fileInput.click());

  btnResetTimeline.addEventListener('click', () => {
    tracks = [];
    renderTracks();
    step2Section.classList.add('hidden');
    step1Section.classList.remove('hidden');
  });

  btnJoinAnother.addEventListener('click', () => {
    btnResetTimeline.click();
  });

  async function handleFiles(filesList) {
    step1Section.classList.add('hidden');
    step2Section.classList.remove('hidden');
    downloadCard.classList.add('hidden');

    for (const file of filesList) {
      const trackId = `track-${++trackCounter}`;
      
      // Add a visual loading placeholder first
      const loadingDiv = document.createElement('div');
      loadingDiv.id = trackId;
      loadingDiv.className = 'tool-panel';
      loadingDiv.style.padding = '1.25rem';
      loadingDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.9rem; font-weight:600; color:var(--text-secondary);">${file.name}</span>
          <span style="font-size:0.8rem; color:var(--accent-primary); font-family:var(--font-mono);">Decoding track...</span>
        </div>
      `;
      tracksStack.appendChild(loadingDiv);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);

        const trackObj = {
          id: trackId,
          file: file,
          buffer: buffer,
          fadeTransition: true,
          trimStart: 0,
          trimEnd: buffer.duration
        };
        
        // Find placeholder and insert actual track data
        const index = tracks.length;
        tracks.push(trackObj);
        renderTracks();
      } catch (err) {
        console.error(err);
        loadingDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; color:var(--danger);">
            <span>${file.name}</span>
            <span>Decoding failed: ${err.message}</span>
          </div>
        `;
        setTimeout(() => loadingDiv.remove(), 4000);
      }
    }
  }

  function renderTracks() {
    tracksStack.innerHTML = '';
    tracksCountLabel.textContent = `${tracks.length} tracks`;
    btnStitch.disabled = tracks.length < 2;

    tracks.forEach((track, index) => {
      const duration = track.buffer.duration;
      const trackDiv = document.createElement('div');
      trackDiv.className = 'tool-panel';
      trackDiv.style.padding = '1.25rem';
      trackDiv.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="badge" style="background:rgba(0,242,254,0.1); color:var(--accent-primary); width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.75rem;">${index + 1}</span>
            <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:240px;" title="${track.file.name}">${track.file.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.75rem; font-family:var(--font-mono); font-size:0.8rem;">
            <span>Trim: <strong id="lbl-trim-start-${track.id}">${track.trimStart.toFixed(1)}s</strong> - <strong id="lbl-trim-end-${track.id}">${track.trimEnd.toFixed(1)}s</strong></span>
            <span style="color:var(--text-muted);">|</span>
            <span style="color:var(--accent-primary); font-weight:600;">${(track.trimEnd - track.trimStart).toFixed(1)}s</span>
          </div>
        </div>

        <!-- Waveform visualizer & Sliders -->
        <div style="display:flex; gap:1.25rem; align-items:stretch; min-height:85px; flex-wrap:wrap;">
          
          <!-- Left: Waveform preview + Trim Sliders overlay -->
          <div style="flex:1; position:relative; background:rgba(0,0,0,0.15); border-radius:6px; border:1px solid var(--card-border); padding:0.25rem; min-width:250px;">
            <canvas id="canvas-${track.id}" height="70" style="width:100%; height:70px; display:block; border-radius:4px; opacity:0.8;"></canvas>
            
            <!-- Absolute slider inputs overlaid -->
            <input type="range" id="range-start-${track.id}" class="trim-slider-overlay start" min="0" max="${duration}" step="0.05" value="${track.trimStart}" style="position:absolute; top:5px; left:0; width:100%; height:25px; margin:0; pointer-events:auto; opacity:0; cursor:ew-resize;">
            <input type="range" id="range-end-${track.id}" class="trim-slider-overlay end" min="0" max="${duration}" step="0.05" value="${track.trimEnd}" style="position:absolute; bottom:5px; left:0; width:100%; height:25px; margin:0; pointer-events:auto; opacity:0; cursor:ew-resize;">
            
            <!-- Visible start/end handle brackets overlay -->
            <div id="bracket-start-${track.id}" style="position:absolute; top:0; bottom:0; left:${(track.trimStart/duration)*100}%; width:4px; background:var(--accent-gradient); box-shadow:0 0 8px var(--accent-primary); pointer-events:none;"></div>
            <div id="bracket-end-${track.id}" style="position:absolute; top:0; bottom:0; left:${(track.trimEnd/duration)*100}%; width:4px; background:var(--accent-gradient); box-shadow:0 0 8px var(--accent-primary); pointer-events:none;"></div>
            
            <!-- Shade unselected area -->
            <div id="shade-left-${track.id}" style="position:absolute; top:0; bottom:0; left:0; width:${(track.trimStart/duration)*100}%; background:rgba(0,0,0,0.4); pointer-events:none;"></div>
            <div id="shade-right-${track.id}" style="position:absolute; top:0; bottom:0; left:${(track.trimEnd/duration)*100}%; right:0; background:rgba(0,0,0,0.4); pointer-events:none;"></div>
          </div>

          <!-- Right: Command operations panel -->
          <div style="display:flex; flex-direction:column; gap:0.5rem; justify-content:center; align-items:center; min-width:110px;">
            <div style="display:flex; gap:0.35rem;">
              <button class="btn btn-secondary reorder-btn" data-action="up" data-index="${index}" title="Move Track Up" ${index === 0 ? 'disabled' : ''} style="padding:0.4rem; min-width:32px;">▲</button>
              <button class="btn btn-secondary reorder-btn" data-action="down" data-index="${index}" title="Move Track Down" ${index === tracks.length - 1 ? 'disabled' : ''} style="padding:0.4rem; min-width:32px;">▼</button>
              <button class="btn btn-danger delete-btn" data-index="${index}" title="Delete Track" style="padding:0.4rem; min-width:32px; background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.2); color:var(--danger);">✕</button>
            </div>
            
            <!-- Crossfade toggle -->
            <button class="btn ${track.fadeTransition ? 'btn-primary' : 'btn-secondary'} fade-toggle-btn" data-index="${index}" style="font-size:0.75rem; padding:0.3rem 0.5rem; width:100%; display:flex; justify-content:center; align-items:center; gap:0.3rem; ${track.fadeTransition ? 'background:var(--accent-gradient);' : ''}">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              <span>${track.fadeTransition ? 'Crossfade (1.5s)' : 'Direct Cut'}</span>
            </button>
          </div>

        </div>
      `;

      tracksStack.appendChild(trackDiv);
      
      // Draw peak waveform
      drawPeaks(track.buffer, `canvas-${track.id}`);

      // Slider overlays functionality
      const rangeStart = trackDiv.querySelector(`#range-start-${track.id}`);
      const rangeEnd = trackDiv.querySelector(`#range-end-${track.id}`);
      const bracketStart = trackDiv.querySelector(`#bracket-start-${track.id}`);
      const bracketEnd = trackDiv.querySelector(`#bracket-end-${track.id}`);
      const shadeLeft = trackDiv.querySelector(`#shade-left-${track.id}`);
      const shadeRight = trackDiv.querySelector(`#shade-right-${track.id}`);
      
      const lblStart = trackDiv.querySelector(`#lbl-trim-start-${track.id}`);
      const lblEnd = trackDiv.querySelector(`#lbl-trim-end-${track.id}`);

      // Range slider listeners
      rangeStart.addEventListener('input', () => {
        let val = parseFloat(rangeStart.value);
        if (val >= track.trimEnd) {
          val = Math.max(0, track.trimEnd - 0.2);
          rangeStart.value = val;
        }
        track.trimStart = val;
        lblStart.textContent = val.toFixed(1) + 's';
        
        // Update overlay coordinates
        const pct = (val / duration) * 100;
        bracketStart.style.left = pct + '%';
        shadeLeft.style.width = pct + '%';
      });

      rangeEnd.addEventListener('input', () => {
        let val = parseFloat(rangeEnd.value);
        if (val <= track.trimStart) {
          val = Math.min(duration, track.trimStart + 0.2);
          rangeEnd.value = val;
        }
        track.trimEnd = val;
        lblEnd.textContent = val.toFixed(1) + 's';
        
        // Update overlay coordinates
        const pct = (val / duration) * 100;
        bracketEnd.style.left = pct + '%';
        shadeRight.style.left = pct + '%';
      });
    });

    // Reorder event bindings
    document.querySelectorAll('.reorder-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        const idx = parseInt(e.target.getAttribute('data-index'));
        if (action === 'up' && idx > 0) {
          const temp = tracks[idx];
          tracks[idx] = tracks[idx - 1];
          tracks[idx - 1] = temp;
          renderTracks();
        } else if (action === 'down' && idx < tracks.length - 1) {
          const temp = tracks[idx];
          tracks[idx] = tracks[idx + 1];
          tracks[idx + 1] = temp;
          renderTracks();
        }
      });
    });

    // Delete event binding
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        tracks.splice(idx, 1);
        renderTracks();
        if (tracks.length === 0) {
          step2Section.classList.add('hidden');
          step1Section.classList.remove('hidden');
        }
      });
    });

    // Crossfade toggle
    document.querySelectorAll('.fade-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        tracks[idx].fadeTransition = !tracks[idx].fadeTransition;
        renderTracks();
      });
    });
  }

  // Draw peaks
  function drawPeaks(buffer, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#00f2fe';
    
    // Draw spaced soundcloud bar style
    const barWidth = 2;
    const gap = 1;
    ctx.beginPath();
    
    for (let i = 0; i < width; i += (barWidth + gap)) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      const x = i;
      const y = (1 + min) * amp;
      const h = Math.max(2, (max - min) * amp);
      
      // Linear gradient glow
      const grad = ctx.createLinearGradient(0, amp - h/2, 0, amp + h/2);
      grad.addColorStop(0, '#00f2fe');
      grad.addColorStop(1, '#4facfe');
      ctx.fillStyle = grad;
      ctx.fillRect(x, amp - h/2, barWidth, h);
    }
  }

  // Timeline Compiler
  btnStitch.addEventListener('click', async () => {
    if (tracks.length < 2) return;

    btnStitch.disabled = true;
    step2Section.classList.add('hidden');
    processingCard.classList.remove('hidden');
    progressBar.style.width = '10%';
    statusEl.textContent = 'Analyzing track transitions...';

    try {
      const sampleRate = tracks[0].buffer.sampleRate;
      const channels = Math.max(...tracks.map(t => t.buffer.numberOfChannels));
      
      // Calculate overlapping transition timings
      // We overlap tracks where fadeTransition = true by 1.5 seconds.
      const fadeDuration = 1.5; // 1.5 seconds crossfade
      
      let totalLengthSamples = 0;
      const processedTracks = [];

      progressBar.style.width = '30%';
      statusEl.textContent = 'Calculating crossfade matrices...';

      tracks.forEach((track, index) => {
        const trimDuration = track.trimEnd - track.trimStart;
        const trimSamples = Math.floor(trimDuration * sampleRate);
        
        let startOffsetSamples = totalLengthSamples;
        if (index > 0 && tracks[index].fadeTransition) {
          // Subtract the 1.5s crossfade overlap from start offset
          const fadeSamples = Math.floor(fadeDuration * sampleRate);
          startOffsetSamples = Math.max(0, startOffsetSamples - fadeSamples);
        }

        processedTracks.push({
          track: track,
          trimStart: track.trimStart,
          trimEnd: track.trimEnd,
          trimSamples: trimSamples,
          startOffsetSamples: startOffsetSamples,
          fadeTransition: track.fadeTransition
        });

        // The timeline end sample position of this track
        totalLengthSamples = startOffsetSamples + trimSamples;
      });

      progressBar.style.width = '60%';
      statusEl.textContent = 'Stitching timeline...';

      // Offline Audio Context rendering
      const offlineCtx = new OfflineAudioContext(
        channels,
        totalLengthSamples,
        sampleRate
      );

      processedTracks.forEach((pt, index) => {
        const audioBuffer = pt.track.buffer;
        
        // Extract the trimmed section of audio buffer
        const segmentBuffer = offlineCtx.createBuffer(
          audioBuffer.numberOfChannels,
          pt.trimSamples,
          sampleRate
        );

        const startSampleIndex = Math.floor(pt.trimStart * sampleRate);
        for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
          const srcData = audioBuffer.getChannelData(c);
          const dstData = segmentBuffer.getChannelData(c);
          
          for (let s = 0; s < pt.trimSamples; s++) {
            if (startSampleIndex + s < srcData.length) {
              dstData[s] = srcData[startSampleIndex + s];
            }
          }
        }

        // Setup Source Node & Gain Node
        const srcNode = offlineCtx.createBufferSource();
        srcNode.buffer = segmentBuffer;
        const gainNode = offlineCtx.createGain();

        // Apply Crossfades via gain schedules
        if (pt.fadeTransition) {
          const tStart = pt.startOffsetSamples / sampleRate;
          const tDuration = pt.trimSamples / sampleRate;
          const tEnd = tStart + tDuration;

          // Crossfade IN (at beginning of this track, overlaying previous track end)
          if (index > 0) {
            gainNode.gain.setValueAtTime(0, tStart);
            gainNode.gain.linearRampToValueAtTime(1, tStart + fadeDuration);
          } else {
            gainNode.gain.setValueAtTime(1, tStart);
          }

          // Crossfade OUT (at the end of this track, overlaying next track start)
          if (index < processedTracks.length - 1 && processedTracks[index + 1].fadeTransition) {
            gainNode.gain.setValueAtTime(1, tEnd - fadeDuration);
            gainNode.gain.linearRampToValueAtTime(0, tEnd);
          }
        } else {
          gainNode.gain.setValueAtTime(1, pt.startOffsetSamples / sampleRate);
        }

        srcNode.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        
        // Start playing at the timeline offset
        srcNode.start(pt.startOffsetSamples / sampleRate);
      });

      progressBar.style.width = '85%';
      statusEl.textContent = 'Rendering track master...';

      const masterBuffer = await offlineCtx.startRendering();
      progressBar.style.width = '95%';
      statusEl.textContent = 'Encoding output wav...';

      const wavBlob = bufferToWav(masterBuffer);
      const url = URL.createObjectURL(wavBlob);

      progressBar.style.width = '100%';
      await new Promise(r => setTimeout(r, 200));

      downloadLink.href = url;
      downloadLink.download = 'timeline_stitched.mp3';
      masterPreviewPlayer.src = url;

      downloadFileSize.textContent = (wavBlob.size / (1024 * 1024)).toFixed(2) + ' MB';

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'audio-joiner' })
      });

      processingCard.classList.add('hidden');
      downloadCard.classList.remove('hidden');
      btnStitch.disabled = false;

    } catch (err) {
      console.error(err);
      processingCard.classList.add('hidden');
      step2Section.classList.remove('hidden');
      btnStitch.disabled = false;
      alert('Stitching failed: ' + err.message);
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
})();
