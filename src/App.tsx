import React, { useState, useEffect, useCallback } from 'react';
import { FileTree } from './components/FileTree';
import { FileList } from './components/FileList';
import { FilePreview } from './components/FilePreview';
import { SettingsPanel } from './components/SettingsPanel';
import { HelpDialog } from './components/HelpDialog';
import { NewItemDialog } from './components/NewItemDialog';
import { BookmarkDialog } from './components/BookmarkDialog';
import { useFileSystem } from './hooks/useFileSystem';
import { createCommandProcessor, AICommand } from './commands/aiCommands';
import { AdvancedAIService, FileAnalysis } from './services/AdvancedAIService';
import { getSettingsService, AppSettings } from './services/SettingsService';

// Types
interface Bookmark {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  dateAdded: string;
}

interface UserDirectories {
  home: string;
  desktop: string;
  documents: string;
  downloads: string;
  pictures: string;
  videos: string;
  music: string;
  oneDrive: string;
}

const App: React.FC = () => {
  // Core state
  const [currentPath, setCurrentPath] = useState<string>('');
  const [userDirectories, setUserDirectories] = useState<UserDirectories | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // Navigation state
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'thumbnail'>('list');
  
  // Dialog states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);
  
  // Bookmark state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  
  // Clipboard and quick actions state
  const [clipboardFiles, setClipboardFiles] = useState<string[]>([]);
  const [clipboardOperation, setClipboardOperation] = useState<'copy' | 'cut' | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string>('');
  
  // AI and search state
  const [aiProcessor, setAiProcessor] = useState<any>(null);
  const [advancedAIService, setAdvancedAIService] = useState<AdvancedAIService | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [lastSearchCommand, setLastSearchCommand] = useState<string>('');
  const [useAdvancedInput, setUseAdvancedInput] = useState(false);
  
  // Settings
  const [settingsService] = useState(() => getSettingsService());
  const [appSettings, setAppSettings] = useState<AppSettings>(settingsService.getSettings());

  // File system hook
  const { files, loading, error, readDirectory, searchFiles, executeFileOperation } = useFileSystem();

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get user directories
        const dirs = await (window as any).electronAPI.getUserHome();
        setUserDirectories(dirs);
        
        // Set default to TestFiles directory using dynamic path
        const appPath = await (window as any).electronAPI.getAppPath();
        const testFilesPath = appPath ? `${appPath}\\TestFiles` : dirs?.home || 'C:\\';
        setCurrentPath(testFilesPath);
        
        // Load bookmarks
        try {
          const savedBookmarks = await (window as any).electronAPI.loadBookmarks();
          setBookmarks(savedBookmarks);
        } catch (err) {
          console.warn('Failed to load bookmarks:', err);
        }
      } catch (err) {
        console.warn('Failed to get user directories:', err);
        setCurrentPath('C:\\');
      }
      
      // Initialize AI processor
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey !== 'your_openai_api_key_here') {
        try {
          const processor = createCommandProcessor(apiKey);
          setAiProcessor(processor);
          
          const advancedService = new AdvancedAIService(apiKey);
          setAdvancedAIService(advancedService);
        } catch (err) {
          console.warn('Failed to initialize AI processor:', err);
        }
      }
    };
    
    initializeApp();
  }, []);
  
  // Load initial directory
  useEffect(() => {
    if (currentPath) {
      readDirectory(currentPath);
    }
  }, [readDirectory, currentPath]);
  
  // Save bookmarks whenever they change
  useEffect(() => {
    const saveBookmarks = async () => {
      try {
        await (window as any).electronAPI.saveBookmarks(bookmarks);
      } catch (err) {
        console.warn('Failed to save bookmarks:', err);
      }
    };
    
    if (bookmarks.length > 0) {
      saveBookmarks();
    }
  }, [bookmarks]);

  // Handle path navigation with history
  const handlePathChange = useCallback(async (newPath: string, updateHistory: boolean = true) => {
    if (updateHistory && newPath !== currentPath) {
      const newHistory = [...navigationHistory.slice(0, currentHistoryIndex + 1), newPath];
      setNavigationHistory(newHistory);
      setCurrentHistoryIndex(newHistory.length - 1);
    }
    
    setCurrentPath(newPath);
    setSearchStatus('');
    setSelectedFiles([]);
    await readDirectory(newPath);
  }, [currentPath, navigationHistory, currentHistoryIndex, readDirectory]);

  // Navigation functions
  const navigateBack = useCallback(() => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      const targetPath = navigationHistory[newIndex];
      handlePathChange(targetPath, false);
    }
  }, [currentHistoryIndex, navigationHistory, handlePathChange]);
  
  const navigateForward = useCallback(() => {
    if (currentHistoryIndex < navigationHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      const targetPath = navigationHistory[newIndex];
      handlePathChange(targetPath, false);
    }
  }, [currentHistoryIndex, navigationHistory, handlePathChange]);

  // File operations
  const handleFilePreview = useCallback((filePath: string) => {
    setPreviewFilePath(filePath);
    setIsPreviewOpen(true);
  }, []);

  const handleFolderNavigation = useCallback(async (folderPath: string) => {
    await handlePathChange(folderPath);
  }, [handlePathChange]);

  const handleOpenFile = useCallback(async (filePath: string) => {
    try {
      await (window as any).electronAPI.openFile(filePath);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, []);

  // Bookmark operations
  const handleAddBookmark = useCallback((name: string, path: string, type: 'folder' | 'file') => {
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      name,
      path,
      type,
      dateAdded: new Date().toISOString()
    };
    
    if (!bookmarks.some(b => b.path === path)) {
      setBookmarks([...bookmarks, newBookmark]);
    }
  }, [bookmarks]);

  // Quick action handlers
  const handleCopy = useCallback(() => {
    if (selectedFiles.length > 0) {
      setClipboardFiles(selectedFiles);
      setClipboardOperation('copy');
      setSearchStatus(`Copied ${selectedFiles.length} item(s) to clipboard`);
    }
  }, [selectedFiles]);

  const handleCut = useCallback(() => {
    if (selectedFiles.length > 0) {
      setClipboardFiles(selectedFiles);
      setClipboardOperation('cut');
      setSearchStatus(`Cut ${selectedFiles.length} item(s) to clipboard`);
    }
  }, [selectedFiles]);

  const handlePaste = useCallback(async () => {
    if (clipboardFiles.length > 0 && clipboardOperation && currentPath) {
      try {
        const operation = clipboardOperation === 'copy' ? 'copy' : 'move';
        const success = await executeFileOperation(operation, clipboardFiles, currentPath);
        
        if (success) {
          setSearchStatus(`${operation === 'copy' ? 'Copied' : 'Moved'} ${clipboardFiles.length} item(s)`);
          if (clipboardOperation === 'cut') {
            setClipboardFiles([]);
            setClipboardOperation(null);
          }
          await readDirectory(currentPath);
        }
      } catch (error) {
        setSearchStatus(`Failed to paste files: ${error}`);
      }
    }
  }, [clipboardFiles, clipboardOperation, currentPath, executeFileOperation, readDirectory]);

  const handleDelete = useCallback(async () => {
    if (selectedFiles.length > 0) {
      const success = await executeFileOperation('delete', selectedFiles);
      if (success) {
        setSelectedFiles([]);
        setSearchStatus(`Deleted ${selectedFiles.length} item(s)`);
        await readDirectory(currentPath);
      }
    }
  }, [selectedFiles, executeFileOperation, currentPath, readDirectory]);

  const handleRename = useCallback((filePath: string, currentName: string) => {
    setIsRenaming(filePath);
    setNewFileName(currentName);
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (isRenaming && newFileName.trim() && currentPath) {
      try {
        // This would need to be implemented in the main process
        const result = await (window as any).electronAPI.renameFile(isRenaming, newFileName.trim());
        if (result.success) {
          setSearchStatus(`Renamed file successfully`);
          await readDirectory(currentPath);
        } else {
          setSearchStatus(`Failed to rename: ${result.error}`);
        }
      } catch (error) {
        setSearchStatus(`Rename failed: ${error}`);
      }
      setIsRenaming(null);
      setNewFileName('');
    }
  }, [isRenaming, newFileName, currentPath, readDirectory]);

  const handleRenameCancel = useCallback(() => {
    setIsRenaming(null);
    setNewFileName('');
  }, []);

  // AI command processing
  const handleCommand = useCallback(async (command: string) => {
    setIsProcessing(true);
    setLastSearchCommand(command);
    setSearchStatus('Processing your command...');
    
    try {
      let aiCommand: AICommand;
      
      if (aiProcessor) {
        try {
          setSearchStatus('Using OpenAI to understand your command...');
          aiCommand = await aiProcessor.processCommand(command);
        } catch (err) {
          console.warn('OpenAI API failed, using fallback:', err);
          setSearchStatus('OpenAI failed, using local processing...');
          aiCommand = await (window as any).electronAPI.processAICommand(command);
        }
      } else {
        setSearchStatus('Using local AI processing...');
        aiCommand = await (window as any).electronAPI.processAICommand(command);
      }
      
      await executeAICommand(aiCommand);
      
    } catch (err) {
      console.error('Command processing failed:', err);
      setSearchStatus('Command processing failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  }, [aiProcessor, currentPath, selectedFiles, readDirectory]);

  const executeAICommand = useCallback(async (aiCommand: AICommand) => {
    try {
      switch (aiCommand.type) {
        case 'search':
          setSearchStatus('Executing search...');
          
          const searchParams = {
            query: aiCommand.query,
            fileTypes: aiCommand.parameters.fileTypes || [],
            minSize: aiCommand.parameters.minSize,
            modified: aiCommand.parameters.modified,
            searchTerm: aiCommand.parameters.searchTerm || aiCommand.query
          };
          
          await searchFiles(searchParams, currentPath);
          
          const dirName = currentPath.split('\\').pop() || 'directory';
          setSearchStatus(`Search completed for: "${lastSearchCommand}" in ${dirName}`);
          break;
          
        case 'delete':
          if (selectedFiles.length > 0) {
            const success = await executeFileOperation('delete', selectedFiles);
            if (success) {
              setSelectedFiles([]);
              await readDirectory(currentPath);
            }
          }
          break;
          
        default:
          console.log(`Unknown command type: ${aiCommand.type}`);
      }
    } catch (err) {
      console.error('Command execution failed:', err);
    }
  }, [currentPath, selectedFiles, searchFiles, executeFileOperation, readDirectory, lastSearchCommand]);

  // Settings change handler
  const handleSettingsChange = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings);
    if (newSettings.ai.enableAdvancedFeatures) {
      setUseAdvancedInput(true);
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-white">
      
      {/* Modern Ribbon-style Toolbar */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-4 py-2 shadow-lg border-b border-blue-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <button className="text-white bg-blue-800 hover:bg-blue-900 px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95">
                🏠 Home
              </button>
              <div className="w-px h-6 bg-blue-400 opacity-50"></div>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <span className="text-xs opacity-75">Quick Actions</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-xs text-blue-100">
              <span>📁</span>
              <span>{files.length} items</span>
            </div>
            {selectedFiles.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-blue-100">
                <span>✓</span>
                <span>{selectedFiles.length} selected</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center space-x-1 text-sm">
          <button className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-200 rounded">
            <span>🏠</span>
          </button>
          {currentPath && currentPath.split('\\').filter(Boolean).map((segment, index, array) => (
            <React.Fragment key={index}>
              <span className="text-gray-400">›</span>
              <button 
                className={`px-2 py-1 hover:bg-gray-200 rounded ${
                  index === array.length - 1 ? 'text-blue-600 font-medium' : 'text-gray-700'
                }`}
                onClick={() => {
                  const pathSegments = currentPath.split('\\').filter(Boolean);
                  const newPath = pathSegments.slice(0, index + 1).join('\\');
                  if (newPath.includes(':') && !newPath.endsWith(':\\')) {
                    handlePathChange(newPath.replace(':', ':\\'));
                  } else {
                    handlePathChange(newPath);
                  }
                }}
              >
                {segment.length > 15 ? segment.substring(0, 12) + '...' : segment}
              </button>
            </React.Fragment>
          ))}
          <div className="ml-auto flex items-center space-x-2">
            <button 
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
              onClick={() => {
                if (currentPath && navigator.clipboard) {
                  navigator.clipboard.writeText(currentPath);
                  console.log('Path copied to clipboard:', currentPath);
                }
              }}
              title="Copy current path to clipboard"
            >
              <span>📋</span>
              <span>Copy</span>
            </button>
            <span className="text-xs text-gray-400 max-w-xs truncate">{currentPath}</span>
          </div>
        </div>
      </div>
      
      {/* Enhanced Navigation and Action Buttons */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button 
                className={`p-2 rounded-md transition-all duration-200 ${
                  currentHistoryIndex <= 0 
                    ? 'opacity-30 cursor-not-allowed text-gray-400' 
                    : 'hover:bg-blue-50 hover:text-blue-600 text-gray-600 hover:shadow-sm'
                }`} 
                title="Back"
                onClick={navigateBack}
                disabled={currentHistoryIndex <= 0}
              >
                <span className="text-lg">←</span>
              </button>
              <button 
                className={`p-2 rounded-md transition-all duration-200 ${
                  currentHistoryIndex >= navigationHistory.length - 1 
                    ? 'opacity-30 cursor-not-allowed text-gray-400' 
                    : 'hover:bg-blue-50 hover:text-blue-600 text-gray-600 hover:shadow-sm'
                }`} 
                title="Forward"
                onClick={navigateForward}
                disabled={currentHistoryIndex >= navigationHistory.length - 1}
              >
                <span className="text-lg">→</span>
              </button>
              <div className="w-px h-6 bg-gray-200"></div>
              <button 
                className="p-2 rounded-md hover:bg-blue-50 hover:text-blue-600 text-gray-600 transition-all duration-200 hover:shadow-sm" 
                title="Up"
                onClick={() => {
                  if (currentPath) {
                    const parentPath = currentPath.split('\\').slice(0, -1).join('\\');
                    if (parentPath && parentPath !== currentPath) {
                      handlePathChange(parentPath.includes(':') && !parentPath.endsWith(':\\') ? parentPath + '\\' : parentPath);
                    }
                  }
                }}
              >
                <span className="text-lg">↑</span>
              </button>
              <button 
                className="p-2 rounded-md hover:bg-green-50 hover:text-green-600 text-gray-600 transition-all duration-200 hover:shadow-sm" 
                title="Refresh"
                onClick={() => {
                  if (currentPath) {
                    readDirectory(currentPath);
                  }
                }}
              >
                <span className="text-lg">🔄</span>
              </button>
            </div>
            <button 
              onClick={() => setIsNewItemDialogOpen(true)}
              className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
            >
              <span className="text-sm font-medium text-gray-700">📁 New</span>
              <span className="text-gray-400">+</span>
            </button>
            
            {/* Quick Action Buttons */}
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button 
                onClick={handleCopy}
                disabled={selectedFiles.length === 0}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedFiles.length === 0
                    ? 'opacity-30 cursor-not-allowed text-gray-400'
                    : 'hover:bg-blue-50 hover:text-blue-600 text-gray-600 hover:shadow-sm'
                }`}
                title="Copy selected files"
              >
                📋 Copy
              </button>
              <button 
                onClick={handleCut}
                disabled={selectedFiles.length === 0}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedFiles.length === 0
                    ? 'opacity-30 cursor-not-allowed text-gray-400'
                    : 'hover:bg-orange-50 hover:text-orange-600 text-gray-600 hover:shadow-sm'
                }`}
                title="Cut selected files"
              >
                ✂️ Cut
              </button>
              <button 
                onClick={handlePaste}
                disabled={clipboardFiles.length === 0}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  clipboardFiles.length === 0
                    ? 'opacity-30 cursor-not-allowed text-gray-400'
                    : 'hover:bg-green-50 hover:text-green-600 text-gray-600 hover:shadow-sm'
                }`}
                title={`Paste ${clipboardFiles.length} item(s)`}
              >
                📁 Paste
              </button>
              <div className="w-px h-6 bg-gray-200"></div>
              <button 
                onClick={handleDelete}
                disabled={selectedFiles.length === 0}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedFiles.length === 0
                    ? 'opacity-30 cursor-not-allowed text-gray-400'
                    : 'hover:bg-red-50 hover:text-red-600 text-gray-600 hover:shadow-sm'
                }`}
                title="Delete selected files"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-blue-500 text-white shadow-sm transform scale-105' 
                    : 'hover:bg-gray-50 text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setViewMode('list')}
              >
                📋 List
              </button>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-blue-500 text-white shadow-sm transform scale-105' 
                    : 'hover:bg-gray-50 text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setViewMode('grid')}
              >
                ⊞ Grid
              </button>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'thumbnail' 
                    ? 'bg-blue-500 text-white shadow-sm transform scale-105' 
                    : 'hover:bg-gray-50 text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setViewMode('thumbnail')}
              >
                🖼 Thumbnail
              </button>
            </div>
            <button 
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
              onClick={() => setIsBookmarkDialogOpen(true)}
            >
              ⭐ Bookmarks ({bookmarks.length})
            </button>
            <button 
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
              onClick={() => setUseAdvancedInput(!useAdvancedInput)}
            >
              🧠 {useAdvancedInput ? 'Basic' : 'Smart'} AI
            </button>
            <button 
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95" 
              onClick={() => setIsSettingsOpen(true)}
            >
              ⚙️ Settings
            </button>
            <button 
              className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95" 
              onClick={() => setIsHelpOpen(true)}
            >
              Help
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={`Search in ${currentPath ? currentPath.split('\\').pop() || 'current folder' : 'folder'}...`}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:shadow-md focus:shadow-lg text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const command = (e.target as HTMLInputElement).value;
                  if (command.trim()) {
                    handleCommand(command);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <button className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-1 hover:bg-blue-50 rounded">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          {useAdvancedInput && (
            <div className="flex items-center space-x-2 text-xs bg-purple-100 text-purple-700 px-3 py-2 rounded-lg">
              <span>✨</span>
              <span>AI Mode</span>
            </div>
          )}
        </div>
        {searchStatus && (
          <div className="mt-2 text-sm text-gray-600 flex items-center">
            {isProcessing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            )}
            <span className={isProcessing ? 'text-blue-600' : 'text-green-600'}>
              {searchStatus}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Enhanced Sidebar */}
        <div className="w-64 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 overflow-hidden flex flex-col shadow-sm">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📁</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">TestFiles</h3>
                  <div className="text-xs text-gray-600">{files.length} items</div>
                </div>
              </div>
              <button className="text-gray-500 hover:text-blue-600 transition-colors duration-200 p-1 hover:bg-blue-200 rounded">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Directory Tree */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-2">Directories</div>
              <FileTree currentPath={currentPath} onPathChange={handlePathChange} userDirectories={userDirectories} />
            </div>
          </div>
        </div>

        {/* Enhanced File List Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm">
          {/* Modern File List Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-3 shadow-sm">
            <div className="grid grid-cols-12 text-xs font-semibold text-gray-700 uppercase tracking-wide">
              <div className="col-span-6 flex items-center space-x-2">
                <span>Name</span>
                <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
              <div className="col-span-3 flex items-center space-x-2">
                <span>Date modified</span>
                <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
              <div className="col-span-2 flex items-center">Type</div>
              <div className="col-span-1 flex items-center">Size</div>
            </div>
          </div>
          
          {/* Enhanced File List Content */}
          <div className="flex-1 overflow-y-auto">
            <FileList
              files={files}
              loading={loading}
              error={error}
              selectedFiles={selectedFiles}
              onFileSelect={setSelectedFiles}
              onFilePreview={handleFilePreview}
              onFolderNavigate={handleFolderNavigation}
              viewMode={viewMode}
              onAddBookmark={handleAddBookmark}
              isRenaming={isRenaming}
              newFileName={newFileName}
              onRename={handleRename}
              onRenameConfirm={handleRenameConfirm}
              onRenameCancel={handleRenameCancel}
              onNewFileNameChange={setNewFileName}
            />
          </div>
          
          {/* Enhanced Status Bar */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-6 py-3 flex justify-between items-center text-xs text-gray-600 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium">{files.length} items</span>
              </div>
              {selectedFiles.length > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{selectedFiles.length} selected</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              {loading && (
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-500 border-t-transparent"></div>
              )}
              <span>{viewMode} view</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings Dialog */}
      <SettingsPanel
        settingsService={settingsService}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
      />
      
      {/* Help Dialog */}
      <HelpDialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
      
      {/* File Preview */}
      <FilePreview
        filePath={previewFilePath}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
      
      {/* New Item Dialog */}
      <NewItemDialog
        isOpen={isNewItemDialogOpen}
        onClose={() => setIsNewItemDialogOpen(false)}
        currentPath={currentPath}
        onItemCreated={() => {
          if (currentPath) {
            readDirectory(currentPath);
          }
        }}
      />
      
      {/* Bookmark Dialog */}
      <BookmarkDialog
        isOpen={isBookmarkDialogOpen}
        onClose={() => setIsBookmarkDialogOpen(false)}
        bookmarks={bookmarks}
        onBookmarkUpdate={setBookmarks}
        onNavigate={handlePathChange}
        onOpenFile={handleOpenFile}
        currentPath={currentPath}
      />
    </div>
  );
};

export default App;
