import React, { useState } from 'react';

interface NewItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onItemCreated: () => void;
}

interface ItemTemplate {
  type: string;
  name: string;
  description: string;
  icon: string;
  extension?: string;
  defaultContent?: string;
}

const itemTemplates: ItemTemplate[] = [
  {
    type: 'folder',
    name: 'Folder',
    description: 'Create a new folder',
    icon: '📁',
  },
  {
    type: 'text-file',
    name: 'Text File',
    description: 'Plain text document',
    icon: '📄',
    extension: '.txt',
  },
  {
    type: 'markdown-file',
    name: 'Markdown File',
    description: 'Markdown document',
    icon: '📝',
    extension: '.md',
  },
  {
    type: 'html-file',
    name: 'HTML File',
    description: 'HTML web page',
    icon: '🌐',
    extension: '.html',
  },
  {
    type: 'css-file',
    name: 'CSS File',
    description: 'Stylesheet',
    icon: '🎨',
    extension: '.css',
  },
  {
    type: 'js-file',
    name: 'JavaScript File',
    description: 'JavaScript code',
    icon: '⚡',
    extension: '.js',
  },
  {
    type: 'json-file',
    name: 'JSON File',
    description: 'JSON data file',
    icon: '📋',
    extension: '.json',
  },
  {
    type: 'document',
    name: 'Word Document',
    description: 'Microsoft Word document',
    icon: '📘',
    extension: '.docx',
  },
  {
    type: 'spreadsheet',
    name: 'Excel Spreadsheet',
    description: 'Microsoft Excel spreadsheet',
    icon: '📊',
    extension: '.xlsx',
  },
  {
    type: 'presentation',
    name: 'PowerPoint Presentation',
    description: 'Microsoft PowerPoint presentation',
    icon: '📊',
    extension: '.pptx',
  },
];

export const NewItemDialog: React.FC<NewItemDialogProps> = ({
  isOpen,
  onClose,
  currentPath,
  onItemCreated,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ItemTemplate | null>(null);
  const [itemName, setItemName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [step, setStep] = useState<'select' | 'name'>('select');

  const handleTemplateSelect = (template: ItemTemplate) => {
    setSelectedTemplate(template);
    setItemName('');
    setStep('name');
  };

  const handleCreateItem = async () => {
    if (!selectedTemplate || !itemName.trim()) return;

    setIsCreating(true);
    try {
      const templateData = selectedTemplate.defaultContent 
        ? { content: selectedTemplate.defaultContent } 
        : undefined;

      const result = await (window as any).electronAPI.createItemEnhanced(
        selectedTemplate.type,
        currentPath,
        itemName.trim(),
        templateData
      );

      if (result.success) {
        onItemCreated();
        onClose();
        resetDialog();
      } else {
        console.error('Failed to create item:', result.error);
        // You could show an error message here
      }
    } catch (err) {
      console.error('Failed to create item:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = () => {
    setSelectedTemplate(null);
    setItemName('');
    setStep('select');
    setIsCreating(false);
  };

  const handleClose = () => {
    if (!isCreating) {
      resetDialog();
      onClose();
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedTemplate(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {step === 'name' && selectedTemplate && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isCreating}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {step === 'select' ? 'Create New Item' : `New ${selectedTemplate?.name}`}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {step === 'select' 
                  ? 'Choose what you want to create' 
                  : `Create a new ${selectedTemplate?.name.toLowerCase()}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isCreating}
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {itemTemplates.map((template) => (
                <button
                  key={template.type}
                  onClick={() => handleTemplateSelect(template)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                  disabled={isCreating}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 group-hover:text-blue-700">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {template.description}
                      </div>
                      {template.extension && (
                        <div className="text-xs text-gray-500 mt-1 font-mono">
                          {template.extension}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {selectedTemplate && (
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl">{selectedTemplate.icon}</div>
                  <div>
                    <div className="font-medium text-blue-800">{selectedTemplate.name}</div>
                    <div className="text-sm text-blue-600">{selectedTemplate.description}</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedTemplate?.type === 'folder' ? 'Folder Name' : 'File Name'}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder={`Enter ${selectedTemplate?.type === 'folder' ? 'folder' : 'file'} name...`}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isCreating}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateItem();
                      }
                    }}
                  />
                  {selectedTemplate?.extension && (
                    <span className="text-gray-500 font-mono text-sm">
                      {selectedTemplate.extension}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">
                  <strong>Location:</strong> {currentPath}
                </div>
                {selectedTemplate?.extension && (
                  <div className="text-sm text-gray-600 mt-2">
                    <strong>Full path:</strong> {currentPath}\\{itemName}{selectedTemplate.extension}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'name' && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateItem}
              disabled={!itemName.trim() || isCreating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isCreating && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isCreating ? 'Creating...' : 'Create'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
