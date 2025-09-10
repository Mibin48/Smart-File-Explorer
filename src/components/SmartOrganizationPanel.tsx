import React, { useState, useEffect } from 'react';
import { AdvancedAIService } from '../services/AdvancedAIService';

interface SmartOrganizationPanelProps {
  files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>;
  aiService?: AdvancedAIService;
  onOrganizationAction: (action: string, files: string[], destination?: string) => void;
}

interface DuplicateGroup {
  original: string;
  duplicates: string[];
  confidence: number;
}

interface CategoryGroup {
  category: string;
  files: string[];
  confidence: number;
  description: string;
}

interface OrganizationSuggestion {
  type: 'folder' | 'rename' | 'move' | 'archive';
  description: string;
  targetPath: string;
  confidence: number;
  files: string[];
}

export const SmartOrganizationPanel: React.FC<SmartOrganizationPanelProps> = ({
  files,
  aiService,
  onOrganizationAction
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [suggestions, setSuggestions] = useState<OrganizationSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'duplicates' | 'categories' | 'suggestions'>('duplicates');

  const analyzeFiles = async () => {
    if (!aiService || files.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Run all analyses in parallel
      const [duplicateResults, categoryResults, suggestionResults] = await Promise.all([
        aiService.detectDuplicates(files),
        aiService.categorizeFiles(files),
        aiService.generateSmartSuggestions(files)
      ]);

      setDuplicates(duplicateResults);
      setCategories(categoryResults);
      
      // Convert smart suggestions to our format
      const organizationSuggestions: OrganizationSuggestion[] = suggestionResults.map(suggestion => ({
        type: suggestion.action === 'move' ? 'move' : 
              suggestion.action === 'rename' ? 'rename' : 
              suggestion.action === 'categorize' ? 'folder' : 'archive',
        description: suggestion.reason,
        targetPath: suggestion.destination || suggestion.newName || './Organized',
        confidence: suggestion.confidence,
        files: suggestion.files
      }));
      
      setSuggestions(organizationSuggestions);
    } catch (error) {
      console.error('File analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (files.length > 0) {
      analyzeFiles();
    }
  }, [files, aiService]);

  const handleOrganizationAction = (action: string, targetFiles: string[], destination?: string) => {
    onOrganizationAction(action, targetFiles, destination);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (!aiService) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="mb-4">
          <svg className="w-12 h-12 mx-auto text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2v1a3 3 0 103 3H6a3 3 0 00-3-3V3a2 2 0 00-2 2v6h16V5a2 2 0 00-2-2V3a3 3 0 00-3 3H9a3 3 0 00-3-3v1a2 2 0 012 2z"/>
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-2">AI Organization Assistant</h3>
        <p className="text-xs text-gray-500">OpenAI API key required for smart organization features</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center">
            <svg className="w-4 h-4 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2v1a3 3 0 103 3H6a3 3 0 00-3-3V3a2 2 0 00-2 2v6h16V5a2 2 0 00-2-2V3a3 3 0 00-3 3H9a3 3 0 00-3-3v1a2 2 0 012 2z"/>
            </svg>
            Smart Organization
          </h2>
          <button
            onClick={analyzeFiles}
            disabled={isAnalyzing || files.length === 0}
            className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? '🔄 Analyzing...' : '🔍 Re-analyze'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1">
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
              activeTab === 'duplicates' 
                ? 'bg-purple-500 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🔄 Duplicates ({duplicates.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
              activeTab === 'categories' 
                ? 'bg-purple-500 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📁 Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
              activeTab === 'suggestions' 
                ? 'bg-purple-500 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            💡 Suggestions ({suggestions.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isAnalyzing && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">🤖 AI analyzing your files...</p>
            </div>
          </div>
        )}

        {!isAnalyzing && activeTab === 'duplicates' && (
          <div className="space-y-3">
            {duplicates.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-sm text-gray-600 font-medium">No duplicates found!</p>
                <p className="text-xs text-gray-500">Your files are well organized.</p>
              </div>
            ) : (
              duplicates.map((group, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-red-800">
                      Potential Duplicates
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(group.confidence)}`}>
                      {getConfidenceText(group.confidence)} ({Math.round(group.confidence * 100)}%)
                    </span>
                  </div>
                  
                  <div className="text-xs text-red-700 mb-2">
                    <strong>Original:</strong> {group.original.split('\\').pop()}
                  </div>
                  
                  <div className="text-xs text-red-600 mb-3">
                    <strong>Duplicates:</strong>
                    {group.duplicates.map((dup, i) => (
                      <div key={i} className="ml-2">• {dup.split('\\').pop()}</div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleOrganizationAction('archive_duplicates', group.duplicates, './Duplicates')}
                    className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    📦 Archive Duplicates
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {!isAnalyzing && activeTab === 'categories' && (
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📂</div>
                <p className="text-sm text-gray-600 font-medium">No categories detected</p>
                <p className="text-xs text-gray-500">Try analyzing more files.</p>
              </div>
            ) : (
              categories.map((category, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-blue-800">
                      📁 {category.category}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(category.confidence)}`}>
                      {getConfidenceText(category.confidence)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-blue-700 mb-2">{category.description}</p>
                  
                  <div className="text-xs text-blue-600 mb-3">
                    <strong>{category.files.length} files:</strong>
                    {category.files.slice(0, 3).map((file, i) => (
                      <div key={i} className="ml-2">• {file.split('\\').pop()}</div>
                    ))}
                    {category.files.length > 3 && (
                      <div className="ml-2 text-blue-500">... and {category.files.length - 3} more</div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOrganizationAction('create_folder', category.files, `./${category.category}`)}
                    className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    📁 Create {category.category} Folder
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {!isAnalyzing && activeTab === 'suggestions' && (
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✨</div>
                <p className="text-sm text-gray-600 font-medium">No suggestions available</p>
                <p className="text-xs text-gray-500">Your files are already well organized!</p>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-green-800">
                      {suggestion.type === 'folder' && '📁'}
                      {suggestion.type === 'move' && '➡️'}
                      {suggestion.type === 'rename' && '✏️'}
                      {suggestion.type === 'archive' && '📦'}
                      {' '}
                      {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} Suggestion
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(suggestion.confidence)}`}>
                      {getConfidenceText(suggestion.confidence)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-green-700 mb-2">{suggestion.description}</p>
                  
                  <div className="text-xs text-green-600 mb-3">
                    <strong>Target:</strong> {suggestion.targetPath}
                  </div>
                  
                  <div className="text-xs text-green-600 mb-3">
                    <strong>Affects {suggestion.files.length} files:</strong>
                    {suggestion.files.slice(0, 2).map((file, i) => (
                      <div key={i} className="ml-2">• {file.split('\\').pop()}</div>
                    ))}
                    {suggestion.files.length > 2 && (
                      <div className="ml-2 text-green-500">... and {suggestion.files.length - 2} more</div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOrganizationAction(suggestion.type, suggestion.files, suggestion.targetPath)}
                      className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      ✅ Apply
                    </button>
                    <button
                      onClick={() => {/* Handle preview */}}
                      className="text-xs px-3 py-1 bg-white text-green-700 border border-green-300 rounded hover:bg-green-50"
                    >
                      👁️ Preview
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t bg-gray-50 px-4 py-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>📊 Analyzed: {files.length} files</span>
          <span>
            🎯 Issues: {duplicates.reduce((sum, d) => sum + d.duplicates.length, 0)} duplicates, {suggestions.length} suggestions
          </span>
        </div>
      </div>
    </div>
  );
};
