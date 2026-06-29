import * as converters from '../utils/converters.js';

const dataModeMeta = {
  'json-yaml': { input: 'JSON Input', output: 'YAML Output', extension: 'yaml', mime: 'text/yaml' },
  'yaml-json': { input: 'YAML Input', output: 'JSON Output', extension: 'json', mime: 'application/json' },
  'json-csv': { input: 'JSON Input', output: 'CSV Output', extension: 'csv', mime: 'text/csv' },
  'csv-json': { input: 'CSV Input', output: 'JSON Output', extension: 'json', mime: 'application/json' },
  'xml-json': { input: 'XML Input', output: 'JSON Output', extension: 'json', mime: 'application/json' },
  'json-xml': { input: 'JSON Input', output: 'XML Output', extension: 'xml', mime: 'application/xml' }
};

export function initDataConverter(toolKey) {
  document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('data-input');
    const dataOutput = document.getElementById('data-output');
    const dataInputLabel = document.getElementById('data-input-label');
    const dataOutputLabel = document.getElementById('data-output-label');
    const dataFileInput = document.getElementById('data-file-input');

    const btnClearDataInput = document.getElementById('btn-clear-data-input');
    const btnLoadDataFile = document.getElementById('btn-load-data-file');
    const btnCopyDataOutput = document.getElementById('btn-copy-data-output');
    const btnDownloadDataOutput = document.getElementById('btn-download-data-output');

    const meta = dataModeMeta[toolKey];
    if (!meta) return;

    // Set labels
    if (dataInputLabel) dataInputLabel.textContent = meta.input;
    if (dataOutputLabel) dataOutputLabel.textContent = meta.output;

    // Conversion Trigger
    if (dataInput) {
      dataInput.addEventListener('input', triggerDataConversion);
    }

    if (btnClearDataInput) {
      btnClearDataInput.addEventListener('click', () => {
        dataInput.value = '';
        dataOutput.value = '';
      });
    }

    if (btnLoadDataFile) {
      btnLoadDataFile.addEventListener('click', () => dataFileInput.click());
    }

    if (dataFileInput) {
      dataFileInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          dataInput.value = event.target.result;
          triggerDataConversion();
        };
        reader.readAsText(file);
      });
    }

    if (btnCopyDataOutput) {
      btnCopyDataOutput.addEventListener('click', () => {
        if (!dataOutput.value) return;
        navigator.clipboard.writeText(dataOutput.value);
        alert('Copied output to clipboard!');
      });
    }

    if (btnDownloadDataOutput) {
      btnDownloadDataOutput.addEventListener('click', () => {
        const content = dataOutput.value;
        if (!content || content.startsWith('Conversion Error:')) return;
        
        const blob = new Blob([content], { type: meta.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted_data.${meta.extension}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        // Log MySQL Stat
        incrementDatabaseStat(toolKey);
      });
    }

    function triggerDataConversion() {
      const inputVal = dataInput.value.trim();
      if (!inputVal) {
        dataOutput.value = '';
        return;
      }

      try {
        let result = '';
        switch (toolKey) {
          case 'json-yaml':
            result = converters.jsonToYaml(inputVal);
            break;
          case 'yaml-json':
            result = converters.yamlToJson(inputVal);
            break;
          case 'json-csv':
            result = converters.jsonToCsv(inputVal);
            break;
          case 'csv-json':
            result = converters.csvToJson(inputVal);
            break;
          case 'xml-json':
            result = converters.xmlToJson(inputVal);
            break;
          case 'json-xml':
            result = converters.jsonToXml(inputVal);
            break;
        }
        dataOutput.value = result;
        
        // Log stat on a debounced delay during active typing
        debouncedStatIncrement(toolKey);
      } catch (error) {
        dataOutput.value = `Conversion Error:\n${error.message}`;
      }
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
