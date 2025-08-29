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

  db.run(`CREATE TABLE IF NOT EXISTS kehilangan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_surat TEXT UNIQUE,
    nama_pelapor TEXT,
    tanggal_laporan TEXT,           
    jenis TEXT,
    anggota_penanda_tangan TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

// ——— tambahkan di bawah handler 'login' ———
ipcMain.handle('get-users', async () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, nama, pangkat, jabatan, nrp, akses FROM users ORDER BY id DESC`,
      [],
      (err, rows) => {
        if (err) return reject(err.message);
        // Ubah akses string "A,B,C" → array ["A","B","C"]
        const mapped = rows.map(r => ({
          ...r,
          akses: (r.akses || '').split(',').filter(Boolean),
        }));
        resolve(mapped);
      }
    );
  });
});


// Simpan ringkas surat kehilangan
ipcMain.handle('simpan-kehilangan', async (_evt, data) => {
  // Data yang dipakai hanya 5 field ini
  const { no_surat, nama_pelapor, tanggal_laporan, jenis, anggota_penanda_tangan } = data || {};
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO kehilangan (no_surat, nama_pelapor, tanggal_laporan, jenis, anggota_penanda_tangan)
       VALUES (?, ?, ?, ?, ?)`,
      [no_surat, nama_pelapor, tanggal_laporan, jenis, anggota_penanda_tangan],
      function (err) {
        if (err) return reject(err.message);
        resolve({ success: true, id: this.lastID });
      }
    );
  });
});

// (Opsional) ambil daftar terakhir untuk debugging / list
ipcMain.handle('get-kehilangan', async (_evt) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, no_surat, nama_pelapor, tanggal_laporan, jenis, anggota_penanda_tangan
       FROM kehilangan ORDER BY id DESC LIMIT 100`,
      [],
      (err, rows) => {
        if (err) return reject(err.message);
        resolve(rows || []);
      }
    );
  });
});
