// Morse Code Generator Client Logic (morsecodegenerate.com clone)
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.morse-clone-wrapper');
  if (!wrapper) return;

  const inputText = document.getElementById('morse-input-text');
  const outputText = document.getElementById('morse-output-text');
  const speedSlider = document.getElementById('morse-speed');
  const speedVal = document.getElementById('val-morse-speed');

  const btnClear = document.getElementById('morse-btn-clear');
  const btnCopy = document.getElementById('morse-btn-copy');
  const btnPlay = document.getElementById('morse-btn-play');
  const btnStop = document.getElementById('morse-btn-stop');
  const btnDownload = document.getElementById('morse-btn-download');

  // Morse code map definition
  const morseCodeMap = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
    'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
    'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': ' ',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.',
    '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
    '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
  };

  let audioContext = null;
  let activeOscillator = null;
  let activeGainNode = null;
  let playTimeout = null;

  // WPM slider listener
  speedSlider.addEventListener('input', () => {
    speedVal.textContent = speedSlider.value + ' WPM';
  });

  // Translation function
  function translate() {
    const text = inputText.value.toUpperCase();
    let morse = '';
    for (let char of text) {
      if (morseCodeMap[char]) {
        morse += morseCodeMap[char] + ' ';
      }
    }
    outputText.value = morse.trim();
  }

  // Bind translation trigger to keyup
  inputText.addEventListener('input', translate);
  translate(); // Initial load

  // Clear inputs
  btnClear.addEventListener('click', () => {
    inputText.value = '';
    outputText.value = '';
    inputText.focus();
  });

  // Copy code
  btnCopy.addEventListener('click', () => {
    if (!outputText.value) return;
    navigator.clipboard.writeText(outputText.value).then(() => {
      const origText = btnCopy.textContent;
      btnCopy.textContent = 'Copied!';
      btnCopy.style.color = 'var(--success)';
      setTimeout(() => {
        btnCopy.textContent = origText;
        btnCopy.style.color = '';
      }, 1500);
    });
  });

  // Stop playback beeping
  function stopBeeps() {
    if (activeOscillator) {
      try { activeOscillator.stop(); } catch(e) {}
      activeOscillator = null;
    }
    if (activeGainNode) {
      activeGainNode.disconnect();
      activeGainNode = null;
    }
    if (playTimeout) {
      clearTimeout(playTimeout);
      playTimeout = null;
    }
    btnPlay.classList.remove('hidden');
    btnStop.classList.add('hidden');
  }

  btnStop.addEventListener('click', stopBeeps);

  // Play Beeps sequence via Web Audio API
  btnPlay.addEventListener('click', () => {
    stopBeeps();
    const morse = outputText.value;
    if (!morse) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const wpm = parseInt(speedSlider.value);
    const dotDuration = 1.2 / wpm; // Dot length in seconds
    
    btnPlay.classList.add('hidden');
    btnStop.classList.remove('hidden');

    let symbolIndex = 0;
    
    function playNextSymbol() {
      if (symbolIndex >= morse.length) {
        stopBeeps();
        return;
      }

      const symbol = morse[symbolIndex];
      symbolIndex++;

      if (symbol === '.' || symbol === '-') {
        const duration = symbol === '.' ? dotDuration : dotDuration * 3;
        
        activeOscillator = audioContext.createOscillator();
        activeGainNode = audioContext.createGain();
        
        activeOscillator.type = 'sine';
        activeOscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep tone
        
        activeGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        activeGainNode.gain.setValueAtTime(0, audioContext.currentTime + duration);
        
        activeOscillator.connect(activeGainNode);
        activeGainNode.connect(audioContext.destination);
        
        activeOscillator.start();
        activeOscillator.stop(audioContext.currentTime + duration + 0.05);

        // Schedule next play
        playTimeout = setTimeout(playNextSymbol, (duration + dotDuration) * 1000);
      } else if (symbol === ' ') {
        // Gap spacing between characters / words
        playTimeout = setTimeout(playNextSymbol, dotDuration * 3 * 1000);
      } else {
        playNextSymbol();
      }
    }

    playNextSymbol();
  });

  // Synthesize and Download Audio (MP3/WAV format)
  btnDownload.addEventListener('click', async () => {
    const text = inputText.value || 'SOS';
    const wpm = parseInt(speedSlider.value);
    const dotDuration = 1.2 / wpm;
    const sampleRate = 44100;

    btnDownload.textContent = 'Generating...';
    btnDownload.setAttribute('disabled', 'true');

    try {
      let curTime = 0.5; // Start offset
      
      // Pass 1: Calculate duration
      for (let char of text.toUpperCase()) {
        const code = morseCodeMap[char];
        if (!code) continue;
        if (code === ' ') {
          curTime += dotDuration * 4;
          continue;
        }
        for (let symbol of code) {
          const symDur = symbol === '.' ? dotDuration : dotDuration * 3;
          curTime += symDur + dotDuration;
        }
        curTime += dotDuration * 2;
      }

      // Pass 2: Render in Offline Audio Context
      const offlineCtx = new OfflineAudioContext(1, sampleRate * (curTime + 0.5), sampleRate);
      
      curTime = 0.5;
      for (let char of text.toUpperCase()) {
        const code = morseCodeMap[char];
        if (!code) continue;
        if (code === ' ') {
          curTime += dotDuration * 4;
          continue;
        }
        for (let symbol of code) {
          const symDur = symbol === '.' ? dotDuration : dotDuration * 3;
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          
          osc.frequency.setValueAtTime(800, curTime);
          gain.gain.setValueAtTime(0.8, curTime);
          gain.gain.setValueAtTime(0, curTime + symDur);
          
          osc.connect(gain);
          gain.connect(offlineCtx.destination);
          
          osc.start(curTime);
          osc.stop(curTime + symDur + 0.05);
          curTime += symDur + dotDuration;
        }
        curTime += dotDuration * 2;
      }

      const outputBuffer = await offlineCtx.startRendering();
      const wavBlob = bufferToWav(outputBuffer);
      const url = URL.createObjectURL(wavBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `morse_code_output.mp3`; // Save as MP3 extension
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Increment statistics
      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'morse-code' })
      });

    } catch (e) {
      console.error(e);
      alert('Failed to generate audio file.');
    } finally {
      btnDownload.textContent = 'Download Audio (MP3)';
      btnDownload.removeAttribute('disabled');
    }
  });

  // Helper exporter WAV
  function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    
    let result = buffer.getChannelData(0);
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
});
