import * as converters from '../utils/converters.js';

// Simple lorem ipsum array
const LOREM_TEXTS = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
  "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.",
  "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa."
];

export function initTextConverter(toolKey) {
  document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const textOutput = document.getElementById('text-output');
    const textPreview = document.getElementById('text-preview');
    
    const btnClearInput = document.getElementById('btn-clear-text-input');
    const btnCopyOutput = document.getElementById('btn-copy-text-output');
    const btnTogglePreview = document.getElementById('btn-toggle-preview');

    if (btnClearInput) {
      btnClearInput.addEventListener('click', () => {
        if (textInput) textInput.value = '';
        if (textOutput) textOutput.value = '';
        if (textPreview) textPreview.innerHTML = '';
      });
    }

    if (btnCopyOutput) {
      btnCopyOutput.addEventListener('click', () => {
        const text = textOutput ? textOutput.value : '';
        if (!text) return;
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      });
    }

    // 1. BASE64
    if (toolKey === 'base64') {
      const btnEncode = document.getElementById('btn-base64-encode');
      const btnDecode = document.getElementById('btn-base64-decode');
      
      btnEncode.addEventListener('click', () => {
        try {
          textOutput.value = converters.base64Encode(textInput.value);
          incrementDatabaseStat(toolKey);
        } catch (e) { textOutput.value = `Error: ${e.message}`; }
      });
      
      btnDecode.addEventListener('click', () => {
        try {
          textOutput.value = converters.base64Decode(textInput.value);
          incrementDatabaseStat(toolKey);
        } catch (e) { textOutput.value = `Error: ${e.message}`; }
      });
    }

    // 2. URL CODEC
    else if (toolKey === 'url-codec') {
      const btnEncode = document.getElementById('btn-url-encode');
      const btnDecode = document.getElementById('btn-url-decode');
      
      btnEncode.addEventListener('click', () => {
        try {
          textOutput.value = encodeURIComponent(textInput.value);
          incrementDatabaseStat(toolKey);
        } catch (e) { textOutput.value = `Error: ${e.message}`; }
      });
      
      btnDecode.addEventListener('click', () => {
        try {
          textOutput.value = decodeURIComponent(textInput.value);
          incrementDatabaseStat(toolKey);
        } catch (e) { textOutput.value = `Error: ${e.message}`; }
      });
    }

    // 3. CASE CHANGER
    else if (toolKey === 'case-changer') {
      const caseButtons = document.querySelectorAll('.case-buttons button');
      caseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-case');
          try {
            textOutput.value = converters.changeTextCase(textInput.value, type);
            incrementDatabaseStat(toolKey);
          } catch (e) { textOutput.value = `Error: ${e.message}`; }
        });
      });
    }

    // 4. HTML FORMATTER
    else if (toolKey === 'html-formatter') {
      const btnFormat = document.getElementById('btn-format-html');
      const btnMinify = document.getElementById('btn-minify-html');
      
      btnFormat.addEventListener('click', () => {
        try {
          textOutput.value = converters.formatHtmlCode(textInput.value);
          incrementDatabaseStat(toolKey);
        } catch (e) { textOutput.value = `Error: ${e.message}`; }
      });
      
      btnMinify.addEventListener('click', () => {
        try {
          textOutput.value = converters.minifyHtmlCode(textInput.value);
          incrementDatabaseStat(toolKey);
        } catch (e) { textOutput.value = `Error: ${e.message}`; }
      });
    }

    // 5. LOREM IPSUM
    else if (toolKey === 'lorem-ipsum') {
      const btnGenerate = document.getElementById('btn-generate-lorem');
      const paragraphsInput = document.getElementById('lorem-paragraphs');
      
      btnGenerate.addEventListener('click', () => {
        const count = parseInt(paragraphsInput.value) || 3;
        let result = [];
        for (let i = 0; i < count; i++) {
          result.push(LOREM_TEXTS[i % LOREM_TEXTS.length]);
        }
        textOutput.value = result.join('\n\n');
        incrementDatabaseStat(toolKey);
      });
    }

    // 6. BINARY CONVERTER
    else if (toolKey === 'binary-converter') {
      document.getElementById('btn-text-to-bin').addEventListener('click', () => {
        const text = textInput.value;
        textOutput.value = text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        incrementDatabaseStat(toolKey);
      });

      document.getElementById('btn-bin-to-text').addEventListener('click', () => {
        try {
          const bin = textInput.value.trim();
          textOutput.value = bin.split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join('');
          incrementDatabaseStat(toolKey);
        } catch (e) { textOutput.value = 'Invalid Binary sequence'; }
      });

      document.getElementById('btn-text-to-hex').addEventListener('click', () => {
        const text = textInput.value;
        textOutput.value = text.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
        incrementDatabaseStat(toolKey);
      });

      document.getElementById('btn-hex-to-text').addEventListener('click', () => {
        try {
          const hex = textInput.value.trim();
          textOutput.value = hex.split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join('');
          incrementDatabaseStat(toolKey);
        } catch (e) { textOutput.value = 'Invalid Hex sequence'; }
      });
    }

    // 7 & 8. MARKDOWN / HTML DIRECT CONVERTERS
    else if (toolKey === 'md-html') {
      textInput.addEventListener('input', () => {
        try {
          const html = converters.markdownToHtml(textInput.value);
          textOutput.value = html;
          if (textPreview) textPreview.innerHTML = html;
          debouncedStatIncrement(toolKey);
        } catch (e) { textOutput.value = `Error: ${e.message}`; }
      });

      let showPreview = false;
      btnTogglePreview.addEventListener('click', () => {
        showPreview = !showPreview;
        if (showPreview) {
          textPreview.classList.remove('hidden');
          textOutput.classList.add('hidden');
          btnTogglePreview.textContent = 'Show HTML Code';
        } else {
          textPreview.classList.add('hidden');
          textOutput.classList.remove('hidden');
          btnTogglePreview.textContent = 'Show Live Preview';
        }
      });
    }

    else if (toolKey === 'html-md') {
      textInput.addEventListener('input', () => {
        try {
          textOutput.value = converters.htmlToMarkdown(textInput.value);
          debouncedStatIncrement(toolKey);
        } catch (e) { textOutput.value = `Error: ${e.message}`; }
      });
    }

    let statsTimeout = null;
    function debouncedStatIncrement(key) {
      if (statsTimeout) clearTimeout(statsTimeout);
      statsTimeout = setTimeout(() => {
        incrementDatabaseStat(key);
      }, 2000);
    }

    async function incrementDatabaseStat(key) {
      try {
        await fetch('/api/stats/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_key: key })
        });
      } catch (err) {
        console.error('Failed to log stats:', err);
      }
    }
  });
}
