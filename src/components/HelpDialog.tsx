import React, { useState } from 'react';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpTab = 'gettingStarted' | 'commands' | 'shortcuts' | 'about';

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('gettingStarted');

  if (!isOpen) return null;

  const aiCommandExamples = {
    basic: [
      { command: 'find PDF files', description: 'Search for all PDF documents' },
      { command: 'show images from today', description: 'Find images modified today' },
      { command: 'find files larger than 100MB', description: 'Search for large files' },
      { command: 'show recent documents', description: 'Find recently modified documents' },
      { command: 'find videos', description: 'Search for all video files' },
      { command: 'show audio files', description: 'Find music and audio files' }
    ],
    semantic: [
      { command: 'find documents about budget planning', description: 'Semantic search for budget-related content' },
      { command: 'show files related to machine learning', description: 'Find ML-related files by content meaning' },
      { command: 'find images of charts or graphs', description: 'Search for chart images using AI vision' },
      { command: 'documents about project management', description: 'Content-based document search' },
      { command: 'files similar to presentation.pptx', description: 'Find files with similar content' }
    ],
    advanced: [
      { command: 'organize files by content type and create folders', description: 'AI-powered file organization' },
      { command: 'find duplicate files and suggest which to keep', description: 'Advanced duplicate detection' },
      { command: 'analyze file relationships and suggest improvements', description: 'File relationship analysis' },
      { command: 'categorize my documents by subject', description: 'Automatic content categorization' },
      { command: 'find files that need better names', description: 'File naming suggestions' }
    ]
  };

  const keyboardShortcuts = [
    { keys: 'Ctrl + F', description: 'Focus search input' },
    { keys: 'Ctrl + Shift + F', description: 'Advanced search' },
    { keys: 'Ctrl + H', description: 'Show search history' },
    { keys: 'Ctrl + S', description: 'Open settings' },
    { keys: 'Ctrl + ?', description: 'Show this help dialog' },
    { keys: 'Ctrl + Enter', description: 'Execute search' },
    { keys: 'Ctrl + Shift + C', description: 'Clear search results' },
    { keys: 'Ctrl + E', description: 'Export results' },
    { keys: 'Escape', description: 'Close dialogs/panels' },
    { keys: 'Tab', description: 'Navigate between elements' },
    { keys: 'Shift + Tab', description: 'Navigate backwards' },
    { keys: 'Space', description: 'Toggle file selection' }
  ];

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Search',
      description: 'Natural language commands with GPT-4 understanding'
    },
    {
      icon: '🧠',
      title: 'Semantic Search',
      description: 'Search by meaning using OpenAI embeddings'
    },
    {
      icon: '🔍',
      title: 'Advanced Analysis',
      description: 'File content analysis and categorization'
    },
    {
      icon: '📁',
      title: 'Smart Organization',
      description: 'AI-suggested file organization and cleanup'
    },
    {
      icon: '🎙️',
      title: 'Voice Input',
      description: 'Speak your commands naturally'
    },
    {
      icon: '⚡',
      title: 'Fast Performance',
      description: 'Optimized for quick results and smooth interaction'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">❓ Help & About</h2>
              <p className="text-green-100 text-sm">Smart AI File Explorer Guide</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-50 border-r overflow-y-auto">
            <div className="p-3">
              <nav className="space-y-1">
                {[
                  { id: 'gettingStarted', label: '🚀 Getting Started', desc: 'Quick start guide' },
                  { id: 'commands', label: '🤖 AI Commands', desc: 'Natural language examples' },
                  { id: 'shortcuts', label: '⌨️ Keyboard Shortcuts', desc: 'Hotkeys and navigation' },
                  { id: 'about', label: 'ℹ️ About', desc: 'Version and credits' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as HelpTab)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-medium">{tab.label}</div>
                    <div className={`text-xs ${activeTab === tab.id ? 'text-green-100' : 'text-gray-500'}`}>
                      {tab.desc}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Getting Started Tab */}
            {activeTab === 'gettingStarted' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">🚀 Welcome to Smart AI File Explorer</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-blue-800 mb-2">Quick Start</h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                      <li>1. <strong>Select a directory</strong> from the file tree on the left</li>
                      <li>2. <strong>Choose a search mode</strong>: Basic, Semantic, or Advanced</li>
                      <li>3. <strong>Type or speak</strong> your command in natural language</li>
                      <li>4. <strong>Review results</strong> and use AI suggestions for organization</li>
                    </ol>
                  </div>

                  <h4 className="text-lg font-semibold text-gray-800 mb-4">✨ Key Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {features.map((feature, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{feature.icon}</span>
                          <div>
                            <h5 className="font-medium text-gray-800">{feature.title}</h5>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                    <h4 className="font-semibold text-yellow-800 mb-2">💡 Pro Tips</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Use specific file types: "PDF", "JPG", "MP4" for precise results</li>
                      <li>• Try size filters: "large files", "files bigger than 50MB"</li>
                      <li>• Use time filters: "recent files", "files from today", "old files"</li>
                      <li>• Enable AI features in Settings for semantic and advanced search</li>
                      <li>• Save frequently used searches as favorites</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* AI Commands Tab */}
            {activeTab === 'commands' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">🤖 AI Commands Guide</h3>
                  <p className="text-gray-600 mb-6">
                    The Smart AI File Explorer understands natural language commands. Here are examples organized by search mode:
                  </p>

                  <div className="space-y-6">
                    {/* Basic Commands */}
                    <div>
                      <h4 className="text-lg font-semibold text-blue-600 mb-3">📋 Basic Mode Commands</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-700">
                          Basic mode uses traditional file system search with AI-powered natural language understanding.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {aiCommandExamples.basic.map((example, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="font-mono text-sm text-green-600 mb-1">"{example.command}"</div>
                            <div className="text-xs text-gray-600">{example.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Semantic Commands */}
                    <div>
                      <h4 className="text-lg font-semibold text-purple-600 mb-3">🧠 Semantic Mode Commands</h4>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-purple-700">
                          Semantic mode uses AI embeddings to understand file content and find files by meaning, not just name.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {aiCommandExamples.semantic.map((example, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="font-mono text-sm text-purple-600 mb-1">"{example.command}"</div>
                            <div className="text-xs text-gray-600">{example.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Advanced Commands */}
                    <div>
                      <h4 className="text-lg font-semibold text-green-600 mb-3">🚀 Advanced Mode Commands</h4>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-green-700">
                          Advanced mode uses GPT-4 function calling for complex operations like organization and analysis.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {aiCommandExamples.advanced.map((example, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="font-mono text-sm text-green-600 mb-1">"{example.command}"</div>
                            <div className="text-xs text-gray-600">{example.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts Tab */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">⌨️ Keyboard Shortcuts</h3>
                  <p className="text-gray-600 mb-6">
                    Use these keyboard shortcuts to navigate and operate the Smart AI File Explorer efficiently:
                  </p>

                  <div className="grid gap-3">
                    {keyboardShortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                            {shortcut.keys}
                          </kbd>
                          <span className="text-gray-700">{shortcut.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                    <h4 className="font-semibold text-gray-800 mb-2">💡 Navigation Tips</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Use Tab to navigate between UI elements</li>
                      <li>• Press Enter to activate buttons and links</li>
                      <li>• Use Arrow keys to navigate in lists and trees</li>
                      <li>• Escape closes dialogs and cancels operations</li>
                      <li>• Ctrl+A selects all files in current view</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-white">🤖</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Smart AI File Explorer</h3>
                  <p className="text-gray-600 mb-6">Version 1.0.0</p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">About This Application</h4>
                  <p className="text-gray-700 mb-4">
                    Smart AI File Explorer is a modern, AI-powered file management application that combines 
                    traditional file operations with advanced artificial intelligence capabilities. Built with 
                    React, TypeScript, and Electron, it leverages OpenAI's GPT-4 and embedding models to provide 
                    intelligent file search, organization, and management.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-2">🛠️ Built With</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• React 18 + TypeScript</li>
                        <li>• Electron 28</li>
                        <li>• OpenAI GPT-4 API</li>
                        <li>• Tailwind CSS</li>
                        <li>• Webpack</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-2">🎯 Features</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Natural language search</li>
                        <li>• Semantic file discovery</li>
                        <li>• AI-powered organization</li>
                        <li>• Voice input support</li>
                        <li>• File content analysis</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">📄 License & Credits</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-700">License</h5>
                      <p className="text-sm text-gray-600">MIT License - Free to use, modify, and distribute</p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-700">AI Models</h5>
                      <p className="text-sm text-gray-600">
                        Powered by OpenAI's GPT-4, GPT-4 Vision, and text-embedding-3-small models
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-700">Icons & Design</h5>
                      <p className="text-sm text-gray-600">
                        UI components inspired by Microsoft Fluent Design and modern web standards
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notes</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Requires OpenAI API key for AI features</li>
                    <li>• AI features send file metadata (not content) to OpenAI</li>
                    <li>• Local files are never uploaded or stored remotely</li>
                    <li>• Some AI features require internet connection</li>
                    <li>• Usage subject to OpenAI's terms and pricing</li>
                  </ul>
                </div>

                <div className="text-center pt-4">
                  <p className="text-xs text-gray-500">
                    Built with ❤️ for intelligent file management
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Need more help? Check the settings for configuration options.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close Help
          </button>
        </div>
      </div>
    </div>
  );
};
