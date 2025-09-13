import React from 'react';

interface TestChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestChatPanel: React.FC<TestChatPanelProps> = ({ isOpen, onClose }) => {
  console.log('TestChatPanel render - isOpen:', isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Test Chat Panel</h2>
          <p className="text-gray-600 mb-4">
            This is a minimal test version to verify the modal works correctly.
          </p>
          <div className="space-y-3">
            <div className="text-left text-sm text-gray-600">
              <p>✅ Modal opens correctly</p>
              <p>✅ Styling works</p>
              <p>✅ Close button functional</p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Close Test Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
