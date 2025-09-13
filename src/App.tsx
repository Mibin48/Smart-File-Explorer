import React, { useState, useEffect, useCallback } from 'react';
import { FileTree } from './components/FileTree';
import { FileList } from './components/FileList';
import { FilePreview } from './components/FilePreview';
import { SettingsPanel } from './components/SettingsPanel';
import { HelpDialog } from './components/HelpDialog';
import { NewItemDialog } from './components/NewItemDialog';
import { BookmarkDialog } from './components/BookmarkDialog';
import { ContextualActionsPanel } from './components/ContextualActionsPanel';
import { ActionHistoryPanel } from './components/ActionHistoryPanel';
import { EnhancedChatPanel } from './components/EnhancedChatPanel';
import { getConversationalAIService } from './services/ConversationalAIService';
import { ConversationalCommandExecutor, FileSystemAPI } from './services/ConversationalCommandExecutor';
import { useFileSystem } from './hooks/useFileSystem';
import { createCommandProcessor, AICommand } from './commands/aiCommands';
import { AdvancedAIService, FileAnalysis } from './services/AdvancedAIService';
import { getSettingsService, AppSettings } from './services/SettingsService';
import { ContextualActionsService } from './services/ContextualActionsService';
import { FileInfo as ContextualFileInfo } from './types/ContextualActions';

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
  
  // Contextual actions state
  const [contextualActionsService, setContextualActionsService] = useState<ContextualActionsService | null>(null);
  const [isContextualActionsOpen, setIsContextualActionsOpen] = useState(false);
  const [selectedFileForActions, setSelectedFileForActions] = useState<ContextualFileInfo | null>(null);
  const [isActionHistoryOpen, setIsActionHistoryOpen] = useState(false);
  
  // Conversational AI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [conversationalCommandExecutor, setConversationalCommandExecutor] = useState<ConversationalCommandExecutor | null>(null);
  
  // Settings
  const [settingsService] = useState(() => getSettingsService());
  const [appSettings, setAppSettings] = useState<AppSettings>(settingsService.getSettings());
  
  // Update contextual actions service when API key changes
  useEffect(() => {
    if (appSettings.ai.openaiApiKey && contextualActionsService) {
      contextualActionsService.setApiKey(appSettings.ai.openaiApiKey);
    } else if (appSettings.ai.openaiApiKey && !contextualActionsService) {
      const newService = new ContextualActionsService(appSettings.ai.openaiApiKey);
      setContextualActionsService(newService);
    }
  }, [appSettings.ai.openaiApiKey, contextualActionsService]);

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
          
          const contextualService = new ContextualActionsService(apiKey);
          setContextualActionsService(contextualService);
          
          // Initialize conversational AI services
          const conversationalAI = getConversationalAIService();
          conversationalAI.setApiKey(apiKey);
          
          // Create file system API adapter
          const fileSystemAPI: FileSystemAPI = {
            readDirectory: async (path: string) => {
              await readDirectory(path);
              return files;
            },
            searchFiles: async (params: any, basePath: string) => {
              await searchFiles(params, basePath);
              return files;
            },
            executeFileOperation: async (operation: string, targetFiles: string[], destination?: string) => {
              return await executeFileOperation(operation, targetFiles, destination);
            },
            openFile: async (filePath: string) => {
              await (window as any).electronAPI.openFile(filePath);
            },
            renameFile: async (filePath: string, newName: string) => {
              return await (window as any).electronAPI.renameFile(filePath, newName);
            },
            createFolder: async (path: string, name: string) => {
              try {
                const result = await (window as any).electronAPI.createFolder(path, name);
                return { success: true };
              } catch (error) {
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
              }
            },
            createFile: async (path: string, name: string, content?: string) => {
              try {
                const result = await (window as any).electronAPI.createFile(path, name, content || '');
                return { success: true };
              } catch (error) {
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
              }
            }
          };
          
          const commandExecutor = new ConversationalCommandExecutor(fileSystemAPI);
          setConversationalCommandExecutor(commandExecutor);
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
  
  // Contextual actions handlers
  const handleShowContextualActions = useCallback((file: any) => {
    if (!contextualActionsService) return;
    
    // Convert file object to ContextualFileInfo format
    const fileInfo: ContextualFileInfo = {
      name: file.name,
      path: file.path || currentPath,
      fullPath: file.fullPath || `${currentPath}\\${file.name}`,
      size: file.size || 0,
      isDirectory: file.isDirectory || false,
      extension: file.extension || '',
      lastModified: file.lastModified || new Date(),
      content: file.content
    };
    
    setSelectedFileForActions(fileInfo);
    setIsContextualActionsOpen(true);
  }, [contextualActionsService, currentPath]);
  
  const handleContextualActionExecuted = useCallback((result: any) => {
    console.log('Action executed:', result);
    // Refresh the file list if needed
    if (result.success && (result.actionId.includes('move') || result.actionId.includes('rename') || result.actionId.includes('delete'))) {
      readDirectory(currentPath);
    }
  }, [readDirectory, currentPath]);
  
  // Conversational AI command execution handler
  const handleExecuteConversationalCommand = useCallback(async (command: any) => {
    if (!conversationalCommandExecutor) {
      throw new Error('Conversational command executor not initialized');
    }
    
    // Update executor context with current app state
    conversationalCommandExecutor.setContext(currentPath, selectedFiles);
    
    // Execute the command
    const result = await conversationalCommandExecutor.executeCommand(command);
    
    // Refresh file list if needed
    if (result.success && ['list', 'search', 'delete', 'move', 'copy', 'rename', 'create', 'organize'].includes(command.action)) {
      setTimeout(() => readDirectory(currentPath), 500);
    }
    
    return result;
  }, [conversationalCommandExecutor, currentPath, selectedFiles, readDirectory]);

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden">
      
      {/* Modern Ribbon-style Toolbar */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-4 py-1.5 shadow-lg border-b border-blue-500 flex-shrink-0">
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
      <div className="bg-white border-b border-gray-200 px-4 py-2 shadow-sm flex-shrink-0">
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
      
      {/* Beautiful Modern Toolbar */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/70 px-6 py-4 shadow-lg backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between space-x-4">
          {/* Left Side: Navigation Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 p-1 hover:shadow-xl transition-all duration-300">
              <button 
                className={`p-2 rounded-lg transition-all duration-300 transform hover:scale-110 ${
                  currentHistoryIndex <= 0 
                    ? 'opacity-40 cursor-not-allowed text-slate-400' 
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 text-slate-600 hover:shadow-md'
                }`} 
                title="Back"
                onClick={navigateBack}
                disabled={currentHistoryIndex <= 0}
              >
                <span className="text-base font-semibold">←</span>
              </button>
              <button 
                className={`p-2 rounded-lg transition-all duration-300 transform hover:scale-110 ${
                  currentHistoryIndex >= navigationHistory.length - 1 
                    ? 'opacity-40 cursor-not-allowed text-slate-400' 
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 text-slate-600 hover:shadow-md'
                }`} 
                title="Forward"
                onClick={navigateForward}
                disabled={currentHistoryIndex >= navigationHistory.length - 1}
              >
                <span className="text-base font-semibold">→</span>
              </button>
              <div className="w-px h-5 bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-1"></div>
              <button 
                className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 text-slate-600 transition-all duration-300 hover:shadow-md transform hover:scale-110" 
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
                <span className="text-base font-semibold">↑</span>
              </button>
              <button 
                className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-600 text-slate-600 transition-all duration-300 hover:shadow-md transform hover:scale-110" 
                title="Refresh"
                onClick={() => {
                  if (currentPath) {
                    readDirectory(currentPath);
                  }
                }}
              >
                <span className="text-base">🔄</span>
              </button>
            </div>
            <button 
              onClick={() => setIsNewItemDialogOpen(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-white to-slate-50 rounded-xl shadow-lg border border-slate-200/50 px-4 py-2.5 hover:shadow-xl hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 transition-all duration-300 transform hover:scale-105 text-sm font-medium"
            >
              <span className="text-slate-700">📁</span>
              <span className="font-semibold text-slate-700">New</span>
              <span className="text-slate-400 font-light">+</span>
            </button>
          </div>
          
          {/* Center: Beautiful Action Buttons */}
          <div className="flex items-center space-x-1.5">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 p-1.5">
              <button 
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105' 
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-slate-700 hover:text-blue-600 hover:shadow-md'
                } w-[54px] h-[36px] flex items-center justify-center`}
                onClick={() => setViewMode('list')}
              >
                📋 List
              </button>
              <button 
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 ${
                  viewMode === 'grid' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105' 
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-slate-700 hover:text-blue-600 hover:shadow-md'
                } w-[54px] h-[36px] flex items-center justify-center`}
                onClick={() => setViewMode('grid')}
              >
                ⊞ Grid
              </button>
              <button 
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 ${
                  viewMode === 'thumbnail' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105' 
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-slate-700 hover:text-blue-600 hover:shadow-md'
                } w-[76px] h-[36px] flex items-center justify-center`}
                onClick={() => setViewMode('thumbnail')}
              >
                🖼 Thumbnail
              </button>
            </div>
            
            {/* Elegant Separator */}
            <div className="w-px h-7 bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-2"></div>
            
            {/* Feature Buttons */}
            <button 
              className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-amber-900 px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-110 active:scale-95 w-[80px] h-[36px] flex items-center justify-center backdrop-blur-sm"
              onClick={() => setIsBookmarkDialogOpen(true)}
            >
              ⭐ Bookmarks
            </button>
            <button 
              className="bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-110 active:scale-95 w-[76px] h-[36px] flex items-center justify-center backdrop-blur-sm"
              onClick={() => setUseAdvancedInput(!useAdvancedInput)}
            >
              🧠 Smart AI
            </button>
            {contextualActionsService && (
              <button 
                className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-700 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-110 active:scale-95 w-[86px] h-[36px] flex items-center justify-center backdrop-blur-sm"
                onClick={() => setIsContextualActionsOpen(!isContextualActionsOpen)}
              >
                🤖 Smart Actions
              </button>
            )}
            <button 
              className="bg-gradient-to-r from-orange-500 via-red-400 to-orange-600 hover:from-orange-600 hover:to-red-500 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-110 active:scale-95 w-[66px] h-[36px] flex items-center justify-center backdrop-blur-sm"
              onClick={() => setIsActionHistoryOpen(true)}
              title="View Action History"
            >
              📋 History
            </button>
            <button 
              className="bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-110 active:scale-95 w-[66px] h-[36px] flex items-center justify-center backdrop-blur-sm"
              onClick={() => setIsChatOpen(true)}
              title="Open AI Chat Assistant"
            >
              💬 Chat AI
            </button>
            <button 
              className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:to-cyan-700 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-110 active:scale-95 w-[66px] h-[36px] flex items-center justify-center backdrop-blur-sm" 
              onClick={() => setIsSettingsOpen(true)}
            >
              ⚙️ Settings
            </button>
            <button 
              className="bg-gradient-to-r from-slate-400 via-gray-500 to-slate-500 hover:from-slate-500 hover:to-gray-600 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-110 active:scale-95 w-[34px] h-[36px] flex items-center justify-center backdrop-blur-sm" 
              onClick={() => setIsHelpOpen(true)}
            >
              ❓
            </button>
          </div>
          
          {/* Right Side: Elegant Quick Action Buttons */}
          <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 p-1 hover:shadow-xl transition-all duration-300">
            <button 
              onClick={handleCopy}
              disabled={selectedFiles.length === 0}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 ${
                selectedFiles.length === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 text-slate-600 hover:shadow-md'
              }`}
              title="Copy selected files"
            >
              📋 Copy
            </button>
            <button 
              onClick={handleCut}
              disabled={selectedFiles.length === 0}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 ${
                selectedFiles.length === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:text-orange-600 text-slate-600 hover:shadow-md'
              }`}
              title="Cut selected files"
            >
              ✂️ Cut
            </button>
            <button 
              onClick={handlePaste}
              disabled={clipboardFiles.length === 0}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 ${
                clipboardFiles.length === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-600 text-slate-600 hover:shadow-md'
              }`}
              title={`Paste ${clipboardFiles.length} item(s)`}
            >
              📁 Paste
            </button>
            <div className="w-px h-5 bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-1"></div>
            <button 
              onClick={handleDelete}
              disabled={selectedFiles.length === 0}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 ${
                selectedFiles.length === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:text-red-600 text-slate-600 hover:shadow-md'
              }`}
              title="Delete selected files"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-4 py-2 shadow-sm flex-shrink-0">
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
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-2 flex-shrink-0">
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
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-2">Directories</div>
              <FileTree currentPath={currentPath} onPathChange={handlePathChange} userDirectories={userDirectories} />
            </div>
          </div>
        </div>

        {/* Enhanced File List Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm min-h-0">
          {/* Modern File List Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-2 shadow-sm flex-shrink-0">
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
          <div className="flex-1 overflow-y-auto min-h-0">
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
              onShowContextualActions={handleShowContextualActions}
            />
          </div>
          
          {/* Enhanced Status Bar */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-6 py-2 flex justify-between items-center text-xs text-gray-600 shadow-sm flex-shrink-0">
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
      
      {/* Contextual Actions Panel */}
      {contextualActionsService && (
        <div className={`fixed right-4 top-20 w-96 max-h-[80vh] z-40 transition-all duration-300 ${
          isContextualActionsOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}>
          <ContextualActionsPanel
            selectedFile={selectedFileForActions}
            contextualActionsService={contextualActionsService}
            onActionExecuted={handleContextualActionExecuted}
            onClose={() => {
              setIsContextualActionsOpen(false);
              setSelectedFileForActions(null);
            }}
          />
        </div>
      )}
      
      {/* Action History Panel */}
      <ActionHistoryPanel
        isOpen={isActionHistoryOpen}
        onClose={() => setIsActionHistoryOpen(false)}
      />
      
      {/* Enhanced Conversational Chat Panel */}
      <EnhancedChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentPath={currentPath}
        selectedFiles={selectedFiles}
        recentFiles={files.slice(0, 10).map(f => f.name)}
        onExecuteCommand={handleExecuteConversationalCommand}
      />
    </div>
  );
};

export default App;
