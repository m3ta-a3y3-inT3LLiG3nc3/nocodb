const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nocoDesktop', {
  platform: process.platform,
  version: process.versions.electron,
  getMcpConfig: () => ipcRenderer.invoke('get-mcp-config'),
  reconnectServer: (url) => ipcRenderer.invoke('reconnect-server', url),
  onServerStatus: (callback) => {
    ipcRenderer.on('server-status', (_event, value) => callback(value));
  },
});
