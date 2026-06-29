import yaml from 'js-yaml';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';

// ==========================================
// IMAGE CONVERTER MODULE
// ==========================================
export function convertImage(file, targetFormat, options = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Apply width and height options if set, otherwise keep native resolution
        const width = options.width ? parseInt(options.width) : img.width;
        const height = options.height ? parseInt(options.height) : img.height;

        canvas.width = width;
        canvas.height = height;

        // Fill background white if converting to JPEG (to avoid black backgrounds on transparent PNGs)
        if (targetFormat === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        const quality = options.quality ? parseFloat(options.quality) / 100 : 0.92;
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas blob generation failed'));
          }
        }, targetFormat, quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ==========================================
// DATA FORMAT CONVERTERS
// ==========================================
export function jsonToYaml(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  return yaml.dump(parsed);
}

export function yamlToJson(yamlStr) {
  const parsed = yaml.load(yamlStr);
  return JSON.stringify(parsed, null, 2);
}

export function jsonToCsv(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  const data = Array.isArray(parsed) ? parsed : [parsed];
  return Papa.unparse(data);
}

export function csvToJson(csvStr) {
  const result = Papa.parse(csvStr, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }
  return JSON.stringify(result.data, null, 2);
}

export function xmlToJson(xmlStr) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
  
  // Check parsing errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error(parseError[0].textContent);
  }

  const parseNode = (node) => {
    // If text node
    if (node.nodeType === 3) return node.nodeValue.trim();
    if (node.nodeType === 1 && node.childNodes.length === 0) return '';

    const obj = {};
    if (node.attributes && node.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let j = 0; j < node.attributes.length; j++) {
        const attr = node.attributes.item(j);
        obj['@attributes'][attr.nodeName] = attr.nodeValue;
      }
    }

    let hasChildNodes = false;
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === 1) { // Element node
        hasChildNodes = true;
        const childName = child.nodeName;
        const childValue = parseNode(child);
        
        if (obj[childName] === undefined) {
          obj[childName] = childValue;
        } else {
          if (!Array.isArray(obj[childName])) {
            obj[childName] = [obj[childName]];
          }
          obj[childName].push(childValue);
        }
      } else if (child.nodeType === 3 && child.nodeValue.trim() !== '') {
        // Text child node
        return child.nodeValue.trim();
      }
    }
    return hasChildNodes ? obj : '';
  };

  const rootName = xmlDoc.documentElement.nodeName;
  const result = {};
  result[rootName] = parseNode(xmlDoc.documentElement);
  return JSON.stringify(result, null, 2);
}

export function jsonToXml(jsonStr) {
  const obj = JSON.parse(jsonStr);
  
  const buildXml = (val, name) => {
    let xml = '';
    if (Array.isArray(val)) {
      val.forEach(item => {
        xml += buildXml(item, name);
      });
    } else if (typeof val === 'object' && val !== null) {
      xml += `<${name}`;
      
      // Attributes first
      if (val['@attributes']) {
        Object.entries(val['@attributes']).forEach(([k, v]) => {
          xml += ` ${k}="${v}"`;
        });
      }
      xml += '>';
      
      // Node children
      Object.entries(val).forEach(([k, v]) => {
        if (k !== '@attributes') {
          xml += buildXml(v, k);
        }
      });
      xml += `</${name}>`;
    } else {
      xml += `<${name}>${val !== undefined && val !== null ? val : ''}</${name}>`;
    }
    return xml;
  };

  // Find root keys
  const keys = Object.keys(obj);
  if (keys.length !== 1) {
    throw new Error('JSON structure must have exactly one root element to convert to valid XML');
  }

  return '<?xml version="1.0" encoding="UTF-8"?>\n' + buildXml(obj[keys[0]], keys[0]);
}

export function markdownToHtml(mdStr) {
  let html = mdStr
    // Headers
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
    // Bold / Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Bullet Lists
    .replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '<br /><br />');

  return html;
}

