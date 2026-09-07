const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = {
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'guestbook',
  waitForConnections: true,
  connectionLimit: 5,
};
if (process.env.MYSQL_SOCKET || process.env.MYSQL_UNIX_PORT) {
  db.socketPath = process.env.MYSQL_SOCKET || process.env.MYSQL_UNIX_PORT;
} else {
  db.host = process.env.MYSQL_HOST || '127.0.0.1';
  db.port = Number(process.env.MYSQL_PORT || 3306);
}
const pool = mysql.createPool(db);

// Create the table once; retry in case MySQL starts after the app.
const ready = (async () => {
  for (let tries = 30; ; tries--) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        author VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      return;
    } catch (e) {
      if (tries <= 0) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
})();

app.get('/api/entries', async (req, res) => {
  try {
    await ready;
    const [rows] = await pool.query(
      'SELECT id, author, message, created_at FROM entries ORDER BY id DESC'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/entries', async (req, res) => {
  const author = String(req.body?.author || '').trim();
  const message = String(req.body?.message || '').trim();
  if (!author || !message) {
    return res.status(400).json({ error: 'author and message are required' });
  }
  try {
    await ready;
    const [r] = await pool.query(
      'INSERT INTO entries (author, message) VALUES (?, ?)',
      [author.slice(0, 100), message.slice(0, 2000)]
    );
    res.status(201).json({ id: r.insertId, author, message });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    await ready;
    const [r] = await pool.query('DELETE FROM entries WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'entry not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Guestbook listening on http://localhost:${port}`));
