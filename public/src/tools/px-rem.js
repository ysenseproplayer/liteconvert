document.addEventListener('DOMContentLoaded', () => {
  const pxBase = document.getElementById('px-base');
  const pxInput = document.getElementById('px-input');
  const remInput = document.getElementById('rem-input');
  const tableBody = document.getElementById('px-rem-table-body');

  pxBase.addEventListener('input', updateTableAndConvert);
  pxInput.addEventListener('input', () => {
    const base = parseFloat(pxBase.value) || 16;
    const px = parseFloat(pxInput.value) || 0;
    remInput.value = (px / base).toFixed(4);
    debouncedStatIncrement();
  });
  
  remInput.addEventListener('input', () => {
    const base = parseFloat(pxBase.value) || 16;
    const rem = parseFloat(remInput.value) || 0;
    pxInput.value = (rem * base).toFixed(2);
    debouncedStatIncrement();
  });

  function updateTableAndConvert() {
    const base = parseFloat(pxBase.value) || 16;
    const px = parseFloat(pxInput.value) || 0;
    remInput.value = (px / base).toFixed(4);
    
    // Update grid table
    tableBody.innerHTML = '';
    const pxValues = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64];
    pxValues.forEach(val => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-family: var(--font-mono);">${val}px</td>
        <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-primary);">${(val / base).toFixed(4)}rem</td>
      `;
      tableBody.appendChild(row);
    });
  }

  updateTableAndConvert();

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch('/api/stats/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_key: 'px-rem' })
        });
      } catch (err) {
        console.error('Failed to log stats:', err);
      }
    }, 2000);
  }
});
