import React, { useState, useRef, useEffect } from 'react';

interface SimpleChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  selectedFiles: string[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
}

export const SimpleChatPanel: React.FC<SimpleChatPanelProps> = ({
  isOpen,
  onClose,
  currentPath,
  selectedFiles
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        content: `Hello! I'm your AI file assistant. I can help you manage files in your current directory: ${currentPath}\n\nYou can ask me to:\n• List files by type or criteria\n• Search for specific files\n• Help organize your files\n• Get information about files\n\nWhat would you like to do?`,
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
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate simple response based on keywords
      const response = generateSimpleResponse(userInput, currentPath, selectedFiles);
      
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
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
                  placeholder="Type your file management request..."
                  disabled={isProcessing}
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
              disabled={!inputMessage.trim() || isProcessing}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>Send</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple response generator without external dependencies
function generateSimpleResponse(input: string, currentPath: string, selectedFiles: string[]): string {
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

Note: This is a simplified demo version. The full version would connect to your actual file system and provide real results.`;
  }
  
  if (lowerInput.includes('search') || lowerInput.includes('find')) {
    return `I'll help you search for files! Your search would include:

• Looking in: ${currentPath}
• Using your search criteria from the query
• Filtering by file types, dates, or sizes if specified

${selectedFiles.length > 0 ? `Current selection: ${selectedFiles.length} files` : ''}

The full version would perform an actual search and return matching files with details like size, date modified, and location.`;
  }
  
  if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
    if (selectedFiles.length > 0) {
      return `I would help you delete the ${selectedFiles.length} currently selected files. 

⚠️ Important: This would be a permanent action, so I'd ask for confirmation first and potentially suggest moving to trash instead of permanent deletion.`;
    } else {
      return `To delete files, you'll need to either:
• Select some files first, then ask me to delete them
• Specify which files you want to delete in your message

Safety is important, so I'd always confirm before deleting anything!`;
    }
  }
  
  if (lowerInput.includes('organize') || lowerInput.includes('sort')) {
    return `I can help organize your files in ${currentPath}! 

Common organization options:
📁 **By Type**: Group images, documents, videos, etc.
📅 **By Date**: Sort by creation or modification date  
📏 **By Size**: Arrange from largest to smallest
🔤 **By Name**: Alphabetical organization

${selectedFiles.length > 0 ? `You have ${selectedFiles.length} files selected to organize.` : ''}

What type of organization would work best for you?`;
  }
  
  if (lowerInput.includes('move') || lowerInput.includes('copy')) {
    const action = lowerInput.includes('move') ? 'move' : 'copy';
    return `I'll help you ${action} files! 

Current context:
• Working directory: ${currentPath}
• Selected files: ${selectedFiles.length || 'none'}

For ${action} operations, I'd need to know:
• Which files to ${action} (or I can use your current selection)
• Where to ${action} them to

The full version would handle the actual file operations safely with progress tracking.`;
  }
  
  // Default response
  return `I understand you're asking about: "${input}"

I'm here to help with file management in your current directory: ${currentPath}

${selectedFiles.length > 0 ? `You have ${selectedFiles.length} files currently selected.` : ''}

Could you please be more specific about what you'd like to do? For example:
• "Show me all PDF files"  
• "Find files larger than 10MB"
• "Help me organize this folder"
• "Delete the selected files"

I'm ready to assist with any file management task!`;
}
