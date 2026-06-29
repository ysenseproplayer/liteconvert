-- ==========================================
-- DDL & SEED DATA - LITECONVERT HUB
-- ==========================================

CREATE DATABASE IF NOT EXISTS liteconvert;
USE liteconvert;

-- 1. Tools definitions and CMS content
CREATE TABLE IF NOT EXISTS tools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tool_key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    page_description TEXT NOT NULL,
    seo_title VARCHAR(255) NOT NULL,
    seo_meta_desc TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    use_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tool-specific FAQs (SEO booster)
CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tool_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

-- 3. Administrative access
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEED ADMINISTRATIVE ACCOUNT
-- Username: admin
-- Password: admin123 (bcrypt hash)
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2a$10$XQxIsp.R2P3p2045FmK1kuJ3nQzEaZJ6i0Ue2rOlyJ6c/fP.W/TqS')
ON DUPLICATE KEY UPDATE id=id;

-- SEED 31 POPULAR CONVERTER TOOLS
INSERT INTO tools (tool_key, name, category, page_description, seo_title, seo_meta_desc) VALUES
-- Developer Utilities
('json-yaml', 'JSON to YAML Converter', 'Developer', 
 'Convert your raw JSON data structures into clean, indentation-perfect YAML specifications. This tool helps developers bridge configurations between client-side services and Kubernetes, Ansible, or docker-compose manifests.', 
 'JSON to YAML Converter - Instant Format Converter', 
 'Convert JSON to YAML instantly. High-performance developer tool with syntax validation, dynamic copy-paste, and clean exports.'),
 
('yaml-json', 'YAML to JSON Converter', 'Developer', 
 'Parse and convert complex YAML configurations into valid JSON formatting. Ideal for debuggers, API developers, and parsing YAML files directly in client applications.', 
 'YAML to JSON Converter - Online Formatting Tool', 
 'Transform YAML files to valid JSON instantly. Supports nested lists, complex arrays, and handles multi-document YAML inputs.'),

('json-csv', 'JSON to CSV Converter', 'Developer', 
 'Convert arrays of JSON objects into structured CSV (Comma-Separated Values) spreadsheet tables. Excellent for parsing REST API payloads into Excel or Google Sheets datasets.', 
 'JSON to CSV Converter - JSON Array to Table', 
 'Convert nested or flat JSON datasets into clean CSV formatting. Free spreadsheet parser tool with custom separator settings.'),

('csv-json', 'CSV to JSON Converter', 'Developer', 
 'Parse comma-separated data tables and convert them to clean arrays of JSON objects. Highly useful for databases seeds, data migrations, and formatting Excel sheet exports.', 
 'CSV to JSON Converter - Spreadsheet Data Parser', 
 'Convert tabular CSV lists into clean arrays of JSON objects. Features automatic datatype detection and supports empty rows skip.'),

('xml-json', 'XML to JSON Converter', 'Developer', 
 'Convert structured XML tags, schemas, and attributes into readable JSON files. Supports parsing element nodes, namespace configurations, and child arrays.', 
 'XML to JSON Converter - Translate XML Tags to JSON', 
 'Convert complex XML strings into structured JSON files. Built-in error logging for invalid elements and namespace tags.'),

('json-xml', 'JSON to XML Converter', 'Developer', 
 'Transform JSON structures into clean, nested XML elements. Helpful for developers connecting REST APIs with legacy systems or SOAP endpoints.', 
 'JSON to XML Converter - Convert JSON Data to XML Tags', 
 'Convert JSON files to valid XML schemas. Supports custom root elements, array child nodes, and self-closing tags.'),

('base64', 'Base64 Encoder/Decoder', 'Developer', 
 'Safely encode plain text strings into binary-safe Base64 strings, or decode Base64 codes back into readable text format. Uses standard RFC specifications.', 
 'Base64 Encoder & Decoder - Binary String Codec', 
 'Encode text to Base64 or decode Base64 strings back to normal characters. Online text encoder supporting UTF-8 formats.'),

('url-codec', 'URL Encoder/Decoder', 'Developer', 
 'Convert special characters and spaces inside URLs into percent-encoded formats (%20, etc.) for safe transfer over HTTP protocols, or decode them back to standard characters.', 
 'URL Encoder & Decoder - URL Percent Escape Tool', 
 'Encode query strings or decode percent-encoded URLs. Safe percent-encoding developer utility for query strings.'),

('jwt-decoder', 'JWT Token Decoder', 'Developer', 
 'Parse and verify the contents of JSON Web Tokens (JWT). Decodes headers, payloads, signatures, and dates (issued at, expiration) without sending data to servers.', 
 'JWT Decoder - Decode JSON Web Tokens Online', 
 'Decode JWT tokens locally in your browser. Inspect headers, payload variables, authentication variables, and expiry dates.'),

