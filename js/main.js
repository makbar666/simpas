const { app, BrowserWindow } = require('electron');
const path = require('path');

// Hubungkan database.js agar ipcMain aktif
require('./database');

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.maximize();

  // Load halaman login sebagai halaman awal
  win.loadFile(path.join(__dirname, '../html/login.html'));
}

app.whenReady().then(createWindow);
