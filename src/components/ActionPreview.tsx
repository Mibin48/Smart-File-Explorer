import React from 'react';
import { FileAnalysis } from '../services/AdvancedAIService';

interface ActionPreviewProps {
  preview: string;
  currentPath?: string;
  fileAnalyses?: FileAnalysis[];
}

export const ActionPreview: React.FC<ActionPreviewProps> = ({ preview, currentPath, fileAnalyses = [] }) => {
  const currentFolder = currentPath ? currentPath.split('\\').pop()?.toLowerCase() : '';
  const hasSelectedDirectory = Boolean(currentPath);
  
  const getExamples = () => {
    if (currentFolder?.includes('image')) {
      return [
        "Find all GIF files",
        "Show me JPG images", 
        "Find images larger than 1MB",
        "Show PNG files modified today"
      ];
    } else if (currentFolder?.includes('document')) {
      return [
        "Find all PDF files",
        "Show Word documents",
        "Find documents modified this week",
        "Show text files"
      ];
    } else if (currentFolder?.includes('video')) {
      return [
        "Find all MP4 videos",
        "Show large video files",
        "Find videos longer than 10MB",
        "Show AVI files"
      ];
    } else if (currentFolder?.includes('code')) {
      return [
        "Find JavaScript files",
        "Show Python scripts",
        "Find all TypeScript files",
        "Show HTML files"
      ];
    } else {
      return [
        "Find all PDF files",
        "Show me files larger than 100MB",
        "Find images modified this week",
        "Show video files"
      ];
    }
  };
  
  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">
        {hasSelectedDirectory ? 'STEP 2: AI SEARCH PREVIEW' : 'ACTION PREVIEW'}
      </h3>
      
      {!hasSelectedDirectory && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="text-center text-orange-600">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-75" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM14 9a1 1 0 100 2h2a1 1 0 100-2h-2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">Directory Selection Required</p>
            <p className="text-xs text-orange-500 mt-1">
              Select a directory from the file tree first
            </p>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 rounded-lg p-4 min-h-32 flex-1">
        {preview && hasSelectedDirectory ? (
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="text-xs text-blue-600 mb-1">
                  Searching in: <span className="font-mono">{currentFolder}</span>
                </div>
                <p className="text-sm text-gray-700">{preview}</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Estimated time: ~2 seconds</span>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                    Cancel
                  </button>
                  <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                    Execute
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : !hasSelectedDirectory ? (
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            <p className="text-sm">Waiting for directory selection...</p>
            <p className="text-xs text-gray-400 mt-1">Choose a folder to enable AI search</p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">Enter a command to see the AI preview</p>
            <p className="text-xs text-gray-400 mt-1">AI will search in: {currentFolder}</p>
          </div>
        )}
      </div>

      {/* File Analysis Results */}
      {fileAnalyses.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">
            📊 FILE ANALYSIS RESULTS
          </h4>
          <div className="space-y-2 max-h-48 scrollbar-thin" style={{ overflowY: 'auto' }}>
            {fileAnalyses.slice(0, 10).map((analysis, index) => (
              <div key={index} className="text-xs bg-white rounded border p-3 space-y-1">
                <div className="font-medium text-gray-800 flex items-center justify-between">
                  <span>{analysis.filename || `File #${index + 1}`}</span>
                  <span className="text-gray-500">{analysis.category}</span>
                </div>
                <div className="text-gray-600">
                  {analysis.summary}
                </div>
                {analysis.tags && analysis.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span key={tagIndex} className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {analysis.confidence && (
                  <div className="text-xs text-gray-500">
                    Confidence: {Math.round(analysis.confidence * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Examples */}
      {hasSelectedDirectory && fileAnalyses.length === 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">
            💡 TRY THESE IN {currentFolder?.toUpperCase() || 'THIS DIRECTORY'}
          </h4>
          <div className="space-y-2 max-h-32 scrollbar-thin" style={{ overflowY: 'auto' }}>
            {getExamples().map((example, index) => (
              <div key={index} className="text-xs text-gray-600 p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors">
                {example}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!hasSelectedDirectory && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">
            🚀 WORKFLOW STEPS
          </h4>
          <div className="space-y-2 max-h-40 scrollbar-thin" style={{ overflowY: 'auto' }}>
            <div className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
              <span className="font-medium text-blue-800">1.</span>
              <span className="text-blue-700 ml-1">Select directory from file tree</span>
            </div>
            <div className="text-xs p-2 bg-gray-100 rounded border">
              <span className="font-medium text-gray-600">2.</span>
              <span className="text-gray-600 ml-1">Enter AI search command</span>
            </div>
            <div className="text-xs p-2 bg-gray-100 rounded border">
              <span className="font-medium text-gray-600">3.</span>
              <span className="text-gray-600 ml-1">Review and execute</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