('hash-generator', 'SHA-256 & MD5 Hash Generator', 'Developer', 
 'Generate cryptographically secure hashes (MD5, SHA-1, SHA-256) locally from plain strings. Ideal for verifying checksums, creating database keys, and passwords salting.', 
 'SHA-256 & MD5 Hash Generator - Online Cryptography tool', 
 'Generate secure SHA-256, SHA-1, or MD5 cryptographic checksum hashes locally. Instant text to cipher tool.'),

('uuid-generator', 'UUID/GUID Generator', 'Developer', 
 'Generate cryptographically random UUID v4 (Universally Unique Identifier) or GUID values. Configure quantity, format options, and copy items instantly.', 
 'UUID Generator - Free GUID v4 Generator Online', 
 'Generate random and unique UUID v4 strings instantly. Ideal for database primary keys, testing, and mock servers.'),

('htaccess-generator', 'Redirect & .htaccess Generator', 'Developer', 
 'Generate server-side Apache .htaccess redirect codes instantly. Setup 301 Permanent Redirects, force HTTPS, block directories index, and block custom user agents.', 
 '.htaccess Redirect Generator - Apache Redirect Setup', 
 'Create valid .htaccess redirect rules. Configure WWW redirects, secure SSL rules, and custom folder password configurations.'),

('cron-generator', 'Cron Job Expression Generator', 'Developer', 
 'Construct and translate crontab schedules using visual builders. Generate cron job expressions and describe schedules in plain English (e.g. Every minute).', 
 'Cron Job Expression Generator - Crontab Scheduler', 
 'Generate cron job schedules using a visual picker. Describes expressions in plain English with syntax validation.'),

-- Designer & CSS Utilities
('hex-rgba', 'HEX to RGBA/HSLA Converter', 'Design', 
 'Convert HEX code formats into RGBA or HSLA codes, including alpha transparency settings. Supports auto-copy and visual color preview panels.', 
 'HEX to RGBA & HSLA Converter - Color Code Translator', 
 'Convert CSS HEX colors to RGBA or HSLA codes. Includes custom opacity ranges and visual palette generators.'),

('rgb-hex', 'RGB to HEX Converter', 'Design', 
 'Convert RGB and RGBA values into hex codes. Highly useful for graphic designers, web designers, and developers formatting color values.', 
 'RGB to HEX Converter - RGB Color Codes to HEX Code', 
 'Convert RGB color channels directly to standard HEX colors. Free color tool with visual picker and responsive display.'),

('color-palette', 'Harmonic Color Palette Generator', 'Design', 
 'Generate harmonic color schemes (Analogous, Monochromatic, Triadic, Tetradic) from a seed color. Export HEX lists for UI/UX projects.', 
 'Color Palette Generator - Harmonic Schemes Creator', 
 'Create professional color schemes from seed values. View, adjust, and copy HEX palettes instantly.'),

('css-gradient', 'CSS Gradient Code Generator', 'Design', 
 'Create linear and radial CSS background gradients visually. Adjust angle controls, insert color stops, preview outputs, and copy CSS values.', 
 'CSS Gradient Generator - Visual Background Gradients', 
 'Create gorgeous linear and radial CSS gradients. Dynamic preview panel with multi-stop color sliders.'),

('svg-optimizer', 'SVG Code Optimizer & Minifier', 'Design', 
 'Optimize vector graphics by minifying raw SVG markup. Removes metadata, editor headers, empty tags, and redundant attributes locally.', 
 'SVG Optimizer - Minify Vector SVG Files Online', 
 'Clean and compress SVG files locally. Reduce vector image size while preserving layouts and paths structure.'),

-- Text & Formatter Utilities
('md-html', 'Markdown to HTML Converter', 'Text', 
 'Convert rich text Markdown files (.md) into valid HTML elements. Supports headings, bold/italics, custom lists, link highlights, and code blocks.', 
 'Markdown to HTML Converter - Rich Text to HTML Code', 
 'Convert Markdown files to clean HTML code. Live visual rendering pane with quick copy utilities.'),

('html-md', 'HTML to Markdown Converter', 'Text', 
 'Transform HTML elements back into clean, text-based Markdown (.md) styling. Cleans tags, nested containers, lists, and links.', 
 'HTML to Markdown Converter - HTML tags to MD markup', 
 'Convert HTML code snippets into clean Markdown format. Cleans inline styles and formatting containers.'),

('case-changer', 'Text Case Changer & Slugify', 'Text', 
 'Transform strings of text into multiple formats: UPPERCASE, lowercase, Title Case, and slug-case (URL friendly slugs).', 
 'Text Case Changer - Slugify & Text Transformer', 
 'Change text case formats instantly. Convert headers to slugs, snake_case, camelCase, or UPPERCASE.'),

('diff-checker', 'Visual Text Diff Checker', 'Text', 
 'Compare two blocks of text and highlight addition, deletion, and modification differences side-by-side or inline in real-time.', 
 'Diff Checker - Compare Text Differences Online', 
 'Compare two documents and highlight word changes. Free text differences tool with inline previews.'),

