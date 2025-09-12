import React, { useState, useEffect, useRef } from 'react';
import { formatFileSize } from '../utils/formatUtils';

interface FileItem {
  name: string;
  type: string;
  modified: string;
  size: string;
  sizeInBytes?: number;
  isDirectory: boolean;
  fullPath: string;
}

interface FileListProps {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  selectedFiles: string[];
  onFileSelect: (files: string[]) => void;
  onFilePreview?: (filePath: string) => void;
  onFolderNavigate?: (folderPath: string) => void;
  viewMode?: 'list' | 'grid' | 'thumbnail';
  onAddBookmark?: (name: string, path: string, type: 'folder' | 'file') => void;
  isRenaming?: string | null;
  newFileName?: string;
  onRename?: (filePath: string, currentName: string) => void;
  onRenameConfirm?: () => void;
  onRenameCancel?: () => void;
  onNewFileNameChange?: (name: string) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  loading,
  error,
  selectedFiles,
  onFileSelect,
  onFilePreview,
  onFolderNavigate,
  viewMode = 'list',
  onAddBookmark,
  isRenaming,
  newFileName,
  onRename,
  onRenameConfirm,
  onRenameCancel,
  onNewFileNameChange,
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [keyboardMode, setKeyboardMode] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, file: FileItem} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Update refs array when files change
  useEffect(() => {
    fileItemRefs.current = fileItemRefs.current.slice(0, files.length);
  }, [files.length]);

  // Reset focus when files change
  useEffect(() => {
    setFocusedIndex(-1);
    setKeyboardMode(false);
  }, [files]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (files.length === 0) return;

      switch (keyboardEvent.key) {
        case 'ArrowRight':
          if (viewMode === 'grid' || viewMode === 'thumbnail') {
            keyboardEvent.preventDefault();
            setKeyboardMode(true);
            setFocusedIndex(prev => {
              const newIndex = Math.min(prev + 1, files.length - 1);
              scrollToFocusedItem(newIndex);
              return newIndex;
            });
          } else {
            // In list view, right arrow does nothing
            keyboardEvent.preventDefault();
          }
          break;
          
        case 'ArrowLeft':
          if (viewMode === 'grid' || viewMode === 'thumbnail') {
            keyboardEvent.preventDefault();
            setKeyboardMode(true);
            setFocusedIndex(prev => {
              const newIndex = Math.max(prev - 1, 0);
              scrollToFocusedItem(newIndex);
              return newIndex;
            });
          } else {
            // In list view, left arrow does nothing
            keyboardEvent.preventDefault();
          }
          break;
          
        case 'ArrowDown':
          if (viewMode === 'grid' || viewMode === 'thumbnail') {
            keyboardEvent.preventDefault();
            setKeyboardMode(true);
            const itemsPerRow = viewMode === 'grid' ? 6 : 4;
            setFocusedIndex(prev => {
              const currentRow = Math.floor(prev / itemsPerRow);
              const currentCol = prev % itemsPerRow;
              const nextRowIndex = (currentRow + 1) * itemsPerRow + currentCol;
              const newIndex = Math.min(nextRowIndex, files.length - 1);
              scrollToFocusedItem(newIndex);
              return newIndex;
            });
          } else {
            // List view - continue with regular down navigation
            keyboardEvent.preventDefault();
            setKeyboardMode(true);
            setFocusedIndex(prev => {
              const newIndex = prev < files.length - 1 ? prev + 1 : 0;
              scrollToFocusedItem(newIndex);
              return newIndex;
            });
          }
          break;
          
        case 'ArrowUp':
          if (viewMode === 'grid' || viewMode === 'thumbnail') {
            keyboardEvent.preventDefault();
            setKeyboardMode(true);
            const itemsPerRow = viewMode === 'grid' ? 6 : 4;
            setFocusedIndex(prev => {
              const currentRow = Math.floor(prev / itemsPerRow);
              const currentCol = prev % itemsPerRow;
              const prevRowIndex = Math.max(0, (currentRow - 1) * itemsPerRow + currentCol);
              const newIndex = currentRow > 0 ? prevRowIndex : prev;
              scrollToFocusedItem(newIndex);
              return newIndex;
            });
          } else {
            // List view - continue with regular up navigation
            keyboardEvent.preventDefault();
            setKeyboardMode(true);
            setFocusedIndex(prev => {
              const newIndex = prev > 0 ? prev - 1 : files.length - 1;
              scrollToFocusedItem(newIndex);
              return newIndex;
            });
          }
          break;
          
        case 'Enter':
          keyboardEvent.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < files.length) {
            const file = files[focusedIndex];
            handleFileClick(file);
          }
          break;
          
        case 'Space':
          keyboardEvent.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < files.length) {
            const file = files[focusedIndex];
            handleFileSelectKeyboard(file);
          }
          break;
          
        case 'Escape':
          setKeyboardMode(false);
          setFocusedIndex(-1);
          break;
          
        case 'Home':
          keyboardEvent.preventDefault();
          setKeyboardMode(true);
          setFocusedIndex(0);
          scrollToFocusedItem(0);
          break;
          
        case 'End':
          keyboardEvent.preventDefault();
          setKeyboardMode(true);
          const lastIndex = files.length - 1;
          setFocusedIndex(lastIndex);
          scrollToFocusedItem(lastIndex);
          break;
      }
    };

    // Add event listener to container or document
    const target = containerRef.current || document;
    target.addEventListener('keydown', handleKeyDown);

    return () => {
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [files, focusedIndex, viewMode]);

  const scrollToFocusedItem = (index: number) => {
    const itemRef = fileItemRefs.current[index];
    if (itemRef && containerRef.current) {
      // Add a small delay to ensure the animation is smooth
      setTimeout(() => {
        itemRef.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 50);
    }
  };

  const handleFileSelectKeyboard = (file: FileItem) => {
    if (selectedFiles.includes(file.fullPath)) {
      onFileSelect(selectedFiles.filter(path => path !== file.fullPath));
    } else {
      onFileSelect([...selectedFiles, file.fullPath]);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, file: FileItem) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      file
    });
  };

  const handleAddToBookmarks = (file: FileItem) => {
    if (onAddBookmark) {
      onAddBookmark(file.name, file.fullPath, file.isDirectory ? 'folder' : 'file');
    }
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleFileClick = (file: FileItem, index?: number) => {
    // Disable keyboard mode when clicking with mouse
    if (index !== undefined) {
      setKeyboardMode(false);
      setFocusedIndex(index);
    }
    
    if (file.isDirectory) {
      // Navigate to folder
      if (onFolderNavigate) {
        onFolderNavigate(file.fullPath);
      }
    } else {
      // Show file preview
      if (onFilePreview) {
        onFilePreview(file.fullPath);
      }
    }
  };
  const handleFileSelect = (file: FileItem, event: React.MouseEvent) => {
    // Prevent triggering click when selecting with Ctrl/Cmd
    event.stopPropagation();
    
    if (selectedFiles.includes(file.fullPath)) {
      onFileSelect(selectedFiles.filter(path => path !== file.fullPath));
    } else {
      onFileSelect([...selectedFiles, file.fullPath]);
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5a2 2 0 012 2v2H2V6zM2 10h10v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
        </svg>
      );
    }

    const ext = file.type.toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(ext)) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-500">
          <svg className="w-12 h-12 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full" ref={containerRef} tabIndex={0}>
      {/* Keyboard Navigation Indicator */}
      {keyboardMode && files.length > 0 && (
        <div className="absolute top-4 right-4 z-30 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H9a1 1 0 110-2H8.771l.146-.585A1 1 0 109.83 8.83L9.447 10H10a1 1 0 110 2H8.553l-.146.585A1 1 0 109.447 14l.324-1.415z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Keyboard Mode</span>
          <div className="text-xs opacity-75">
            {focusedIndex >= 0 ? `${focusedIndex + 1}/${files.length}` : ''}
          </div>
        </div>
      )}
      
      {/* File List */}
      <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 relative">
        {files.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center max-w-md">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              <p className="text-sm font-medium text-gray-600">No files found</p>
              <p className="text-xs text-gray-500 mt-1">Try a different search term or check the file path</p>
              
              {/* Keyboard shortcuts help */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H9a1 1 0 110-2H8.771l.146-.585A1 1 0 109.83 8.83L9.447 10H10a1 1 0 110 2H8.553l-.146.585A1 1 0 109.447 14l.324-1.415z" clipRule="evenodd" />
                  </svg>
                  Keyboard Shortcuts
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono mr-2">↑↓</kbd>
                    <span>Navigate files</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono mr-2">Enter</kbd>
                    <span>Open/Preview</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono mr-2">Space</kbd>
                    <span>Select item</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono mr-2">Esc</kbd>
                    <span>Exit keyboard mode</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : files.length === 0 && loading ? (
          <div className="flex items-center justify-center h-full text-blue-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm">Searching files...</p>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'divide-y divide-gray-100' : viewMode === 'grid' ? 'grid grid-cols-6 gap-4 p-4' : 'grid grid-cols-4 gap-6 p-6'}>
            {files.map((file, index) => {
              const isFocused = keyboardMode && focusedIndex === index;
              const isSelected = selectedFiles.includes(file.fullPath);
              
              return viewMode === 'list' ? (
                <div
                  key={file.fullPath}
                  ref={(el) => (fileItemRefs.current[index] = el)}
                  className={`grid grid-cols-12 px-6 py-3 cursor-pointer group relative border-b border-gray-100 transition-all duration-300 ease-in-out ${
                    isSelected 
                      ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-300 shadow-sm' 
                      : isFocused
                        ? ''
                        : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:border-blue-200 hover:shadow-sm'
                  } ${
                    isFocused 
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 ring-2 ring-blue-400 ring-offset-2 border-blue-500 shadow-xl transform scale-[1.02] z-10' 
                      : ''
                  }`}
                  onClick={() => handleFileClick(file, index)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  title={file.isDirectory ? `Click to open folder: ${file.name}` : `Click to preview: ${file.name}`}
                >
                  <div className="col-span-6 flex items-center">
                    <div className="flex-shrink-0 mr-3">{getFileIcon(file)}</div>
                    {isRenaming === file.fullPath ? (
                      <input
                        type="text"
                        value={newFileName || ''}
                        onChange={(e) => onNewFileNameChange?.(e.target.value)}
                        onBlur={onRenameConfirm}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onRenameConfirm?.();
                          if (e.key === 'Escape') onRenameCancel?.();
                        }}
                        className="text-sm font-medium bg-white border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors duration-200">{file.name}</span>
                    )}
                  </div>
                  <div className="col-span-3 flex items-center text-xs text-gray-500">
                    {file.modified}
                  </div>
                  <div className="col-span-2 flex items-center text-xs text-gray-500">
                    {file.type}
                  </div>
                  <div className="col-span-1 flex items-center text-xs text-gray-500 relative">
                    {file.isDirectory ? '' : (file.sizeInBytes ? formatFileSize(file.sizeInBytes) : file.size)}
                    {/* Selection checkbox */}
                    <button
                      onClick={(e) => handleFileSelect(file, e)}
                      className={`ml-2 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        selectedFiles.includes(file.fullPath)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 hover:border-blue-400 opacity-0 group-hover:opacity-100'
                      }`}
                      title="Select file"
                    >
                      {selectedFiles.includes(file.fullPath) && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={file.fullPath}
                  ref={(el) => (fileItemRefs.current[index] = el)}
                  className={`p-4 rounded-xl cursor-pointer group relative transition-all duration-300 ease-out ${
                    isSelected 
                      ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-400 shadow-md transform scale-105' 
                      : isFocused
                        ? ''
                        : 'border border-gray-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:scale-105'
                  } ${
                    isFocused 
                      ? 'bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 ring-4 ring-blue-400 ring-offset-3 border-2 border-blue-500 shadow-2xl transform scale-110 z-20' 
                      : ''
                  }`}
                  onClick={() => handleFileClick(file, index)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  title={file.isDirectory ? `Click to open folder: ${file.name}` : `Click to preview: ${file.name}`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 p-2 rounded-lg bg-white shadow-sm group-hover:shadow-md transition-shadow duration-200">
                      {React.cloneElement(getFileIcon(file), { 
                        className: viewMode === 'thumbnail' ? 'w-16 h-16' : 'w-10 h-10'
                      })}
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate w-full group-hover:text-blue-700 transition-colors duration-200">{file.name}</span>
                    <div className="text-xs text-gray-500 mt-1 font-medium">
                      {file.isDirectory ? 'Folder' : (file.sizeInBytes ? formatFileSize(file.sizeInBytes) : file.size)}
                    </div>
                    <button
                      onClick={(e) => handleFileSelect(file, e)}
                      className={`absolute top-2 right-2 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        selectedFiles.includes(file.fullPath)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 hover:border-blue-400 opacity-0 group-hover:opacity-100'
                      }`}
                      title="Select file"
                    >
                      {selectedFiles.includes(file.fullPath) && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => handleAddToBookmarks(contextMenu.file)}
            className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center space-x-2 text-sm"
          >
            <span>⭐</span>
            <span>Add to Bookmarks</span>
          </button>
          <button
            onClick={() => {
              onRename?.(contextMenu.file.fullPath, contextMenu.file.name);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-sm"
          >
            <span>✏️</span>
            <span>Rename</span>
          </button>
          <button
            onClick={() => {
              if (contextMenu.file.isDirectory && onFolderNavigate) {
                onFolderNavigate(contextMenu.file.fullPath);
              } else if (!contextMenu.file.isDirectory && onFilePreview) {
                onFilePreview(contextMenu.file.fullPath);
              }
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-sm"
          >
            <span>{contextMenu.file.isDirectory ? '📁' : '👁️'}</span>
            <span>{contextMenu.file.isDirectory ? 'Open Folder' : 'Preview File'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
