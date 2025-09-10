// preload.js - Bridge between Renderer and Main
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readDir: (path) => ipcRenderer.invoke('read-dir', path),
  searchFiles: (query, searchPath) => ipcRenderer.invoke('search-files', query, searchPath),
  fileOperation: (operation, files, destination) => ipcRenderer.invoke('file-operation', operation, files, destination),

  // AI integration
  processAICommand: (command) => ipcRenderer.invoke('process-ai-command', command),

  // System information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getUserHome: () => ipcRenderer.invoke('get-user-home'),
});
