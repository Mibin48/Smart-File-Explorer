import React, { useState, useRef, useEffect } from 'react';

interface EnhancedChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  selectedFiles: string[];
  recentFiles: string[];
  onExecuteCommand?: (command: any) => Promise<any>;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp: Date;
  command?: any;
}

export const EnhancedChatPanel: React.FC<EnhancedChatPanelProps> = ({
  isOpen,
  onClose,
  currentPath,
  selectedFiles,
  recentFiles,
  onExecuteCommand
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    try {
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
        
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        
        setRecognition(recognition);
      }
    } catch (error) {
      console.warn('Speech recognition not available:', error);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Add welcome message when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        type: 'assistant',
        content: `Hello! I'm your AI file assistant. I can help you manage files in your current directory: ${currentPath}

You can ask me to:
• List files by type or criteria
• Search for specific files
• Help organize your files
• Get information about files
• Perform file operations like copy, move, delete

What would you like to do?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, currentPath]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userInput = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Try to load and use the conversational AI service
      let aiResponse: ChatMessage;
      
      try {
        // Dynamically import the service to avoid initialization issues
        const { getConversationalAIService } = await import('../services/ConversationalAIService');
        const conversationalAI = getConversationalAIService();
        
        // Process message through AI
        const response = await conversationalAI.processMessage(userInput);
        
        aiResponse = {
          id: `msg_${Date.now()}_assistant`,
          type: 'assistant',
          content: response.content,
          timestamp: new Date(),
          command: response.command
        };

        // Try to execute command if available and confidence is high
        if (response.command && response.command.confidence > 0.6 && onExecuteCommand) {
          try {
            const commandResult = await onExecuteCommand(response.command);
            
            if (commandResult) {
              const resultMessage: ChatMessage = {
                id: `msg_${Date.now()}_system`,
                type: 'system',
                content: formatCommandResult(response.command, commandResult),
                timestamp: new Date()
              };
              setMessages(prev => [...prev, aiResponse, resultMessage]);
            } else {
              setMessages(prev => [...prev, aiResponse]);
            }
          } catch (cmdError) {
            console.error('Command execution failed:', cmdError);
            const errorMsg: ChatMessage = {
              id: `msg_${Date.now()}_error`,
              type: 'error',
              content: `Failed to execute command: ${cmdError instanceof Error ? cmdError.message : 'Unknown error'}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse, errorMsg]);
          }
        } else {
          setMessages(prev => [...prev, aiResponse]);
        }
        
      } catch (aiError) {
        console.warn('AI service failed, using fallback response:', aiError);
        // Use simple fallback response
        const fallbackResponse = generateFallbackResponse(userInput, currentPath, selectedFiles);
        aiResponse = {
          id: `msg_${Date.now()}_assistant`,
          type: 'assistant',
          content: fallbackResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
      }

    } catch (error) {
      console.error('Message processing failed:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        type: 'error',
        content: `Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
    if (confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
    }
  };

  const getMessageClass = (message: ChatMessage): string => {
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

  const getMessageIcon = (message: ChatMessage): string => {
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

  if (!isOpen) return null;

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
            {recentFiles.length > 0 && (
              <span className="flex items-center space-x-1">
                <span>📄</span>
                <span>{recentFiles.length} recent files</span>
              </span>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
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
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
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
};

// Helper functions
function formatCommandResult(command: any, result: any): string {
  if (!result) return 'Operation completed.';
  
  switch (command.action) {
    case 'list':
      return `Found ${result.files?.length || result.length || 0} files matching your criteria.`;
    case 'search':
      return `Search completed. Found ${result.matches?.length || result.length || 0} results.`;
    case 'delete':
      return `Successfully deleted ${result.deletedCount || result.count || 'the specified'} files.`;
    case 'move':
      return `Successfully moved ${result.movedCount || result.count || 'the specified'} files.`;
    case 'copy':
      return `Successfully copied ${result.copiedCount || result.count || 'the specified'} files.`;
    case 'create':
      return `Successfully created: ${result.name || result.item || 'new item'}`;
    case 'organize':
      return `Successfully organized ${result.organizedCount || result.count || 'the'} files.`;
    default:
      return result.message || 'Operation completed successfully.';
  }
}

function generateFallbackResponse(input: string, currentPath: string, selectedFiles: string[]): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
    return `I can help you with file management tasks! Here's what I can assist with:

🔍 **Search & List**: Find files by name, type, or date
📁 **File Operations**: Move, copy, delete, rename files
📊 **Organization**: Sort and organize your files
📈 **Analysis**: Get information about file sizes and types
❓ **Help**: Answer questions about file management

Current directory: ${currentPath}
Selected files: ${selectedFiles.length > 0 ? selectedFiles.length : 'none'}

Try asking me something like:
• "Show me all images"
• "Find large files"
• "How can I organize my downloads?"`;
  }
  
  if (lowerInput.includes('list') || lowerInput.includes('show') || lowerInput.includes('display')) {
    return `I'll help you list files! Based on your request, I would typically:

• Scan the current directory: ${currentPath}
• Apply any filters you mentioned
• Display the results in an organized way

${selectedFiles.length > 0 ? `You currently have ${selectedFiles.length} files selected.` : ''}

The full AI version would connect to your actual file system and provide real results with filtering.`;
  }
  
  if (lowerInput.includes('search') || lowerInput.includes('find')) {
    return `I'll help you search for files! Your search would include:

• Looking in: ${currentPath}
• Using your search criteria from the query
• Filtering by file types, dates, or sizes if specified

${selectedFiles.length > 0 ? `Current selection: ${selectedFiles.length} files` : ''}

The full version would perform an actual search and return matching files with details.`;
  }
  
  // Default response
  return `I understand you're asking about: "${input}"

I'm here to help with file management in your current directory: ${currentPath}

${selectedFiles.length > 0 ? `You have ${selectedFiles.length} files currently selected.` : ''}

Could you please be more specific about what you'd like to do? For example:
• "Show me all PDF files"  
• "Find files larger than 10MB"
• "Help me organize this folder"

I'm ready to assist with any file management task!`;
}
