import React, { useState, useRef, useEffect } from 'react';
import { AdvancedAIService, FileAnalysis, SemanticSearchResult } from '../services/AdvancedAIService';

interface AdvancedCommandInputProps {
  onCommand: (command: string, type: 'basic' | 'semantic' | 'advanced') => void;
  onFileAnalysis: (analysis: FileAnalysis[]) => void;
  currentPath?: string;
  files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>;
  aiService?: AdvancedAIService;
}

export const AdvancedCommandInput: React.FC<AdvancedCommandInputProps> = ({ 
  onCommand, 
  onFileAnalysis,
  currentPath, 
  files,
  aiService 
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchMode, setSearchMode] = useState<'basic' | 'semantic' | 'advanced'>('basic');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentFolder = currentPath ? currentPath.split('\\\\').pop() || 'directory' : 'directory';
  const hasSelectedDirectory = Boolean(currentPath);

  // Real examples based on actual test files
  const commandExamples = {
    basic: [
      'Find TTF font files',
      'Show Moonlight Sonata audio',
      'Find compiled C programs'
    ],
    semantic: [
      'Find documents about electronics and diodes',
      'Show me classical music files',
      'Find programming files and code'
    ],
    advanced: [
      'Organize audio files by genre (classical vs Bollywood)',
      'Find duplicate book cover images',
      'Group programming files by language type'
    ]
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSelectedDirectory) {
      alert('Please select a directory from the file tree first before searching.');
      return;
    }
    if (input.trim()) {
      setIsProcessing(true);
      
      try {
        if (searchMode === 'semantic' && aiService) {
          await handleSemanticSearch(input.trim());
        } else if (searchMode === 'advanced' && aiService) {
          await handleAdvancedCommand(input.trim());
        } else {
          onCommand(input.trim(), searchMode);
        }
      } catch (error) {
        console.error('Command processing failed:', error);
      } finally {
        setIsProcessing(false);
        setInput('');
      }
    }
  };

  const handleSemanticSearch = async (query: string) => {
    if (!aiService) return;

    try {
      // Generate embeddings for current files if not already done
      await aiService.generateFileEmbeddings(files.map(f => ({
        path: f.path,
        name: f.name
      })));

      // Perform semantic search
      const results = await aiService.semanticSearch(query);
      setSemanticResults(results);
      onCommand(query, 'semantic');
    } catch (error) {
      console.error('Semantic search failed:', error);
    }
  };

  const handleAdvancedCommand = async (command: string) => {
    if (!aiService) return;

    try {
      const context = {
        currentPath: currentPath || '',
        files
      };

      const result = await aiService.processComplexCommand(command, context);
      
      if (result.functionName) {
        // Handle function calling results
        console.log('AI wants to call function:', result.functionName, result.arguments);
        onCommand(`${command} [Advanced: ${result.functionName}]`, 'advanced');
      } else {
        onCommand(command, 'advanced');
      }
    } catch (error) {
      console.error('Advanced command processing failed:', error);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in this browser');
      return;
    }

    if (!hasSelectedDirectory) {
      alert('Please select a directory first');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const analyzeCurrentFiles = async () => {
    if (!aiService) return;

    setIsProcessing(true);
    const analyses: FileAnalysis[] = [];

    try {
      for (const file of files.slice(0, 10)) { // Analyze first 10 files
        const analysis = await aiService.analyzeFileContent(file.path);
        analyses.push(analysis);
      }
      
      onFileAnalysis(analyses);
    } catch (error) {
      console.error('File analysis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSmartSuggestions = async () => {
    if (!aiService) return;

    setIsProcessing(true);
    try {
      const suggestions = await aiService.generateSmartSuggestions(files);
      // Handle suggestions display
      console.log('Smart suggestions:', suggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col space-y-3">
      {/* Directory Selection Indicator */}
      {hasSelectedDirectory && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">
                AI-powered search in: 
              </span>
              <span className="text-sm font-mono text-blue-700 bg-white px-2 py-1 rounded">
                {currentFolder}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-blue-600">📁 {files.length} files</span>
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                ⚙️ Advanced
              </button>
            </div>
          </div>
        </div>
      )}
      
      {!hasSelectedDirectory && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-sm font-medium text-orange-800">Step 1:</span>
            <span className="text-sm text-orange-700">Select a directory from the file tree to begin</span>
          </div>
        </div>
      )}

      {/* Search Mode Selector */}
      {hasSelectedDirectory && (
        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg">
          <span className="text-xs font-medium text-gray-600">Search Mode:</span>
          <button
            onClick={() => setSearchMode('basic')}
            className={`text-xs px-3 py-1 rounded ${
              searchMode === 'basic' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            📋 Basic
          </button>
          <button
            onClick={() => setSearchMode('semantic')}
            className={`text-xs px-3 py-1 rounded ${
              searchMode === 'semantic' 
                ? 'bg-purple-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
            disabled={!aiService}
          >
            🧠 Semantic
          </button>
          <button
            onClick={() => setSearchMode('advanced')}
            className={`text-xs px-3 py-1 rounded ${
              searchMode === 'advanced' 
                ? 'bg-green-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
            disabled={!aiService}
          >
            🚀 Advanced
          </button>
        </div>
      )}

      {/* Advanced Options Panel */}
      {showAdvancedOptions && aiService && (
        <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-semibold text-gray-700">AI Tools</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={analyzeCurrentFiles}
              disabled={isProcessing}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              🔍 Analyze Files
            </button>
            <button
              onClick={generateSmartSuggestions}
              disabled={isProcessing}
              className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              💡 Smart Suggestions
            </button>
            <button
              onClick={() => onCommand('find similar files', 'advanced')}
              disabled={isProcessing}
              className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              🔄 Find Similar
            </button>
          </div>
        </div>
      )}

      {/* Command Input */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasSelectedDirectory 
                ? searchMode === 'basic' 
                  ? `🔍 Search in ${currentFolder}: "find PDFs", "show images", etc...`
                  : searchMode === 'semantic'
                  ? `🧠 Semantic search: "documents about budget", "images of charts", etc...`
                  : `🚀 Advanced AI: "organize by content", "find duplicates", etc...`
                : "Select a directory first, then enter your AI search command..."
            }
            disabled={!hasSelectedDirectory}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasSelectedDirectory 
                ? 'border-gray-300 bg-white' 
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          />
          {(isListening || isProcessing) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                isListening ? 'bg-red-500' : 'bg-blue-500'
              }`}></div>
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={handleVoiceInput}
          disabled={!hasSelectedDirectory || isProcessing}
          className={`px-4 py-2 rounded-lg border ${
            !hasSelectedDirectory || isProcessing
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : isListening
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
          title={hasSelectedDirectory ? "Voice input" : "Select a directory first"}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button
          type="submit"
          disabled={!hasSelectedDirectory || isProcessing}
          className={`px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            hasSelectedDirectory && !isProcessing
              ? searchMode === 'semantic'
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : searchMode === 'advanced'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isProcessing 
            ? '⏳ Processing...' 
            : hasSelectedDirectory 
              ? searchMode === 'semantic'
                ? '🧠 Semantic Search'
                : searchMode === 'advanced'
                ? '🚀 Advanced AI'
                : '🤖 Ask AI'
              : '📁 Select Directory First'
          }
        </button>
      </form>

      {/* Command Examples */}
      {hasSelectedDirectory && (
        <div className="bg-white border rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">
            💡 {searchMode.toUpperCase()} EXAMPLES
          </h4>
          <div className="space-y-1">
            {commandExamples[searchMode].map((example, index) => (
              <button
                key={index}
                onClick={() => setInput(example)}
                className="text-xs text-gray-600 p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 hover:border-blue-300 transition-colors w-full text-left"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Semantic Search Results */}
      {semanticResults.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-purple-700 mb-2">🧠 Semantic Search Results</h4>
          <div className="space-y-2">
            {semanticResults.slice(0, 5).map((result, index) => (
              <div key={index} className="text-xs bg-white p-2 rounded border">
                <div className="font-medium text-purple-800">{result.path.split(/[/\\]/).pop()}</div>
                <div className="text-purple-600">{result.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
