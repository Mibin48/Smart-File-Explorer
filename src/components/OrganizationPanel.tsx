import React, { useState, useEffect } from 'react';
import { OrganizationSession, OrganizationSuggestion } from '../services/SmartOrganizer';

interface OrganizationPanelProps {
  session: OrganizationSession | null;
  onApplySuggestion: (suggestionId: string) => Promise<void>;
  onRejectSuggestion: (suggestionId: string) => void;
  onClosePanel: () => void;
  isProcessing?: boolean;
}

export const OrganizationPanel: React.FC<OrganizationPanelProps> = ({
  session,
  onApplySuggestion,
  onRejectSuggestion,
  onClosePanel,
  isProcessing = false
}) => {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (session) {
      setAppliedSuggestions(new Set(session.appliedSuggestions));
    }
  }, [session]);

  if (!session) {
    return (
      <div className="bg-white border rounded-lg p-6 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700">No Organization Session</h3>
          <p className="text-sm text-gray-500 mt-1">
            Use "🚀 Smart Organization" in the advanced AI tools to get started
          </p>
        </div>
      </div>
    );
  }

  const pendingSuggestions = session.suggestions.filter(s => 
    !appliedSuggestions.has(s.id) && !rejectedSuggestions.has(s.id)
  );

  const handleApply = async (suggestionId: string) => {
    try {
      await onApplySuggestion(suggestionId);
      setAppliedSuggestions(prev => new Set([...prev, suggestionId]));
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };

  const handleReject = (suggestionId: string) => {
    setRejectedSuggestions(prev => new Set([...prev, suggestionId]));
    onRejectSuggestion(suggestionId);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'create_folder': return '📁';
      case 'move_files': return '🔄';
      case 'rename_files': return '✏️';
      case 'group_similar': return '🔗';
      default: return '📋';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center">
              🧠 Smart Organization Suggestions
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              {session.totalFiles} files analyzed • {pendingSuggestions.length} suggestions pending
            </p>
          </div>
          <button
            onClick={onClosePanel}
            className="text-white hover:text-blue-200 transition-colors"
            disabled={isProcessing}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Directory Info */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="text-xs text-gray-600">
          <span className="font-medium">Directory:</span> {session.directoryPath.split('\\').pop()}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Generated: {session.timestamp.toLocaleString()}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="max-h-96 overflow-y-auto scrollbar-always">
        {pendingSuggestions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h4 className="text-sm font-medium text-gray-700">All Done! 🎉</h4>
              <p className="text-xs text-gray-500 mt-1">
                All suggestions have been applied or dismissed
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingSuggestions.map((suggestion, index) => (
              <div key={suggestion.id} className="p-4">
                {/* Suggestion Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getSuggestionIcon(suggestion.type)}</span>
                    <div>
                      <h4 className="font-medium text-gray-800">{suggestion.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                      {getConfidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Impact Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-gray-700">{suggestion.impact.filesAffected}</div>
                      <div className="text-xs text-gray-500">Files</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-700">{suggestion.impact.foldersToCreate}</div>
                      <div className="text-xs text-gray-500">Folders</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-700">{suggestion.impact.estimatedTime}s</div>
                      <div className="text-xs text-gray-500">Time</div>
                    </div>
                  </div>
                </div>

                {/* Files Preview */}
                <div className="mb-3">
                  <button
                    onClick={() => setExpandedSuggestion(
                      expandedSuggestion === suggestion.id ? null : suggestion.id
                    )}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {expandedSuggestion === suggestion.id ? '▼' : '▶'} 
                    {' '}View affected files ({suggestion.files.length})
                  </button>
                  
                  {expandedSuggestion === suggestion.id && (
                    <div className="mt-2 bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                      <div className="space-y-1">
                        {suggestion.files.map((file, fileIndex) => (
                          <div key={fileIndex} className="text-xs text-gray-700 font-mono">
                            📄 {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reasoning */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-1">AI Reasoning:</div>
                  <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                    {suggestion.reasoning}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleApply(suggestion.id)}
                    disabled={isProcessing}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? '⏳ Applying...' : '✅ Apply'}
                  </button>
                  <button
                    onClick={() => handleReject(suggestion.id)}
                    disabled={isProcessing}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ❌ Dismiss
                  </button>
                </div>

                {/* Divider for visual separation (except last item) */}
                {index < pendingSuggestions.length - 1 && (
                  <div className="border-t border-gray-200 mt-4"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Overall Progress */}
      <div className="bg-gray-50 px-4 py-3 border-t">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            Progress: {appliedSuggestions.size} applied, {rejectedSuggestions.size} dismissed
          </span>
          <div className="flex items-center space-x-4">
            <span className="text-green-600">✅ {appliedSuggestions.size}</span>
            <span className="text-red-600">❌ {rejectedSuggestions.size}</span>
            <span className="text-blue-600">⏳ {pendingSuggestions.length}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${((appliedSuggestions.size + rejectedSuggestions.size) / session.suggestions.length) * 100}%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};
