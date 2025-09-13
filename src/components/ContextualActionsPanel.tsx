import React, { useState, useEffect } from 'react';
import {
  FileInfo,
  FileAction,
  ContextualActions,
  ActionExecutionResult
} from '../types/ContextualActions';
import { ContextualActionsService } from '../services/ContextualActionsService';
import { getActionHistoryService, ActionHistoryEntry } from '../services/ActionHistoryService';

interface ContextualActionsPanelProps {
  selectedFile: FileInfo | null;
  contextualActionsService: ContextualActionsService;
  onActionExecuted?: (result: ActionExecutionResult) => void;
  onClose?: () => void;
}

export const ContextualActionsPanel: React.FC<ContextualActionsPanelProps> = ({
  selectedFile,
  contextualActionsService,
  onActionExecuted,
  onClose
}) => {
  const [contextualActions, setContextualActions] = useState<ContextualActions | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [lastExecutionResult, setLastExecutionResult] = useState<ActionExecutionResult | null>(null);

  useEffect(() => {
    if (selectedFile) {
      analyzeFile(selectedFile);
    } else {
      setContextualActions(null);
    }
  }, [selectedFile]);

  const analyzeFile = async (fileInfo: FileInfo) => {
    setIsAnalyzing(true);
    setLastExecutionResult(null);
    
    try {
      // Build context for analysis
      const context = {
        currentDirectory: fileInfo.path,
        recentFiles: [], // In a real app, you'd get this from file history
        projectContext: {
          type: 'general' as const,
          relatedFiles: []
        },
        usage: {
          accessFrequency: 'sometimes' as const,
          lastAccessed: new Date(),
          totalAccesses: 1
        }
      };

      const actions = await contextualActionsService.analyzeFile(fileInfo, context);
      setContextualActions(actions);
    } catch (error) {
      console.error('Error analyzing file:', error);
      setContextualActions(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeAction = async (action: FileAction) => {
    if (!selectedFile) return;
    
    setExecutingActionId(action.id);
    
    try {
      const result = await contextualActionsService.executeAction(action, selectedFile);
      setLastExecutionResult(result);
      
      // Track action in history if successful
      if (result.success) {
        const historyService = getActionHistoryService();
        historyService.addAction(action.type, action.label, selectedFile, result);
      }
      
      if (onActionExecuted) {
        onActionExecuted(result);
      }
      
      // If action was successful and changed the file, re-analyze
      if (result.success && result.newFileInfo) {
        setTimeout(() => analyzeFile(result.newFileInfo!), 1000);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      setLastExecutionResult({
        success: false,
        actionId: action.id,
        message: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undoable: false
      });
    } finally {
      setExecutingActionId(null);
    }
  };

  const getRiskColor = (action: FileAction) => {
    const template = contextualActionsService['actionTemplates']?.find(t => t.type === action.type);
    const riskLevel = template?.riskLevel || 'safe';
    
    switch (riskLevel) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'moderate':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-green-200 bg-green-50 text-green-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'organization':
        return 'bg-blue-100 text-blue-800';
      case 'productivity':
        return 'bg-purple-100 text-purple-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'content':
        return 'bg-green-100 text-green-800';
      case 'sharing':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedFile) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-500 mb-2">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Select a File</h3>
        <p className="text-sm text-gray-500">Choose a file to see AI-powered contextual actions</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Contextual Actions</h3>
              <p className="text-sm text-gray-500">{selectedFile.name}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isAnalyzing ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Analyzing file with AI...</p>
          </div>
        ) : contextualActions ? (
          <div className="space-y-4">
            {/* AI Reasoning with enhanced styling */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 shadow-sm">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                    AI Analysis Results
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full animate-pulse">
                      ✨ Smart
                    </span>
                  </h4>
                  <p className="text-sm text-blue-800 leading-relaxed">{contextualActions.reasoning}</p>
                  {contextualActions.contextFactors.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-blue-700 mb-2 font-medium">Analysis Factors:</div>
                      <div className="flex flex-wrap gap-1">
                        {contextualActions.contextFactors.map((factor, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-200 transition-colors duration-200"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Suggested Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Suggested Actions</h4>
              {contextualActions.suggestedActions.map((action, index) => (
                <div
                  key={action.id}
                  className={`border rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] ${
                    getRiskColor(action)
                  } hover:shadow-lg animate-fade-in-up`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-lg shadow-sm">
                          {action.icon}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 text-sm">{action.label}</h5>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(action.category)}`}>
                              {action.category}
                            </span>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(action.priority)} animate-pulse`}></div>
                              <span className="text-xs text-gray-500 capitalize">{action.priority}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{action.description}</p>
                      
                      {/* Enhanced confidence and time display */}
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Confidence:</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  action.confidence > 0.8 ? 'bg-green-500' : 
                                  action.confidence > 0.6 ? 'bg-yellow-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${action.confidence * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">{Math.round(action.confidence * 100)}%</span>
                          </div>
                        </div>
                        {action.estimatedTime && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <span>{action.estimatedTime}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Preconditions & Consequences */}
                      {(action.preconditions?.length || action.consequences?.length) && (
                        <div className="mt-2 text-xs">
                          {action.preconditions && action.preconditions.length > 0 && (
                            <div className="mb-1">
                              <span className="font-medium text-orange-700">Requirements: </span>
                              <span className="text-orange-600">{action.preconditions.join(', ')}</span>
                            </div>
                          )}
                          {action.consequences && action.consequences.length > 0 && (
                            <div>
                              <span className="font-medium text-red-700">Effects: </span>
                              <span className="text-red-600">{action.consequences.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => executeAction(action)}
                      disabled={executingActionId === action.id || executingActionId !== null}
                      className={`ml-4 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed flex items-center space-x-2 ${
                        executingActionId === action.id
                          ? 'bg-orange-500 text-white animate-pulse'
                          : executingActionId !== null
                          ? 'bg-gray-300 text-gray-500 opacity-50'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg'
                      }`}
                    >
                      {executingActionId === action.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span className="animate-pulse">Executing...</span>
                        </>
                      ) : executingActionId !== null ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>Wait...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span>Execute</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Execution Result */}
            {lastExecutionResult && (
              <div className={`rounded-lg p-3 ${
                lastExecutionResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {lastExecutionResult.success ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <p className={`text-sm font-medium ${
                    lastExecutionResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {lastExecutionResult.success ? 'Action Executed Successfully' : 'Action Failed'}
                  </p>
                </div>
                <p className={`text-sm mt-1 ${
                  lastExecutionResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {lastExecutionResult.message}
                </p>
                {lastExecutionResult.undoable && (
                  <button 
                    onClick={async () => {
                      const historyService = getActionHistoryService();
                      const recentActions = historyService.getRecentActions(1);
                      if (recentActions.length > 0) {
                        const success = await historyService.undoAction(recentActions[0].id);
                        if (success) {
                          setLastExecutionResult({
                            ...lastExecutionResult,
                            message: `${lastExecutionResult.message} (Action undone)`,
                            undoable: false
                          });
                        }
                      }
                    }}
                    className="mt-2 px-3 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md transition-colors duration-200 flex items-center space-x-1"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Undo Action</span>
                  </button>
                )}
              </div>
            )}

            {/* Empty State */}
            {contextualActions.suggestedActions.length === 0 && (
              <div className="text-center py-6">
                <div className="text-gray-400 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No contextual actions suggested for this file</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Unable to analyze file</p>
          </div>
        )}
      </div>
    </div>
  );
};
