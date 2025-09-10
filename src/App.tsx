import React, { useState, useEffect } from 'react';
import { CommandInput } from './components/CommandInput';
import { AdvancedCommandInput } from './components/AdvancedCommandInput';
import { FileTree } from './components/FileTree';
import { ActionPreview } from './components/ActionPreview';
import { FileList } from './components/FileList';
import { SmartOrganizationPanel } from './components/SmartOrganizationPanel';
import { useFileSystem } from './hooks/useFileSystem';
import { createCommandProcessor, AICommand } from './commands/aiCommands';
import { AdvancedAIService, FileAnalysis } from './services/AdvancedAIService';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [userDirectories, setUserDirectories] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [actionPreview, setActionPreview] = useState<string>('');
  const [aiProcessor, setAiProcessor] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [lastSearchCommand, setLastSearchCommand] = useState<string>('');
  const [advancedAIService, setAdvancedAIService] = useState<AdvancedAIService | null>(null);
  const [fileAnalyses, setFileAnalyses] = useState<FileAnalysis[]>([]);
  const [useAdvancedInput, setUseAdvancedInput] = useState(false);
  const [showOrganizationPanel, setShowOrganizationPanel] = useState(false);
  const [organizationResults, setOrganizationResults] = useState<string>('');

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
          
          // Initialize Advanced AI Service
          const advancedService = new AdvancedAIService(apiKey);
          setAdvancedAIService(advancedService);
          setUseAdvancedInput(true); // Enable advanced features when API key is available
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
        setActionPreview('🧠 Using AI to understand the meaning of your search...');
        // Semantic search is handled within AdvancedCommandInput
      } else if (type === 'advanced') {
        setSearchStatus('Processing advanced AI command...');
        setActionPreview('🚀 Using advanced AI to process your request...');
        
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
      setActionPreview('Sorry, I couldn\'t process that advanced command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleFileAnalysis = (analyses: FileAnalysis[]) => {
    setFileAnalyses(analyses);
    setActionPreview('📊 File analysis completed! Check the results in the action panel.');
  };

  const handleOrganizationAction = async (action: string, files: string[], destination?: string) => {
    setIsProcessing(true);
    setOrganizationResults(`Executing ${action} on ${files.length} files...`);
    
    try {
      // In a real implementation, this would perform actual file operations
      switch (action) {
        case 'archive_duplicates':
          setOrganizationResults(`✅ Would archive ${files.length} duplicate files to ${destination}`);
          break;
        case 'create_folder':
          setOrganizationResults(`✅ Would create folder ${destination} and move ${files.length} files`);
          break;
        case 'move':
          setOrganizationResults(`✅ Would move ${files.length} files to ${destination}`);
          break;
        case 'rename':
          setOrganizationResults(`✅ Would rename ${files.length} files`);
          break;
        default:
          setOrganizationResults(`✅ Would perform ${action} on ${files.length} files`);
      }
      
      setActionPreview(organizationResults);
    } catch (error) {
      setOrganizationResults(`❌ Failed to execute ${action}: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNaturalLanguageOperation = async (command: string) => {
    if (!advancedAIService) return;
    
    setIsProcessing(true);
    setActionPreview('🧠 Processing natural language command...');
    
    try {
      const availableFiles = files.map(f => f.fullPath);
      const result = await advancedAIService.parseNaturalLanguageOperation(command, availableFiles);
      
      setActionPreview(`
        🎯 **Operation**: ${result.operation.toUpperCase()}
        🤖 **Confidence**: ${Math.round(result.confidence * 100)}%
        ⚠️ **Safety**: ${result.safetyLevel.toUpperCase()}
        📝 **Explanation**: ${result.explanation}
        📁 **Target Files**: ${result.targetFiles.length} files
      `);
      
      if (result.confidence > 0.7 && result.safetyLevel !== 'dangerous') {
        // Auto-execute high-confidence safe operations
        await handleOrganizationAction(result.operation, result.targetFiles, result.parameters.destination);
      }
    } catch (error) {
      setActionPreview('❌ Failed to process natural language command');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommand = async (command: string) => {
    setIsProcessing(true);
    setLastSearchCommand(command);
    setSearchStatus('Processing your command...');
    setActionPreview('Processing your command...');
    
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
      
      // Update preview based on AI response
      setActionPreview(aiCommand.preview || `Interpreted as: ${aiCommand.type} - ${aiCommand.query}`);
      
      // Execute the command based on its type
      await executeAICommand(aiCommand);
      
    } catch (err) {
      console.error('Command processing failed:', err);
      setSearchStatus('Command processing failed: ' + (err instanceof Error ? err.message : String(err)));
      setActionPreview('Sorry, I couldn\'t process that command. Please try again.');
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
          setActionPreview('File organization feature coming soon!');
          break;
          
        case 'delete':
          if (selectedFiles.length > 0) {
            const success = await executeFileOperation('delete', selectedFiles);
            if (success) {
              setSelectedFiles([]);
              await readDirectory(currentPath); // Refresh the file list
            }
          } else {
            setActionPreview('Please select files to delete first.');
          }
          break;
          
        case 'move':
        case 'copy':
          setActionPreview(`${aiCommand.type} operation requires destination selection - feature coming soon!`);
          break;
          
        case 'preview':
          setActionPreview('File preview feature coming soon!');
          break;
          
        default:
          setActionPreview(`Unknown command type: ${aiCommand.type}`);
      }
    } catch (err) {
      console.error('Command execution failed:', err);
      setActionPreview('Failed to execute command. Please try again.');
    }
  };

  const handlePathChange = async (newPath: string) => {
    setCurrentPath(newPath);
    // Clear previous search results and status when changing directory
    setSearchStatus('');
    setActionPreview('');
    setSelectedFiles([]);
    await readDirectory(newPath);
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
                <div className="text-purple-600">🧠 AI Enhanced</div>
              )}
            </div>
            <button 
              onClick={() => setShowOrganizationPanel(!showOrganizationPanel)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                showOrganizationPanel 
                  ? 'bg-purple-500 text-white hover:bg-purple-600' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
              disabled={!advancedAIService}
              title={advancedAIService ? 'Toggle Smart Organization Panel' : 'AI features require OpenAI API key'}
            >
              🧠 Smart AI
            </button>
            <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
              Settings
            </button>
            <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
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
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => setUseAdvancedInput(!useAdvancedInput)}
              className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              {useAdvancedInput ? '📋 Switch to Basic' : '🚀 Switch to Advanced AI'}
            </button>
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
          />
        </div>

        {/* Action Preview / Smart Organization Panel */}
        <div className="w-80 bg-white border-l overflow-hidden flex flex-col">
          {showOrganizationPanel ? (
            <SmartOrganizationPanel
              files={files.map(f => ({
                name: f.name,
                path: f.fullPath,
                modified: new Date(f.modified),
                size: parseInt(f.size) || 0,
                type: f.type
              }))}
              aiService={advancedAIService || undefined}
              onOrganizationAction={handleOrganizationAction}
            />
          ) : (
            <ActionPreview 
              preview={actionPreview} 
              currentPath={currentPath} 
              fileAnalyses={fileAnalyses}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
