// preload.js - Bridge between Renderer and Main
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readDir: (path) => ipcRenderer.invoke('read-dir', path),
  searchFiles: (query, searchPath) => ipcRenderer.invoke('search-files', query, searchPath),
  fileOperation: (operation, files, destination) => ipcRenderer.invoke('file-operation', operation, files, destination),
  createItem: (itemType, parentPath, itemName) => ipcRenderer.invoke('create-item', itemType, parentPath, itemName),
  createItemEnhanced: (itemType, parentPath, itemName, templateData) => ipcRenderer.invoke('create-item-enhanced', itemType, parentPath, itemName, templateData),
  
  // File preview operations
  readFileContent: (filePath, maxSize) => ipcRenderer.invoke('read-file-content', filePath, maxSize),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // Bookmark operations
  loadBookmarks: () => ipcRenderer.invoke('load-bookmarks'),
  saveBookmarks: (bookmarks) => ipcRenderer.invoke('save-bookmarks', bookmarks),

  // AI integration
  processAICommand: (command) => ipcRenderer.invoke('process-ai-command', command),

  // System information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getUserHome: () => ipcRenderer.invoke('get-user-home'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
});
