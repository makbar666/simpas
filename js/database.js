const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { ipcMain } = require('electron');

const dbPath = path.join(__dirname, '..', 'database', 'sipmas.db');
if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath));

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT,
    pangkat TEXT,
    jabatan TEXT,
    nrp TEXT UNIQUE,
    password TEXT,
    akses TEXT
  )`);
});

// Handler tambah anggota dengan hash password
ipcMain.handle('tambah-anggota', async (_, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const aksesGabung = data.akses.join(',');
      db.run(
        `INSERT INTO users (nama, pangkat, jabatan, nrp, password, akses) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.nama, data.pangkat, data.jabatan, data.nrp, hashedPassword, aksesGabung],
        function (err) {
          if (err) return reject(err.message);
          resolve({ success: true });
        }
      );
    } catch (err) {
      reject(err.message);
    }
  });
});

// Handler login dengan compare hash password
ipcMain.handle('login', async (_, { nrp, password }) => {
  return new Promise((resolve) => {
    db.get(`SELECT * FROM users WHERE nrp = ?`, [nrp], async (err, row) => {
      if (err || !row) return resolve({ success: false });
      const match = await bcrypt.compare(password, row.password);
      if (!match) return resolve({ success: false });
      resolve({ success: true, user: row });
    });
  });
});
