import React, { useState, useEffect } from 'react';
import { CommandInput } from './components/CommandInput';
import { AdvancedCommandInput } from './components/AdvancedCommandInput';
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

  const handlePathChange = async (newPath: string) => {
    setCurrentPath(newPath);
    // Clear previous search results and status when changing directory
    setSearchStatus('');
    setSelectedFiles([]);
    await readDirectory(newPath);
  };

  const handleFilePreview = (filePath: string) => {
    setPreviewFilePath(filePath);
    setIsPreviewOpen(true);
  };

  const handleFolderNavigation = async (folderPath: string) => {
    await handlePathChange(folderPath);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-800">Smart AI File Explorer</h1>
            {currentPath ? (
              <div className="mt-2">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="text-blue-600 font-medium mr-2">Selected Directory:</span>
                  <span className="bg-blue-50 px-2 py-1 rounded text-blue-700 text-xs font-mono">
                    📁 {currentPath.split('\\').slice(-2).join(' › ') || currentPath}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Full path: {currentPath}
                </p>
              </div>
            ) : (
              <p className="text-sm text-orange-600 mt-1">
                👈 Select a directory from the file tree to start searching
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right text-xs text-gray-500">
              <div>Files: {files.length}</div>
              {selectedFiles.length > 0 && (
                <div className="text-blue-600">Selected: {selectedFiles.length}</div>
              )}
              {advancedAIService && (
                <div className={useAdvancedInput ? "text-purple-600" : "text-blue-600"}>
                  {useAdvancedInput ? "🧠 Advanced AI" : "📋 Basic AI"}
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Settings
            </button>
            <button 
              onClick={() => setIsHelpOpen(true)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Help
            </button>
          </div>
        </div>
      </div>

      {/* Command Input */}
      <div className="bg-white border-b px-4 py-3">
        {useAdvancedInput && advancedAIService ? (
          <AdvancedCommandInput 
            onCommand={handleAdvancedCommand} 
            onFileAnalysis={handleFileAnalysis}
            currentPath={currentPath} 
            files={files.map(f => ({
              name: f.name,
              path: f.fullPath,
              modified: new Date(f.modified),
              size: parseInt(f.size) || 0,
              type: f.type
            }))}
            aiService={advancedAIService}
          />
        ) : (
          <CommandInput onCommand={handleCommand} currentPath={currentPath} />
        )}
        
        {/* AI Mode Toggle */}
        {advancedAIService && (
          <div className="mt-3 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {useAdvancedInput ? (
                <span>🚀 <strong>Advanced AI</strong> - Semantic search, file analysis & smart organization</span>
              ) : (
                <span>📋 <strong>Basic AI</strong> - Fast file type and keyword search</span>
              )}
            </div>
            <button
              onClick={() => setUseAdvancedInput(!useAdvancedInput)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                useAdvancedInput 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-md hover:shadow-lg'
              }`}
            >
              {useAdvancedInput ? '⬅️ Back to Basic' : '✨ Upgrade to Advanced AI'}
            </button>
          </div>
        )}
        
        {/* Welcome Message for Basic AI */}
        {!useAdvancedInput && !searchStatus && advancedAIService && (
          <div className="mt-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🚀</span>
                <div>
                  <div className="text-sm font-medium text-gray-800">Welcome to Smart AI File Explorer!</div>
                  <div className="text-xs text-gray-600 mt-1">
                    You're in <strong>Basic AI mode</strong> - perfect for fast file searches. Try commands like "find PDF files" or "show MP3 files".
                  </div>
                </div>
              </div>
              <button
                onClick={() => setUseAdvancedInput(true)}
                className="text-xs px-3 py-1 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors whitespace-nowrap"
              >
                ✨ Try Advanced
              </button>
            </div>
          </div>
        )}
        
        {/* Search Status */}
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
        {/* Sidebar */}
        <div className="w-64 bg-white border-r overflow-hidden flex flex-col">
          <FileTree currentPath={currentPath} onPathChange={handlePathChange} userDirectories={userDirectories} />
        </div>

        {/* File List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <FileList
            files={files}
            loading={loading}
            error={error}
            selectedFiles={selectedFiles}
            onFileSelect={setSelectedFiles}
            onFilePreview={handleFilePreview}
            onFolderNavigate={handleFolderNavigation}
          />
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
