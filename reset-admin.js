// reset-admin.js — run once to reset admin credentials
// Usage: node reset-admin.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'liteconvert',
  });

  const username = 'admin';
  const plainPassword = 'admin123';
  const hash = await bcrypt.hash(plainPassword, 10);

  // Delete existing admin(s) and insert fresh
  await pool.query('DELETE FROM admins');
  await pool.query(
    'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
    [username, hash]
  );

  // Verify it works
  const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
  const match = await bcrypt.compare(plainPassword, rows[0].password_hash);

  console.log('Admin account reset successfully!');
  console.log('  Username :', username);
  console.log('  Password :', plainPassword);
  console.log('  Hash OK  :', match);

  await pool.end();
  process.exit(0);
})();
