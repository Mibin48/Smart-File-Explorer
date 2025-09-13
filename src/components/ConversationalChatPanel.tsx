import React, { useState, useRef, useEffect } from 'react';
import { ConversationMessage, FileCommand, getConversationalAIService } from '../services/ConversationalAIService';

interface ConversationalChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  selectedFiles: string[];
  recentFiles: string[];
  onExecuteCommand: (command: FileCommand) => Promise<any>;
}

export const ConversationalChatPanel: React.FC<ConversationalChatPanelProps> = ({
  isOpen,
  onClose,
  currentPath,
  selectedFiles,
  recentFiles,
  onExecuteCommand
}) => {
  // Wrap everything in a try-catch to prevent crashes
  try {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initialize AI service with better error handling
  const [conversationalAI, setConversationalAI] = useState<any>(null);
  
  useEffect(() => {
    try {
      console.log('Initializing conversational AI service...');
      const aiService = getConversationalAIService();
      console.log('AI service initialized successfully:', !!aiService);
      setConversationalAI(aiService);
    } catch (err) {
      console.error('Failed to initialize conversational AI service:', err);
      setError('Failed to initialize AI service');
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognition);
    }
  }, []);

  // Update AI context when props change
  useEffect(() => {
    try {
      if (isOpen && conversationalAI) {
        conversationalAI.updateContext({
          currentPath,
          selectedFiles,
          recentFiles
        });
      }
    } catch (err) {
      console.error('Error updating AI context:', err);
      setError('Failed to initialize chat context');
    }
  }, [isOpen, currentPath, selectedFiles, recentFiles]);

  // Load conversation history when panel opens
  useEffect(() => {
    try {
      if (isOpen && conversationalAI) {
        const history = conversationalAI.getRecentMessages(20);
        setMessages(history || []);
        setTimeout(scrollToBottom, 100);
      } else if (isOpen && !conversationalAI) {
        // Show a welcome message even without AI service
        const welcomeMessage: ConversationMessage = {
          id: `msg_${Date.now()}_welcome`,
          type: 'assistant',
          content: `Hello! I'm your AI file assistant. I can help you manage files in your current directory: ${currentPath}\n\nYou can ask me to:\n• List files by type or criteria\n• Search for specific files\n• Help organize your files\n• Get information about files\n\nWhat would you like to do?`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Error loading conversation history:', err);
      setError('Failed to load conversation history');
    }
  }, [isOpen, conversationalAI, currentPath]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    if (!conversationalAI) {
      setError('Chat service is not available. Please check your configuration.');
      return;
    }

    const userInput = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Process the message through AI
      const aiResponse = await conversationalAI.processMessage(userInput);
      
      // Update local messages safely
      try {
        const updatedHistory = conversationalAI.getRecentMessages(20);
        setMessages(updatedHistory || []);
      } catch (historyError) {
        console.warn('Failed to get message history, using fallback:', historyError);
        // Create a simple response if history fails
        const fallbackResponse: ConversationMessage = {
          id: `msg_${Date.now()}_fallback`,
          type: 'assistant',
          content: 'I received your message but had trouble accessing the conversation history. How can I help you with your files?',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackResponse]);
      }

      // Execute the command if one was parsed
      if (aiResponse.command && aiResponse.command.confidence > 0.6) {
        try {
          const results = await onExecuteCommand(aiResponse.command);
          
          // Add results to the assistant message
          aiResponse.results = results;
          
          // Create a system message with results if needed
          if (results && typeof results === 'object') {
            const systemMessage: ConversationMessage = {
              id: `msg_${Date.now()}_system`,
              type: 'system',
              content: formatCommandResults(aiResponse.command, results),
              timestamp: new Date()
            };
            
            conversationalAI['addMessage'](systemMessage);
            setMessages(conversationalAI.getRecentMessages(20));
          }
        } catch (error) {
          const errorMessage: ConversationMessage = {
            id: `msg_${Date.now()}_error`,
            type: 'error',
            content: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date()
          };
          
          conversationalAI['addMessage'](errorMessage);
          setMessages(conversationalAI.getRecentMessages(20));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceInput = () => {
    if (recognition && !isListening) {
      setIsListening(true);
      recognition.start();
    }
  };

  const clearConversation = () => {
    if (confirm('Are you sure you want to clear the conversation history?')) {
      conversationalAI.clearConversationHistory();
      setMessages([]);
    }
  };

  const formatCommandResults = (command: FileCommand, results: any): string => {
    switch (command.action) {
      case 'list':
        return `Found ${results?.files?.length || 0} files matching your criteria.`;
      case 'search':
        return `Search completed. Found ${results?.matches?.length || 0} results.`;
      case 'delete':
        return `Successfully deleted ${results?.deletedCount || 0} files.`;
      case 'move':
        return `Successfully moved ${results?.movedCount || 0} files.`;
      case 'copy':
        return `Successfully copied ${results?.copiedCount || 0} files.`;
      case 'create':
        return `Successfully created: ${results?.name || 'new item'}`;
      default:
        return 'Operation completed.';
    }
  };

  const getMessageIcon = (message: ConversationMessage): string => {
    switch (message.type) {
      case 'user':
        return '👤';
      case 'assistant':
        return '🤖';
      case 'system':
        return 'ℹ️';
      case 'error':
        return '❌';
      default:
        return '💬';
    }
  };

  const getMessageClass = (message: ConversationMessage): string => {
    const baseClass = 'flex items-start space-x-3 p-4 rounded-lg transition-all duration-200';
    switch (message.type) {
      case 'user':
        return `${baseClass} bg-blue-50 border-l-4 border-blue-500`;
      case 'assistant':
        return `${baseClass} bg-green-50 border-l-4 border-green-500`;
      case 'system':
        return `${baseClass} bg-yellow-50 border-l-4 border-yellow-500`;
      case 'error':
        return `${baseClass} bg-red-50 border-l-4 border-red-500`;
      default:
        return `${baseClass} bg-gray-50 border-l-4 border-gray-300`;
    }
  };

  // Debug logging
  console.log('ConversationalChatPanel render - isOpen:', isOpen, 'error:', error, 'conversationalAI:', !!conversationalAI);

  if (!isOpen) return null;

  // If there's a critical error, show error message instead of white screen
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Chat Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">AI File Assistant</h2>
              <p className="text-purple-100 text-sm">
                Chat naturally to manage your files • {messages.length} messages
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Voice Toggle */}
            {recognition && (
              <button
                onClick={startVoiceInput}
                disabled={isListening}
                className={`p-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
                title={isListening ? 'Listening...' : 'Start voice input'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* History Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 bg-white bg-opacity-20 text-white hover:bg-opacity-30 rounded-lg transition-colors"
              title="Toggle conversation history"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Clear Chat */}
            <button
              onClick={clearConversation}
              className="p-2 bg-white bg-opacity-20 text-white hover:bg-opacity-30 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M10 5a2 2 0 00-2 2v6a2 2 0 104 0V7a2 2 0 00-2-2z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-white hover:text-gray-200 transition-colors"
              title="Close chat"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Context Info Bar */}
        <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 border-b">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span>📁</span>
              <span className="font-mono text-xs truncate max-w-xs">
                {currentPath || 'No path selected'}
              </span>
            </span>
            {selectedFiles.length > 0 && (
              <span className="flex items-center space-x-1">
                <span>✓</span>
                <span>{selectedFiles.length} selected</span>
              </span>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-medium mb-2">Start a conversation</h3>
                <p className="text-sm mb-4">Try asking me to:</p>
                <div className="text-left space-y-1 text-sm">
                  <div>• "Show me all images from last week"</div>
                  <div>• "Delete the selected files"</div>
                  <div>• "Move photos to Pictures folder"</div>
                  <div>• "Find large files"</div>
                  <div>• "Create a new folder called Projects"</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={getMessageClass(message)}>
                  <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg shadow-sm">
                    {getMessageIcon(message)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900 capitalize">
                        {message.type === 'assistant' ? 'AI Assistant' : message.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.command && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {message.command.action} • {(message.command.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {message.content}
                    </div>
                    {message.command && message.command.confidence < 0.5 && (
                      <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                        <strong>Low confidence:</strong> I'm not sure about this request. 
                        Please clarify what you'd like to do.
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? 'Listening...' : 'Type your file management request...'}
                  disabled={isProcessing || isListening}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {isProcessing && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing || isListening}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>Send</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
          
          {isListening && (
            <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-red-600">
              <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Listening for voice input...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  } catch (componentError) {
    console.error('ConversationalChatPanel crashed:', componentError);
    // Return a simple error fallback instead of crashing
    return isOpen ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Chat Unavailable</h2>
            <p className="text-gray-600 mb-4">
              The chat feature encountered an error. Please try refreshing the application.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    ) : null;
  }
};
