const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'liteconvert_default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Set EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve public static assets
app.use(express.static(path.join(__dirname, 'public')));

// Database pool variable
let pool = null;
let dbConnected = false;
let dbError = null;

// Ensure a default admin exists (username: admin, password: admin123)
async function ensureAdmin() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM admins');
    if (rows[0].cnt === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);
      console.log('Default admin account created.');
    }
  } catch (e) {
    console.error('Failed to ensure admin account:', e);
  }
}

// Establish database connection pool
async function connectDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'liteconvert',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test the connection
    const connection = await pool.getConnection();
    connection.release();
    dbConnected = true;
    dbError = null;
    console.log('Database connected successfully.');
  } catch (error) {
    dbConnected = false;
    dbError = error.message;
    console.warn('Database connection failed. Serving guide screen.', error.message);
  }
}


// Route guard middleware for checking DB connection

app.use((req, res, next) => {
  if (!dbConnected && req.path !== '/db-setup' && !req.path.startsWith('/api/db-test')) {
    return res.redirect('/db-setup');
  }
  next();
});

// Admin Auth middleware
function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }
  next();
}

// Global Variables Middleware (makes lists of tools available in all EJS templates)
app.use(async (req, res, next) => {
  if (!dbConnected) return next();
  try {
    // Get enabled tools list for sidebars
    const [tools] = await pool.query('SELECT tool_key, name, category, enabled FROM tools ORDER BY category, name');
    const [stats] = await pool.query('SELECT SUM(use_count) as total FROM tools');
    
    res.locals.sidebarTools = tools.filter(t => t.enabled);
    res.locals.allTools = tools;
    res.locals.totalConversions = stats[0].total || 0;
    res.locals.adminLoggedIn = !!req.session.adminId;
    next();
  } catch (err) {
    console.error('Error fetching global view settings:', err);
    next();
  }
});

// ==========================================
// PUBLIC VIEW ROUTES
// ==========================================

// Database Connection Failure setup route
app.get('/db-setup', (req, res) => {
  if (dbConnected) return res.redirect('/');
  res.render('db-setup', {
    error: dbError,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    dbName: process.env.DB_NAME
  });
});

// Test Connection Endpoint
app.post('/api/db-test', async (req, res) => {
  const { host, user, password, dbName } = req.body;
  try {
    const testPool = mysql.createPool({ host, user, password, database: dbName });
    const connection = await testPool.getConnection();
    connection.release();
    testPool.end();
    
    // Save to .env persistently
    const envContent = `PORT=${PORT}\nDB_HOST=${host}\nDB_USER=${user}\nDB_PASSWORD=${password}\nDB_NAME=${dbName}\nSESSION_SECRET=${process.env.SESSION_SECRET || 'liteconvert_default_secret'}\n`;
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    
    // Re-trigger connection in pool
    await connectDatabase();
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Dashboard Main Route
app.get('/', async (req, res) => {
  try {
    const [stats] = await pool.query('SELECT SUM(use_count) as total FROM tools');
    const [activeToolsCount] = await pool.query('SELECT COUNT(*) as count FROM tools WHERE enabled = 1');
    const [tools] = await pool.query('SELECT tool_key, name, category, page_description, enabled, use_count FROM tools ORDER BY category, name');
    
    res.render('index', {
      totalConversions: stats[0].total || 0,
      activeCount: activeToolsCount[0].count,
      tools: tools
    });
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

// Tool Renderer Route
app.get('/tool/:key', async (req, res) => {
  const key = req.params.key;
  try {
    const [toolRows] = await pool.query('SELECT * FROM tools WHERE tool_key = ?', [key]);
    if (toolRows.length === 0) {
      return res.status(404).send('Tool Not Found');
    }
    
    const tool = toolRows[0];
    if (!tool.enabled) {
      return res.render('blocked', { toolName: tool.name });
    }
    
    // Fetch FAQs for this tool
    const [faqs] = await pool.query('SELECT question, answer FROM faqs WHERE tool_id = ? ORDER BY sort_order', [tool.id]);
    
    res.render('tool-container', {
      tool: tool,
      faqs: faqs
    });
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

// Increment Stats API
app.post('/api/stats/increment', async (req, res) => {
  const { tool_key } = req.body;
  if (!tool_key) return res.status(400).json({ error: 'Missing tool_key' });
  try {
    await pool.query('UPDATE tools SET use_count = use_count + 1 WHERE tool_key = ?', [tool_key]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMINISTRATIVE PORTAL ROUTES
// ==========================================

// Login Page
app.get('/admin/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

// Login POST Handler
app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.render('admin/login', { error: 'Invalid login details' });
    }
    
    const isMatch = await bcrypt.compare(password, rows[0].password_hash);
    if (!isMatch) {
      return res.render('admin/login', { error: 'Invalid login details' });
    }
    
    req.session.adminId = rows[0].id;
    req.session.adminUser = rows[0].username;
    res.redirect('/admin');
  } catch (err) {
    res.render('admin/login', { error: 'Server configuration error' });
  }
});

// Admin Logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Admin Panel Dashboard
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const [tools] = await pool.query('SELECT * FROM tools ORDER BY category, name');
    const [faqs] = await pool.query(`
      SELECT f.id, f.question, f.answer, t.name as tool_name, t.tool_key 
      FROM faqs f 
      JOIN tools t ON f.tool_id = t.id 
      ORDER BY t.name, f.sort_order
    `);
    const [stats] = await pool.query('SELECT SUM(use_count) as total FROM tools');
    
    // Load config settings from global options table or default to .env values
    const [activeToolsCount] = await pool.query('SELECT COUNT(*) as count FROM tools WHERE enabled = 1');

    res.render('admin/dashboard', {
      tools: tools,
      faqs: faqs,
      totalConversions: stats[0].total || 0,
      activeCount: activeToolsCount[0].count,
      username: req.session.adminUser
    });
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

// Update Tool Details CMS
app.post('/api/admin/tools/update', requireAdmin, async (req, res) => {
  const { tool_key, name, desc, seo_title, seo_meta_desc } = req.body;
  try {
    await pool.query(
      'UPDATE tools SET name = ?, page_description = ?, seo_title = ?, seo_meta_desc = ? WHERE tool_key = ?',
      [name, desc, seo_title, seo_meta_desc, tool_key]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Tool State CMS
app.post('/api/admin/tools/toggle', requireAdmin, async (req, res) => {
  const { tool_key, enabled } = req.body;
  try {
    await pool.query('UPDATE tools SET enabled = ? WHERE tool_key = ?', [enabled ? 1 : 0, tool_key]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add FAQ CMS
app.post('/api/admin/faqs/add', requireAdmin, async (req, res) => {
  const { tool_id, question, answer } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO faqs (tool_id, question, answer) VALUES (?, ?, ?)',
      [tool_id, question, answer]
    );
    res.json({ success: true, faq_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete FAQ CMS
app.post('/api/admin/faqs/delete', requireAdmin, async (req, res) => {
  const { faq_id } = req.body;
  try {
    await pool.query('DELETE FROM faqs WHERE id = ?', [faq_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Stats Log
app.post('/api/admin/stats/wipe', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE tools SET use_count = 0');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Boot Server - async init so DB connects before serving requests
async function init() {
  await connectDatabase();
  if (dbConnected) {
    await ensureAdmin();
  }
  // Bind to 0.0.0.0 so Render can reach the server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LiteConvert server listening on port ${PORT}`);
  });
}

init();

