import React, { useState, useRef, useEffect } from 'react';

interface CommandInputProps {
  onCommand: (command: string) => void;
  currentPath?: string;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onCommand, currentPath }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentFolder = currentPath ? currentPath.split('\\').pop() || 'directory' : 'directory';
  const hasSelectedDirectory = Boolean(currentPath);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSelectedDirectory) {
      alert('Please select a directory from the file tree first before searching.');
      return;
    }
    if (input.trim()) {
      onCommand(input.trim());
      setInput('');
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in this browser');
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
              <span className="text-sm font-medium text-blue-800">Ready to search in:</span>
              <span className="text-sm font-mono text-blue-700 bg-white px-2 py-1 rounded">
                {currentFolder}
              </span>
            </div>
            <span className="text-xs text-blue-600">📁 Directory selected</span>
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

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasSelectedDirectory 
              ? `🔍 Ask AI to search in ${currentFolder}: "find Moonlight Sonata", "show C files", "find merged PDFs", etc...` 
              : "Select TestFiles directory first, then try: 'find classical music', 'show programming files'..."
            }
            disabled={!hasSelectedDirectory}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasSelectedDirectory 
                ? 'border-gray-300 bg-white' 
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          />
          {isListening && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleVoiceInput}
          disabled={!hasSelectedDirectory}
          className={`px-4 py-2 rounded-lg border ${
            !hasSelectedDirectory
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
          disabled={!hasSelectedDirectory}
          className={`px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            hasSelectedDirectory
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {hasSelectedDirectory ? '🤖 Ask AI' : '📁 Select Directory First'}
        </button>
      </form>
    </div>
  );
};
