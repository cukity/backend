const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'guestbook',
  connectionLimit: 5,
});

const TABLE = `CREATE TABLE IF NOT EXISTS entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

// Create the table once the database is reachable.
(async () => {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query(TABLE);
      console.log('Database ready');
      break;
    } catch (err) {
      console.error(`Database not ready (attempt ${attempt}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
})();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/entries', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, author, message, created_at FROM entries ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post('/api/entries', async (req, res, next) => {
  try {
    const author = String(req.body.author || '').trim().slice(0, 80);
    const message = String(req.body.message || '').trim().slice(0, 2000);
    if (!author || !message) {
      return res.status(400).json({ error: 'Author and message are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO entries (author, message) VALUES (?, ?)',
      [author, message]
    );
    const [[row]] = await pool.query('SELECT id, author, message, created_at FROM entries WHERE id = ?', [result.insertId]);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/entries/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM entries WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Entry not found.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Guestbook listening on http://localhost:${port}`));