export function htmlToMarkdown(htmlStr) {
  let md = htmlStr
    // Remove headers
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n')
    // Bold / Italic
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    // Preformatted Code
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    // Links
    .replace(/<a href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Lists
    .replace(/<ul>([\s\S]*?)<\/ul>/gi, '$1')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    // Paragraphs / Breaks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    // Strip other html tags
    .replace(/<[^>]+>/g, '');

  return md.trim();
}

// ==========================================
// DOCUMENTS COMPILER
// ==========================================
export function txtToPdf(txtStr) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });
  
  const margin = 15;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const maxLineWidth = pageWidth - (margin * 2);
  
  // Set font
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  
  // Wrap text
  const splitText = doc.splitTextToSize(txtStr, maxLineWidth);
  let y = margin;
  const lineHeight = 5;

  for (let i = 0; i < splitText.length; i++) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin; // Reset y on new page
    }
    doc.text(splitText[i], margin, y);
    y += lineHeight;
  }

  return doc.output('blob');
}

// ==========================================
// ENCODERS AND CODE FORMATTERS
// ==========================================
export function base64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export function base64Decode(str) {
  return decodeURIComponent(escape(atob(str)));
}

export function changeTextCase(str, caseType) {
  switch (caseType) {
    case 'upper':
      return str.toUpperCase();
    case 'lower':
      return str.toLowerCase();
    case 'title':
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    case 'slug':
      return str
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
    default:
      return str;
  }
}

export function formatHtmlCode(html) {
  let formatted = '';
  let indent = '';
  const tab = '  ';
  html.split(/>\s*</).forEach((element) => {
    if (element.match(/^\/\w/)) {
      indent = indent.substring(tab.length);
    }
    formatted += indent + '<' + element + '>\n';
    if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith('input') && !element.startsWith('img') && !element.startsWith('br') && !element.startsWith('hr')) {
      indent += tab;
    }
  });
  return formatted.substring(1, formatted.length - 2).trim();
}

export function minifyHtmlCode(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespaces
    .replace(/>\s+</g, '><') // Remove space between tags
    .trim();
}

export function formatCssCode(css) {
  let formatted = '';
  let indent = '';
  const tab = '  ';
  css.split('\n').forEach(line => {
    let cleanLine = line.trim();
    if (cleanLine.includes('}')) {
      indent = indent.substring(tab.length);
    }
    if (cleanLine !== '') {
      formatted += indent + cleanLine + '\n';
    }
    if (cleanLine.includes('{')) {
      indent += tab;
    }
  });
  
  // Fallback for flat string parsing
  if (!formatted.includes('\n') || formatted.split('\n').length <= 2) {
    return css
      .replace(/\s*([{\n};])\s*/g, '$1')
      .replace(/{/g, ' {\n  ')
      .replace(/;/g, ';\n  ')
      .replace(/\n\s*}/g, '\n}\n')
      .replace(/,\s*/g, ', ')
      .trim();
  }
  return formatted.trim();
}

export function minifyCssCode(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s*([{}|:;,])\s*/g, '$1') // Remove spacing around symbols
    .replace(/\s+/g, ' ') // Collapse other space
    .trim();
}

export function formatJsCode(js) {
  // Simple Indent-based JS Formatter
  let indent = 0;
  const tab = '  ';
  const lines = js.replace(/\s*([{};])\s*/g, '$1').split(/(?=[{}])|(?<=[{}])/);
  let formatted = '';
  
  lines.forEach(line => {
    let clean = line.trim();
    if (clean === '}') indent--;
    if (clean !== '') {
      formatted += tab.repeat(Math.max(0, indent)) + clean + '\n';
    }
    if (clean === '{') indent++;
  });
  return formatted.trim();
}

export function minifyJsCode(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
    .replace(/\/\/[^\n]*/g, '') // Inline comments
    .replace(/\s+/g, ' ') // Collapse whitespaces
    .replace(/\s*([+\-*/=<>!&|{}()\[\];,])\s*/g, '$1') // Spaces around operators
    .trim();
}