('lorem-ipsum', 'Lorem Ipsum Text Generator', 'Text', 
 'Generate dummy placeholder text for layouts, mockups, and UI tests. Configure word limits, sentences count, or paragraphs density.', 
 'Lorem Ipsum Generator - Free Placeholder Text Generator', 
 'Generate clean Lorem Ipsum text. Choose between paragraphs, sentences, or lists. Free developer utility.'),

('binary-converter', 'String to Binary & Hex Converter', 'Text', 
 'Convert strings of characters into binary arrays or hexadecimal representations, and translate binary arrays back to standard text.', 
 'String to Binary & Hex Converter - Text to Binary Codec', 
 'Convert plain text to binary string or hexadecimal output. Useful for networking tests and cryptography.'),

-- Math & Unit Utilities
('timestamp-converter', 'Unix Timestamp & Date Converter', 'Math', 
 'Convert Unix epoch timestamps (seconds/milliseconds) into standard UTC and local dates, or translate calendar dates back into epoch time.', 
 'Unix Timestamp Converter - Epoch Date Translator', 
 'Convert Unix timestamps to calendar dates and vice-versa. Supports seconds and milliseconds parsing.'),

('number-converter', 'Binary/Hex Base Converter', 'Math', 
 'Convert integers between multiple base representations: Binary (Base 2), Octal (Base 8), Decimal (Base 10), and Hexadecimal (Base 16).', 
 'Number Base Converter - Binary, Octal, Decimal, Hex', 
 'Convert numbers between binary, octal, decimal, and hexadecimal bases. High performance math base converter.'),

('percentage-calculator', 'Percentage Math Calculator', 'Math', 
 'Compute percentage increases, percentage decreases, differences, or values calculations. Clear forms with instant outputs.', 
 'Percentage Calculator - Percentage Difference & Increase', 
 'Calculate percentage values, percentage increments, discounts, and differences. Simple inputs with instant results.'),

('roman-converter', 'Roman Numerals Converter', 'Math', 
 'Convert decimal integers (1-3999) into Roman Numerals (e.g. MMXVI), or translate Roman Numeral strings back to decimals.', 
 'Roman Numerals Converter - Integer to Roman translator', 
 'Convert decimal integers into Roman numerals and vice-versa. Built-in Roman syntax validator.'),

('px-rem', 'PX to REM Converter', 'Math', 
 'Convert design pixels (px) into relative CSS root em (rem) metrics based on a custom base size (e.g. 16px). Supports interactive scale tables.', 
 'PX to REM Converter - CSS px to rem translator', 
 'Convert pixels to relative rem CSS values. Dynamic grid output with adjustable base font size values.'),

('timezone-converter', 'Timezone Converter & UTC Compare', 'Math', 
 'Compare local times across global timezones. Add zone inputs, select offsets, compare time differences, and verify timezone details.', 
 'Timezone Converter - Global UTC Compare Tool', 
 'Convert times across multiple timezones. Add global zones to compare time differences dynamically.'),

('html-formatter', 'HTML Formatter & Minifier', 'Text', 
 'Beautify or minify HTML code sheets locally. Cleans nested tag alignment and collapses empty attributes.', 
 'HTML Formatter & Minifier - Markup Beautifier', 
 'Format or minify HTML markup. Free local code editor with instant copy and syntax cleanup.');


-- SEED DEFAULT FAQs FOR POPULAR TOOLS
INSERT INTO faqs (tool_id, question, answer, sort_order) VALUES
-- JSON to YAML
(1, 'What is JSON and why convert it to YAML?', 'JSON (JavaScript Object Notation) is a data format widely used in APIs. YAML (YAML Ain''t Markup Language) is often preferred for human-readable configuration files (like Kubernetes or Docker Compose). Converting to YAML makes editing configs easier.', 1),
(1, 'Is my data safe during JSON to YAML conversion?', 'Yes. The entire conversion runs locally inside your web browser. No data is sent to the server, preserving confidentiality.', 2),

-- PX to REM
(29, 'What is the base font size for PX to REM conversions?', 'The standard default base font size is 16px, which translates 1rem to 16px. You can adjust this base value directly in our converter settings to fit your CSS framework configurations.', 1),
(29, 'Why should I use REM instead of PX in CSS?', 'REM stands for root em. It allows your website layouts to scale proportionally based on the user''s browser font settings, improving responsive scaling and accessibility.', 2),

-- .htaccess redirect
(12, 'Where should I upload my generated .htaccess file?', 'The .htaccess file should be placed in the root directory (often public_html or var/www/html) of your Apache web server using FTP or your cPanel file manager.', 1),
(12, 'Will these redirects affect my website SEO?', 'Yes, but positively! Generating 301 redirects tells search engines that a page has permanently moved, preserving 90%+ of the SEO juice from the old URL.', 2),

-- Cron generator
(13, 'What are the five fields of a Cron job schedule?', 'The five fields in standard cron scheduler systems stand for: minute (0-59), hour (0-23), day of the month (1-31), month (1-12), and day of the week (0-6, with 0 representing Sunday).', 1);
