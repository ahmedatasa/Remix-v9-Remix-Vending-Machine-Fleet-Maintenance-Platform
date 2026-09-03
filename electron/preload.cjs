const { contextBridge, ipcRenderer } = require('electron');

// Secure context bridge - strictly adheres to contextIsolation & sandbox mandates
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  testServerUrl: (url) => ipcRenderer.invoke('test-server-url', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  onServerUrlChanged: (callback) => {
    const handler = (_event, url) => callback(url);
    ipcRenderer.on('server-url-changed', handler);
    return () => ipcRenderer.removeListener('server-url-changed', handler);
  }
});
