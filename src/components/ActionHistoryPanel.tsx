import React, { useState, useEffect } from 'react';
import { getActionHistoryService, ActionHistoryEntry as HistoryEntry } from '../services/ActionHistoryService';

interface ActionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActionHistoryPanel: React.FC<ActionHistoryPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<{
    totalActions: number;
    undoableActions: number;
    actionTypes: Record<string, number>;
    oldestAction?: Date;
    newestAction?: Date;
  }>({ totalActions: 0, undoableActions: 0, actionTypes: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = () => {
    const historyService = getActionHistoryService();
    const recentActions = historyService.getRecentActions(20); // Get last 20 actions
    const statistics = historyService.getStatistics();
    setHistory(recentActions);
    setStats(statistics);
  };

  const handleUndo = async (actionId: string) => {
    setLoading(true);
    try {
      const historyService = getActionHistoryService();
      const success = await historyService.undoAction(actionId);
      if (success) {
        loadHistory(); // Refresh the history
      }
    } catch (error) {
      console.error('Failed to undo action:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all action history? This cannot be undone.')) {
      const historyService = getActionHistoryService();
      historyService.clearHistory();
      loadHistory();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'rename':
        return '📝';
      case 'move':
        return '📂';
      case 'copy':
        return '📄';
      case 'delete':
        return '🗑️';
      case 'tag':
        return '🏷️';
      case 'summarize':
        return '📋';
      case 'archive':
        return '📦';
      case 'extract':
        return '🔍';
      case 'categorize':
        return '🗂️';
      case 'compress':
        return '🗜️';
      case 'workflow':
        return '⚙️';
      case 'translate':
        return '🌐';
      case 'optimize':
        return '⚡';
      default:
        return '🔧';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Action History</h2>
              <p className="text-blue-100 text-sm">
                {stats.totalActions} actions executed • {stats.undoableActions} undoable
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">No actions in history</p>
              <p className="text-sm">Actions you perform will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-gray-50 rounded-lg p-4 border-l-4 ${
                    entry.result.success ? 'border-green-400' : 'border-red-400'
                  } transition-all duration-200 hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="text-2xl">{getActionIcon(entry.actionType)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {entry.actionLabel}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.result.success 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.result.success ? 'Success' : 'Failed'}
                          </span>
                          {entry.result.success && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Executed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          File: <span className="font-mono">{entry.fileInfo.name}</span>
                        </p>
                        {entry.result.message && (
                          <p className="text-sm text-gray-700 mb-2">{entry.result.message}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {formatTimestamp(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {entry.result.undoable && entry.undoData && (
                        <button
                          onClick={() => handleUndo(entry.id)}
                          disabled={loading}
                          className="px-3 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md transition-colors duration-200 flex items-center space-x-1 disabled:opacity-50"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <span>Undo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {history.length} most recent actions
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadHistory}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear History</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
