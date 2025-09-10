// main.js - Electron Main Process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');

// Get user home directory
const userHome = os.homedir();

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading CDN resources in development
    },
  });

  // Load the built React app
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // In development, try loading the built version first
    const distHtmlPath = path.join(__dirname, 'dist', 'index.html');
    const rootHtmlPath = path.join(__dirname, 'index.html');
    
    if (require('fs').existsSync(distHtmlPath)) {
      win.loadFile(distHtmlPath);
    } else {
      win.loadFile(rootHtmlPath);
    }
  } else {
    // In production, always use the built version
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle directory read
ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const filePromises = entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      try {
        const stats = await fs.stat(fullPath);
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'Folder' : path.extname(entry.name).replace('.', '').toUpperCase() || 'File',
          modified: stats.mtime.toLocaleDateString(),
          size: entry.isDirectory() ? '-' : `${(stats.size / 1024).toFixed(1)} KB`,
          isDirectory: entry.isDirectory(),
          fullPath,
        };
      } catch (err) {
        // Skip files we can't access
        return null;
      }
    });

    const files = (await Promise.all(filePromises)).filter(Boolean);
    return files;
  } catch (err) {
    return { error: err.message };
  }
});

// Handle file operations with safety checks
ipcMain.handle('file-operation', async (event, operation, files, destination) => {
  try {
    switch (operation) {
      case 'delete':
        // Show confirmation dialog for destructive operations
        const result = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
          type: 'warning',
          buttons: ['Cancel', 'Delete'],
          defaultId: 0,
          cancelId: 0,
          title: 'Confirm Deletion',
          message: `Are you sure you want to delete ${files.length} item(s)?`,
          detail: 'This action cannot be undone.',
        });

        if (result.response === 1) {
          for (const file of files) {
            const stats = await fs.stat(file);
            if (stats.isDirectory()) {
              await fs.rmdir(file, { recursive: true });
            } else {
              await fs.unlink(file);
            }
          }
          return { success: true };
        }
        break;

      case 'move':
      case 'copy':
        for (const file of files) {
          const fileName = path.basename(file);
          const destPath = path.join(destination, fileName);

          if (operation === 'move') {
            await fs.rename(file, destPath);
          } else {
            await fs.copyFile(file, destPath);
          }
        }
        return { success: true };

      default:
        return { error: 'Unknown operation' };
    }
  } catch (err) {
    return { error: err.message };
  }
});

