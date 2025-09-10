import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM12 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Smart AI File Explorer</h1>
          <p className="text-gray-600 mb-6">React application loaded successfully!</p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <span className="text-sm text-gray-600">React:</span>
              <span className="text-sm font-medium text-green-600">✓ Working</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <span className="text-sm text-gray-600">TypeScript:</span>
              <span className="text-sm font-medium text-green-600">✓ Working</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <span className="text-sm text-gray-600">Tailwind CSS:</span>
              <span className="text-sm font-medium text-green-600">✓ Working</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <span className="text-sm text-gray-600">Electron:</span>
              <span className="text-sm font-medium text-green-600">✓ Working</span>
            </div>
          </div>
          
          <button 
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            onClick={() => alert('All systems working! Click OK to close this test.')}
          >
            Test Interaction
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestApp;
