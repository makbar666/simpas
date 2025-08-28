const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (nrp, password) => ipcRenderer.invoke('login', { nrp, password }),
  tambahAnggota: (data) => ipcRenderer.invoke('tambah-anggota', data),
  getUsers: () => ipcRenderer.invoke('get-users'), // <— TAMBAKAN INI
});
