// MP3 Tag Editor - ID3 tag writer using binary manipulation
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="tag-editor"]');
  if (!workbench) return;

  const dropZone = document.getElementById('tag-drop-zone');
  const fileInput = document.getElementById('tag-file-input');
  const fileInfo = document.getElementById('tag-file-info');
  const fileNameLabel = document.getElementById('tag-file-name');
  const btnRemove = document.getElementById('tag-btn-remove');
  const editorCard = document.getElementById('tag-editor-card');
  const btnSave = document.getElementById('btn-save-tags');
  const successCard = document.getElementById('tag-success-card');
  const downloadLink = document.getElementById('tag-download-link');

  let activeFile = null;

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.style.borderColor = ''; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });
  dropZone.addEventListener('click', (e) => { if (e.target !== fileInput) fileInput.click(); });

  function handleFile(file) {
    if (!file.type.includes('mpeg') && !file.name.endsWith('.mp3')) {
      alert('Please upload a valid MP3 file.'); return;
    }
    activeFile = file;
    fileNameLabel.textContent = file.name;
    fileInfo.classList.remove('hidden');
    editorCard.classList.remove('hidden');
    successCard.classList.add('hidden');
    
    // Pre-fill filename as title guess
    document.getElementById('tag-title').value = file.name.replace(/\.[^/.]+$/, '');
  }

  btnRemove.addEventListener('click', () => {
    activeFile = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    editorCard.classList.add('hidden');
    successCard.classList.add('hidden');
  });

  btnSave.addEventListener('click', async () => {
    if (!activeFile) return;
    
    btnSave.textContent = 'Writing tags...';
    btnSave.disabled = true;

    try {
      const arrayBuffer = await activeFile.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const title = document.getElementById('tag-title').value || '';
      const artist = document.getElementById('tag-artist').value || '';
      const album = document.getElementById('tag-album').value || '';
      const year = document.getElementById('tag-year').value || '';
      const genre = document.getElementById('tag-genre').value || '';

      // Write a simple ID3v1 tag at the end (128 bytes)
      // ID3v1 format: TAG (3) + title(30) + artist(30) + album(30) + year(4) + comment(28) + 0x00 + track(1) + genre(1)
      const id3v1 = new Uint8Array(128);
      const encoder = new TextEncoder();

      function writeField(arr, offset, value, len) {
        const bytes = encoder.encode(value.substring(0, len));
        arr.set(bytes, offset);
        return offset + len;
      }

      id3v1[0] = 0x54; id3v1[1] = 0x41; id3v1[2] = 0x47; // "TAG"
      let off = 3;
      writeField(id3v1, off, title, 30); off += 30;
      writeField(id3v1, off, artist, 30); off += 30;
      writeField(id3v1, off, album, 30); off += 30;
      writeField(id3v1, off, year, 4); off += 4;
      id3v1[off + 28] = 0;
      id3v1[off + 29] = 0; // no track
      off += 30;
      id3v1[127] = 0; // Genre index 0 = Blues (generic)

      // Check if existing ID3v1 tag present and remove it
      let mp3Data = data;
      if (data.length >= 128) {
        const lastTag = data.slice(data.length - 128, data.length - 125);
        if (lastTag[0] === 0x54 && lastTag[1] === 0x41 && lastTag[2] === 0x47) {
          mp3Data = data.slice(0, data.length - 128);
        }
      }

      // Combine original MP3 + new ID3v1 tag
      const combined = new Uint8Array(mp3Data.length + 128);
      combined.set(mp3Data, 0);
      combined.set(id3v1, mp3Data.length);

      const blob = new Blob([combined], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = activeFile.name.replace(/\.mp3$/i, '') + '_tagged.mp3';

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'tag-editor' })
      });

      editorCard.classList.add('hidden');
      successCard.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      alert('Error writing tags: ' + err.message);
    } finally {
      btnSave.textContent = 'Save Tags & Download';
      btnSave.disabled = false;
    }
  });
})();

