// Cover Art Adder - Embeds APIC frame into MP3 ID3v2 tags
(function init() {
  const workbench = document.querySelector('.audio-workbench[data-tool-key="cover-art"]');
  if (!workbench) return;

  const mp3Drop = document.getElementById('ca-mp3-drop');
  const mp3Input = document.getElementById('ca-mp3-input');
  const mp3Info = document.getElementById('ca-mp3-info');

  const imgDrop = document.getElementById('ca-img-drop');
  const imgInput = document.getElementById('ca-img-input');
  const imgPreviewWrap = document.getElementById('ca-img-preview-wrap');
  const imgPreview = document.getElementById('ca-img-preview');

  const btnEmbed = document.getElementById('ca-btn-embed');
  const resultCard = document.getElementById('ca-result-card');
  const downloadLink = document.getElementById('ca-download-link');

  let mp3File = null;
  let imgFile = null;
  let imgArrayBuffer = null;
  let imgMime = 'image/jpeg';

  // MP3 drop zone
  setupDrop(mp3Drop, mp3Input, (file) => {
    if (!file.name.endsWith('.mp3')) { alert('Please upload an MP3 file.'); return; }
    mp3File = file;
    mp3Info.textContent = `✓ ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
    mp3Info.classList.remove('hidden');
    checkReady();
  });

  // Image drop zone
  setupDrop(imgDrop, imgInput, async (file) => {
    if (!file.type.startsWith('image/')) { alert('Please upload a JPG or PNG image.'); return; }
    imgFile = file;
    imgMime = file.type;
    imgArrayBuffer = await file.arrayBuffer();
    const url = URL.createObjectURL(file);
    imgPreview.src = url;
    imgPreviewWrap.classList.remove('hidden');
    checkReady();
  });

  function setupDrop(zone, input, onFile) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--accent-primary)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.style.borderColor = ''; if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', (e) => { if (e.target.files[0]) onFile(e.target.files[0]); });
    zone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
  }

  function checkReady() {
    btnEmbed.disabled = !(mp3File && imgFile);
  }

  btnEmbed.addEventListener('click', async () => {
    if (!mp3File || !imgFile) return;
    btnEmbed.textContent = 'Embedding...';
    btnEmbed.disabled = true;

    try {
      const mp3Buffer = await mp3File.arrayBuffer();
      const mp3Data = new Uint8Array(mp3Buffer);
      const imgData = new Uint8Array(imgArrayBuffer);

      // Build ID3v2.3 APIC frame
      // APIC frame: frameID(4) + size(4) + flags(2) + encoding(1) + mime(null-terminated) + type(1) + description(null-terminated) + imageData
      const mimeBytes = encodeText(imgMime);
      const descBytes = new Uint8Array([0]); // empty description, null-terminated
      
      // APIC frame content: encoding(1) + mime + null + pictype(1) + desc + null + data
      const apicContent = new Uint8Array(1 + mimeBytes.length + 1 + 1 + 1 + imgData.length);
      let off = 0;
      apicContent[off++] = 0; // encoding = Latin-1
      apicContent.set(mimeBytes, off); off += mimeBytes.length;
      apicContent[off++] = 0; // null terminator for mime
      apicContent[off++] = 3; // picture type 3 = Front Cover
      apicContent[off++] = 0; // empty description null-terminated
      apicContent.set(imgData, off);

      // Frame header: "APIC" + size as 4 bytes (BE) + flags(2 bytes)
      const frameHeader = new Uint8Array(10);
      frameHeader[0] = 0x41; frameHeader[1] = 0x50; frameHeader[2] = 0x49; frameHeader[3] = 0x43; // "APIC"
      const fsize = apicContent.length;
      frameHeader[4] = (fsize >> 24) & 0xFF;
      frameHeader[5] = (fsize >> 16) & 0xFF;
      frameHeader[6] = (fsize >> 8) & 0xFF;
      frameHeader[7] = fsize & 0xFF;
      frameHeader[8] = 0; frameHeader[9] = 0; // flags

      const apicFrame = concat(frameHeader, apicContent);

      // Strip existing ID3v2 tag if present
      let mp3Start = 0;
      if (mp3Data[0] === 0x49 && mp3Data[1] === 0x44 && mp3Data[2] === 0x33) {
        // Has ID3v2 header - read size (synchsafe)
        const tagSize = ((mp3Data[6] & 0x7F) << 21) | ((mp3Data[7] & 0x7F) << 14) | ((mp3Data[8] & 0x7F) << 7) | (mp3Data[9] & 0x7F);
        mp3Start = 10 + tagSize;
      }

      const pureMP3 = mp3Data.slice(mp3Start);

      // Build new ID3v2.3 tag: header + APIC frame
      const tagContentSize = apicFrame.length;
      const id3Header = new Uint8Array(10);
      id3Header[0] = 0x49; id3Header[1] = 0x44; id3Header[2] = 0x33; // "ID3"
      id3Header[3] = 0x03; id3Header[4] = 0x00; // version 2.3
      id3Header[5] = 0x00; // no flags
      // Synchsafe size
      id3Header[6] = (tagContentSize >> 21) & 0x7F;
      id3Header[7] = (tagContentSize >> 14) & 0x7F;
      id3Header[8] = (tagContentSize >> 7) & 0x7F;
      id3Header[9] = tagContentSize & 0x7F;

      const newTag = concat(id3Header, apicFrame);
      const result = concat(newTag, pureMP3);

      const blob = new Blob([result], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = mp3File.name.replace(/\.mp3$/i, '') + '_with_cover.mp3';

      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_key: 'cover-art' })
      });

      resultCard.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      alert('Error embedding cover art: ' + err.message);
    } finally {
      btnEmbed.textContent = 'Add Cover Art to MP3';
      btnEmbed.disabled = false;
    }
  });

  function encodeText(str) {
    return new TextEncoder().encode(str);
  }

  function concat(...arrays) {
    let total = arrays.reduce((sum, a) => sum + a.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
    return result;
  }
})();