// Handle file search with advanced filtering
ipcMain.handle('search-files', async (event, searchParams, searchPath = userHome) => {
  try {
    console.log('main.js search-files called with:', { searchParams, searchPath });
    
    const results = [];
    const maxResults = 500;
    
    // Parse search parameters
    const {
      query = '',
      fileTypes = [],
      minSize = null,
      maxSize = null,
      modified = null,
      searchTerm = '*'
    } = typeof searchParams === 'string' ? { query: searchParams } : searchParams;
    
    console.log('Parsed search parameters:', { query, fileTypes, minSize, maxSize, modified, searchTerm });
    console.log(`Starting search in directory: ${searchPath}`);
    
    const dirName = searchPath.split('\\').pop() || 'unknown';
    console.log(`Directory name: ${dirName}`);
    
    // Test directory access
    try {
      const testEntries = await fs.readdir(searchPath, { withFileTypes: true });
      console.log(`Directory contains ${testEntries.length} entries`);
      console.log('First 5 entries:', testEntries.slice(0, 5).map(e => ({ name: e.name, isDir: e.isDirectory() })));
    } catch (err) {
      console.error('Cannot read directory:', err.message);
      return { error: `Cannot read directory: ${err.message}` };
    }
    
    // Size parsing helper
    const parseSize = (sizeStr) => {
      if (!sizeStr) return null;
      const match = sizeStr.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)/);
      if (!match) return null;
      
      const value = parseFloat(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 'b': return value;
        case 'kb': return value * 1024;
        case 'mb': return value * 1024 * 1024;
        case 'gb': return value * 1024 * 1024 * 1024;
        default: return null;
      }
    };
    
    // Date filtering helper
    const shouldIncludeByDate = (fileStats) => {
      if (!modified) return true;
      
      const now = new Date();
      const fileDate = new Date(fileStats.mtime);
      const daysDiff = (now - fileDate) / (1000 * 60 * 60 * 24);
      
      switch (modified.toLowerCase()) {
        case 'today':
          return daysDiff < 1;
        case 'this week':
          return daysDiff < 7;
        case 'last week':
          return daysDiff >= 7 && daysDiff < 14;
        case 'this month':
          return daysDiff < 30;
        case 'last month':
          return daysDiff >= 30 && daysDiff < 60;
        case 'recent':
          return daysDiff < 7;
        default:
          return true;
      }
    };
    
    const minSizeBytes = parseSize(minSize);
    const maxSizeBytes = parseSize(maxSize);
    
    const searchRecursive = async (dirPath, depth = 0) => {
      // For specific directory searches, limit depth to 2, for root searches allow up to 5
      const maxDepth = dirPath === searchPath ? 2 : 5;
      if (depth > maxDepth || results.length >= maxResults) return; // Limit depth and results
      
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        console.log(`Processing ${entries.length} entries in ${dirPath}`);
        
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          
          const fullPath = path.join(dirPath, entry.name);
          
          try {
            const stats = await fs.stat(fullPath);
            const fileExt = path.extname(entry.name).toLowerCase().replace('.', '');
            console.log(`Processing: ${entry.name} (ext: ${fileExt}, isDir: ${entry.isDirectory()})`);

            const fileTypesLower = (fileTypes || []).map(ft => String(ft).toLowerCase());

            // Type filter: if fileTypes provided, skip files not in the list
            if (!entry.isDirectory() && fileTypesLower.length > 0) {
              if (!fileTypesLower.includes(fileExt)) {
                console.log(`Type skip: ${entry.name} due to ext ${fileExt} not in [${fileTypesLower.join(', ')}]`);
                continue;
              } else {
                console.log(`Type match: ${entry.name} with ext ${fileExt} matches filter`);
              }
            }
            
            // Date filter
            if (!shouldIncludeByDate(stats)) {
              // console.debug(`Date skip: ${entry.name}`);
              continue;
            }
            
            // Size filter
            if (!entry.isDirectory()) {
              if (minSizeBytes && stats.size < minSizeBytes) {
                // console.debug(`Size(min) skip: ${entry.name}`);
                continue;
              }
              if (maxSizeBytes && stats.size > maxSizeBytes) {
                // console.debug(`Size(max) skip: ${entry.name}`);
                continue;
              }
            }
            
            // Text query matching is optional. When fileTypes are specified and the file passed the type filter,
            // we should include it even if the query text doesn't match the file name.
            const q = String(query || '').toLowerCase().trim();
            const matchesQuery = !q || entry.name.toLowerCase().includes(q) || fileExt.includes(q);
            const includeByType = !entry.isDirectory() && fileTypesLower.length > 0; // already passed type filter above
            
            console.log(`Inclusion check for ${entry.name}: query='${q}', matchesQuery=${matchesQuery}, includeByType=${includeByType}`);

            if (matchesQuery || includeByType) {
              console.log(`✓ Including: ${entry.name}`);
              const sizeInKB = entry.isDirectory() ? 0 : stats.size / 1024;
              const sizeDisplay = entry.isDirectory() ? '-' : 
                sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` :
                `${sizeInKB.toFixed(1)} KB`;
              
              results.push({
                name: entry.name,
                type: entry.isDirectory() ? 'Folder' : (fileExt.toUpperCase() || 'File'),
                modified: stats.mtime.toLocaleDateString(),
                size: sizeDisplay,
                isDirectory: entry.isDirectory(),
                fullPath,
                sizeBytes: stats.size,
                modifiedDate: stats.mtime
              });
            } else {
              console.log(`✗ Excluding: ${entry.name} (no match)`);
            }
            
            // Recursively search directories
            if (entry.isDirectory() && depth < 4) {
              await searchRecursive(fullPath, depth + 1);
            }
            
          } catch (err) {
            // Skip inaccessible files/directories
          }
        }
      } catch (err) {
        // Skip inaccessible directories
      }
    };
    
    await searchRecursive(searchPath);
    
    console.log(`Search completed, found ${results.length} results`);
    
    // Sort results by relevance and date
    results.sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.name.toLowerCase() === query.toLowerCase();
      const bExact = b.name.toLowerCase() === query.toLowerCase();
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      
      // Then by modification date (newest first)
      return new Date(b.modifiedDate) - new Date(a.modifiedDate);
    });
    
    console.log(`Returning ${results.length} sorted results`);
    return results;
  } catch (err) {
    return { error: err.message };
  }
});

// Handle AI command processing
ipcMain.handle('process-ai-command', async (event, command) => {
  try {
    console.log('Processing AI command:', command);
    
    const lowerInput = command.toLowerCase();
    const parameters = {};
    
    // Enhanced file type detection with priority order
    const specificTypeMap = {
      'pdf': ['pdf'],
      'jpg': ['jpg'],
      'jpeg': ['jpeg'],
      'png': ['png'],
      'gif': ['gif'],
      'mp4': ['mp4'],
      'mp3': ['mp3'],
      'txt': ['txt'],
      'doc': ['doc'],
      'docx': ['docx'],
      'xlsx': ['xlsx'],
      'pptx': ['pptx'],
    };
    
    const categoryTypeMap = {
      'document': ['doc', 'docx', 'txt', 'rtf', 'odt'], // Note: removed PDF from documents
      'image': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'],
      'video': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
      'audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
      'archive': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
      'code': ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'html', 'css'],
      'spreadsheet': ['xlsx', 'xls', 'csv', 'ods'],
      'presentation': ['pptx', 'ppt', 'odp'],
      'temporary': ['tmp', 'temp', 'cache', 'log']
    };
    
    // Detect file types - first check specific types, then categories
    let detectedFileTypes = [];
    
    // Check for specific file extensions first (higher priority)
    for (const [extension, types] of Object.entries(specificTypeMap)) {
      if (lowerInput.includes(extension)) {
        detectedFileTypes = [...detectedFileTypes, ...types];
      }
    }
    
    // If no specific types found, check categories
    if (detectedFileTypes.length === 0) {
      for (const [category, extensions] of Object.entries(categoryTypeMap)) {
        if (lowerInput.includes(category)) {
          detectedFileTypes = [...detectedFileTypes, ...extensions];
        }
      }
    }
    
    console.log(`Detected file types for "${command}": [${detectedFileTypes.join(', ')}]`);
    
    // Size detection
    const sizeMatch = lowerInput.match(/(\d+)\s*(mb|gb|kb|bytes?)/);
    if (sizeMatch) {
      parameters.minSize = sizeMatch[0];
    }
    
    // Time detection
    if (lowerInput.includes('today') || lowerInput.includes('this week') || lowerInput.includes('last week') ||
        lowerInput.includes('this month') || lowerInput.includes('last month') || lowerInput.includes('recent')) {
      const timeMatch = lowerInput.match(/(today|this week|last week|this month|last month|recent)/);
      if (timeMatch) parameters.modified = timeMatch[0];
    }
    
    // Check if this is a search command or a direct file type query
    const isSearchCommand = lowerInput.includes('find') || lowerInput.includes('search') || lowerInput.includes('show');
    const isDirectFileTypeQuery = detectedFileTypes.length > 0 && !isSearchCommand;
    
    if (isSearchCommand || isDirectFileTypeQuery) {
      const searchTerm = detectedFileTypes.length > 0 ? `*.{${detectedFileTypes.join(',')}}` : command;
      
      return {
        type: 'search',
        query: command,
        parameters: {
          ...parameters,
          fileTypes: detectedFileTypes,
          searchTerm
        },
        confidence: isDirectFileTypeQuery ? 0.9 : 0.8,
        preview: `Searching for ${detectedFileTypes.length > 0 ? detectedFileTypes.join(', ').toUpperCase() + ' files' : 'files'}${parameters.minSize ? ' larger than ' + parameters.minSize : ''}${parameters.modified ? ' modified ' + parameters.modified : ''}`
      };
    }
    
    if (lowerInput.includes('organize') || lowerInput.includes('sort')) {
      const folder = lowerInput.includes('download') ? path.join(userHome, 'Downloads') : 
                    lowerInput.includes('desktop') ? path.join(userHome, 'Desktop') :
                    lowerInput.includes('document') ? path.join(userHome, 'Documents') :
                    lowerInput.includes('picture') || lowerInput.includes('image') ? path.join(userHome, 'Pictures') :
                    lowerInput.includes('video') || lowerInput.includes('movie') ? path.join(userHome, 'Videos') :
                    lowerInput.includes('music') || lowerInput.includes('audio') ? path.join(userHome, 'Music') : 'current';
      
      return {
        type: 'organize',
        query: command,
        parameters: {
          by: 'file type',
          folder
        },
        confidence: 0.7,
        preview: `Organizing ${folder} folder by file type`
      };
    }
    
    if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
      return {
        type: 'delete',
        query: command,
        parameters: {
          ...parameters,
          fileTypes: detectedFileTypes
        },
        confidence: 0.6,
        preview: `⚠️ Planning to delete ${detectedFileTypes.length > 0 ? detectedFileTypes.join(', ') + ' files' : 'selected files'}`
      };
    }
    
    // Default fallback - if file types were detected, make it a search
    if (detectedFileTypes.length > 0) {
      return {
        type: 'search',
        query: command,
        parameters: {
          fileTypes: detectedFileTypes,
          searchTerm: `*.{${detectedFileTypes.join(',')}}`
        },
        confidence: 0.7,
        preview: `Searching for ${detectedFileTypes.join(', ').toUpperCase()} files`
      };
    }
    
    // True fallback for unrecognized commands
    return {
      type: 'search',
      query: command,
      parameters: {
        searchTerm: command
      },
      confidence: 0.5,
      preview: `Processing command: "${command}"`
    };
  } catch (err) {
    return { error: err.message };
  }
});

// Get user home directory
ipcMain.handle('get-user-home', async () => {
  return {
    home: userHome,
    desktop: path.join(userHome, 'Desktop'),
    documents: path.join(userHome, 'Documents'),
    downloads: path.join(userHome, 'Downloads'),
    pictures: path.join(userHome, 'Pictures'),
    videos: path.join(userHome, 'Videos'),
    music: path.join(userHome, 'Music'),
    oneDrive: path.join(userHome, 'OneDrive')
  };
});
