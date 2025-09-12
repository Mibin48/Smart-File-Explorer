import React, { useState, useEffect } from 'react';
import { FileTree } from './components/FileTree';
import { FileList } from './components/FileList';
import { FilePreview } from './components/FilePreview';
import { SettingsPanel } from './components/SettingsPanel';
import { HelpDialog } from './components/HelpDialog';
import { useFileSystem } from './hooks/useFileSystem';
import { createCommandProcessor, AICommand } from './commands/aiCommands';
import { AdvancedAIService, FileAnalysis } from './services/AdvancedAIService';
import { getSettingsService, AppSettings } from './services/SettingsService';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [userDirectories, setUserDirectories] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [aiProcessor, setAiProcessor] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [lastSearchCommand, setLastSearchCommand] = useState<string>('');
  const [advancedAIService, setAdvancedAIService] = useState<AdvancedAIService | null>(null);
  const [fileAnalyses, setFileAnalyses] = useState<FileAnalysis[]>([]);
  const [useAdvancedInput, setUseAdvancedInput] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'thumbnail'>('list');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [bookmarks, setBookmarks] = useState<{name: string, path: string}[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [settingsService] = useState(() => getSettingsService());
  const [appSettings, setAppSettings] = useState<AppSettings>(settingsService.getSettings());
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { files, loading, error, readDirectory, searchFiles, executeFileOperation } = useFileSystem();

  // Initialize user directories and AI processor
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get user directories
        const dirs = await (window as any).electronAPI.getUserHome();
        setUserDirectories(dirs);
        // Set default to TestFiles directory for demonstration
        const testFilesPath = 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles';
        setCurrentPath(testFilesPath);
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
          
          // Initialize Advanced AI Service but don't enable by default
          const advancedService = new AdvancedAIService(apiKey);
          setAdvancedAIService(advancedService);
          // Start with basic AI - user can upgrade to advanced
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
  
  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = () => {
      setShowBookmarks(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleAdvancedCommand = async (command: string, type: 'basic' | 'semantic' | 'advanced') => {
    setIsProcessing(true);
    setLastSearchCommand(command);
    
    try {
      if (type === 'semantic') {
        setSearchStatus('Performing semantic search...');
        // Semantic search is handled within AdvancedCommandInput
      } else if (type === 'advanced') {
        setSearchStatus('Processing advanced AI command...');
        
        // Check if it's a natural language operation
        const nlKeywords = ['organize', 'find similar', 'duplicate', 'categorize', 'suggest', 'rename', 'move all', 'delete all'];
        const isNaturalLanguageOp = nlKeywords.some(keyword => command.toLowerCase().includes(keyword));
        
        if (isNaturalLanguageOp) {
          await handleNaturalLanguageOperation(command);
        } else {
          // Advanced commands are handled within AdvancedCommandInput
        }
      } else {
        // Fall back to basic command processing
        await handleCommand(command);
        return;
      }
      
      setSearchStatus(`${type.toUpperCase()} command completed: "${command}"`);
    } catch (err) {
      console.error('Advanced command processing failed:', err);
      setSearchStatus('Advanced command processing failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleFileAnalysis = (analyses: FileAnalysis[]) => {
    setFileAnalyses(analyses);
    // File analysis completed - results would be displayed elsewhere if needed
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    // Apply settings changes to the app state
    if (newSettings.ai.enableAdvancedFeatures) {
      setUseAdvancedInput(true);
    }
  };


  const handleNaturalLanguageOperation = async (command: string) => {
    if (!advancedAIService) return;
    
    setIsProcessing(true);
    console.log('🧠 Processing natural language command...');
    
    try {
      const availableFiles = files.map(f => f.fullPath);
      const result = await advancedAIService.parseNaturalLanguageOperation(command, availableFiles);
      
      // Operation analysis completed
      console.log('Natural language operation result:', {
        operation: result.operation,
        confidence: Math.round(result.confidence * 100),
        safety: result.safetyLevel,
        explanation: result.explanation,
        targetFiles: result.targetFiles.length
      });
      
        // Note: Organization actions have been removed from the UI
        // if (result.confidence > 0.7 && result.safetyLevel !== 'dangerous') {
        //   Auto-execute operations would go here
        // }
    } catch (error) {
      console.error('Failed to process natural language command:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommand = async (command: string) => {
    setIsProcessing(true);
    setLastSearchCommand(command);
    setSearchStatus('Processing your command...');
    
    try {
      let aiCommand: AICommand;
      
      console.log('Processing command:', command);
      
      // Try to use OpenAI API first, fallback to local processing
      if (aiProcessor) {
        try {
          setSearchStatus('Using OpenAI to understand your command...');
          aiCommand = await aiProcessor.processCommand(command);
          console.log('OpenAI response:', aiCommand);
        } catch (err) {
          console.warn('OpenAI API failed, using fallback:', err);
          setSearchStatus('OpenAI failed, using local processing...');
          // Fallback to local processing via Electron main process
          aiCommand = await (window as any).electronAPI.processAICommand(command);
        }
      } else {
        setSearchStatus('Using local AI processing...');
        // Use local processing via Electron main process
        aiCommand = await (window as any).electronAPI.processAICommand(command);
      }
      
      console.log('AI Command result:', aiCommand);
      
      console.log('AI Command interpreted:', aiCommand.preview || `Interpreted as: ${aiCommand.type} - ${aiCommand.query}`);
      
      // Execute the command based on its type
      await executeAICommand(aiCommand);
      
    } catch (err) {
      console.error('Command processing failed:', err);
      setSearchStatus('Command processing failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };
  
  const executeAICommand = async (aiCommand: AICommand) => {
    try {
      switch (aiCommand.type) {
        case 'search':
          setSearchStatus('Executing search...');
          
          // Use enhanced search with parameters
          const searchParams = {
            query: aiCommand.query,
            fileTypes: aiCommand.parameters.fileTypes || [],
            minSize: aiCommand.parameters.minSize,
            modified: aiCommand.parameters.modified,
            searchTerm: aiCommand.parameters.searchTerm || aiCommand.query
          };
          
          console.log('Search parameters:', searchParams);
          console.log('Search path (current directory):', currentPath);
          
          // Search in the current directory
          await searchFiles(searchParams, currentPath);
          
          const dirName = currentPath.split('\\').pop() || 'directory';
          setSearchStatus(`Search completed for: "${lastSearchCommand}" in ${dirName}`);
          break;
          
        case 'organize':
          console.log('File organization feature would be executed here');
          break;
          
        case 'delete':
          if (selectedFiles.length > 0) {
            const success = await executeFileOperation('delete', selectedFiles);
            if (success) {
              setSelectedFiles([]);
              await readDirectory(currentPath); // Refresh the file list
            }
          } else {
            console.log('Please select files to delete first.');
          }
          break;
          
        case 'move':
        case 'copy':
          console.log(`${aiCommand.type} operation requires destination selection`);
          break;
          
        case 'preview':
          console.log('File preview feature would be executed here');
          break;
          
        default:
          console.log(`Unknown command type: ${aiCommand.type}`);
      }
    } catch (err) {
      console.error('Command execution failed:', err);
    }
  };

  const handlePathChange = async (newPath: string, updateHistory: boolean = true) => {
    if (updateHistory && newPath !== currentPath) {
      // Add to navigation history
      const newHistory = [...navigationHistory.slice(0, currentHistoryIndex + 1), newPath];
      setNavigationHistory(newHistory);
      setCurrentHistoryIndex(newHistory.length - 1);
    }
    
    setCurrentPath(newPath);
    // Clear previous search results and status when changing directory
    setSearchStatus('');
    setSelectedFiles([]);
    await readDirectory(newPath);
  };
  
  const navigateBack = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      const targetPath = navigationHistory[newIndex];
      handlePathChange(targetPath, false);
    }
  };
  
  const navigateForward = () => {
    if (currentHistoryIndex < navigationHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      const targetPath = navigationHistory[newIndex];
      handlePathChange(targetPath, false);
    }
  };

  const handleFilePreview = (filePath: string) => {
    setPreviewFilePath(filePath);
    setIsPreviewOpen(true);
  };

  const handleFolderNavigation = async (folderPath: string) => {
    await handlePathChange(folderPath);
  };

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
                  // You could add a toast notification here
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
            <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
              <span className="text-sm font-medium text-gray-700">📁 New</span>
              <span className="text-gray-400">▼</span>
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
            <div className="relative">
              <button 
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
                onClick={() => setShowBookmarks(!showBookmarks)}
              >
                ⭐ Bookmarks ({bookmarks.length})
              </button>
              {showBookmarks && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-64 z-50">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">Bookmarked Folders</h3>
                      <button 
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        onClick={() => {
                          if (currentPath) {
                            const folderName = currentPath.split('\\').pop() || 'Folder';
                            const newBookmark = { name: folderName, path: currentPath };
                            if (!bookmarks.some(b => b.path === currentPath)) {
                              setBookmarks([...bookmarks, newBookmark]);
                            }
                          }
                        }}
                      >
                        Add Current
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {bookmarks.length === 0 ? (
                        <p className="text-xs text-gray-500 py-2">No bookmarks yet</p>
                      ) : (
                        bookmarks.map((bookmark, index) => (
                          <div key={index} className="flex items-center justify-between py-1 hover:bg-gray-50 rounded px-2">
                            <button 
                              className="text-sm text-left flex-1 truncate hover:text-blue-600"
                              onClick={() => {
                                handlePathChange(bookmark.path);
                                setShowBookmarks(false);
                              }}
                            >
                              📁 {bookmark.name}
                            </button>
                            <button 
                              className="text-red-500 hover:text-red-700 text-xs ml-2"
                              onClick={() => {
                                setBookmarks(bookmarks.filter((_, i) => i !== index));
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                    // Clear the input after search
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
            
            <div className="border-t border-gray-200 mt-4">
              <div className="p-2">
                <div className="text-xs text-gray-500 mb-2">System Directories</div>
                <div className="space-y-1">
                  <button className="flex items-center space-x-2 w-full px-2 py-1 hover:bg-gray-100 rounded text-sm">
                    <span>🖥️</span>
                    <span>Desktop</span>
                  </button>
                  <button className="flex items-center space-x-2 w-full px-2 py-1 hover:bg-gray-100 rounded text-sm">
                    <span>📁</span>
                    <span>Documents</span>
                  </button>
                </div>
              </div>
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
    </div>
  );
};

export default App;
