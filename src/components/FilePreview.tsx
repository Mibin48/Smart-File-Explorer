import React, { useState, useEffect } from 'react';

interface FileContent {
  type: 'text' | 'image' | 'pdf' | 'binary';
  content: string | null;
  fileName: string;
  size: number;
  extension: string;
  message?: string;
  error?: string;
}

interface FilePreviewProps {
  filePath: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ filePath, isOpen, onClose }) => {
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && filePath) {
      loadFileContent(filePath);
    } else {
      setFileContent(null);
      setError(null);
    }
  }, [isOpen, filePath]);

  const loadFileContent = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await (window as any).electronAPI.readFileContent(path);
      
      if (result.error) {
        setError(result.error);
      } else {
        setFileContent(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWithDefault = async () => {
    if (filePath) {
      try {
        await (window as any).electronAPI.openFile(filePath);
      } catch (err) {
        setError('Failed to open file with default application');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading file...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-red-500">
            <svg className="w-12 h-12 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
            {filePath && (
              <button
                onClick={handleOpenWithDefault}
                className="mt-3 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Open with default app
              </button>
            )}
          </div>
        </div>
      );
    }

    if (!fileContent) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No file selected</p>
        </div>
      );
    }

    switch (fileContent.type) {
      case 'text':
        return (
          <div className="h-full">
            <pre className="bg-gray-50 p-4 rounded text-sm font-mono h-full overflow-auto whitespace-pre-wrap">
              {fileContent.content}
            </pre>
          </div>
        );

      case 'image':
        return (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded">
            <img 
              src={fileContent.content || ''} 
              alt={fileContent.fileName}
              className="max-w-full max-h-full object-contain rounded"
            />
          </div>
        );

      case 'pdf':
      case 'binary':
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-gray-600 mb-4">{fileContent.message}</p>
              <button
                onClick={handleOpenWithDefault}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Open with default app
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Unsupported file type</p>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-[90vw] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {fileContent?.fileName || 'File Preview'}
              </h3>
              {fileContent && (
                <p className="text-sm text-gray-500">
                  {formatFileSize(fileContent.size)} • {fileContent.extension.toUpperCase()} file
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {fileContent && filePath && (
              <button
                onClick={handleOpenWithDefault}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Open
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
