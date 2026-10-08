const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
  openCashDrawer: () => ipcRenderer.invoke('open-cash-drawer'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  onPrinterStatus: (callback) => ipcRenderer.on('printer-status', (_event, value) => callback(value)),
});
