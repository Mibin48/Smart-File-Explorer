import React, { useState, useEffect } from 'react';

interface Bookmark {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  dateAdded: string;
  icon?: string;
}

interface BookmarkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  onBookmarkUpdate: (bookmarks: Bookmark[]) => void;
  onNavigate: (path: string) => void;
  onOpenFile?: (path: string) => void;
  currentPath?: string;
}

export const BookmarkDialog: React.FC<BookmarkDialogProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onBookmarkUpdate,
  onNavigate,
  onOpenFile,
  currentPath,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [newBookmarkPath, setNewBookmarkPath] = useState('');
  const [newBookmarkType, setNewBookmarkType] = useState<'folder' | 'file'>('folder');

  // Filter and sort bookmarks
  const filteredBookmarks = bookmarks
    .filter(bookmark => 
      bookmark.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookmark.path.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleBookmarkClick = async (bookmark: Bookmark) => {
    if (bookmark.type === 'folder') {
      onNavigate(bookmark.path);
      onClose();
    } else if (bookmark.type === 'file' && onOpenFile) {
      try {
        await onOpenFile(bookmark.path);
      } catch (error) {
        console.error('Failed to open bookmarked file:', error);
      }
    }
  };

  const handleDeleteBookmarks = () => {
    const updatedBookmarks = bookmarks.filter(bookmark => 
      !selectedBookmarks.includes(bookmark.id)
    );
    onBookmarkUpdate(updatedBookmarks);
    setSelectedBookmarks([]);
  };

  const handleAddBookmark = () => {
    if (!newBookmarkName.trim() || !newBookmarkPath.trim()) return;

    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      name: newBookmarkName.trim(),
      path: newBookmarkPath.trim(),
      type: newBookmarkType,
      dateAdded: new Date().toISOString(),
      icon: newBookmarkType === 'folder' ? '📁' : '📄'
    };

    onBookmarkUpdate([...bookmarks, newBookmark]);
    setShowAddDialog(false);
    setNewBookmarkName('');
    setNewBookmarkPath('');
    setNewBookmarkType('folder');
  };

  const handleAddCurrentPath = () => {
    if (!currentPath) return;

    const folderName = currentPath.split('\\').pop() || 'Folder';
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      name: folderName,
      path: currentPath,
      type: 'folder',
      dateAdded: new Date().toISOString(),
      icon: '📁'
    };

    // Check if bookmark already exists
    if (!bookmarks.some(b => b.path === currentPath)) {
      onBookmarkUpdate([...bookmarks, newBookmark]);
    }
  };

  const getFileIcon = (bookmark: Bookmark) => {
    if (bookmark.type === 'folder') {
      return '📁';
    }
    
    const ext = bookmark.path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📕';
      case 'doc':
      case 'docx': return '📘';
      case 'txt': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'mp4':
      case 'avi': return '🎬';
      case 'mp3':
      case 'wav': return '🎵';
      case 'zip':
      case 'rar': return '📦';
      case 'js':
      case 'ts':
      case 'html':
      case 'css': return '⚡';
      default: return '📄';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">⭐</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Bookmarks</h2>
              <p className="text-sm text-gray-600 mt-1">
                {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'type')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date</option>
                <option value="type">Sort by Type</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <svg className={`w-4 h-4 text-gray-600 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedBookmarks.length > 0 && (
              <button
                onClick={handleDeleteBookmarks}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Delete ({selectedBookmarks.length})</span>
              </button>
            )}
            {currentPath && (
              <button
                onClick={handleAddCurrentPath}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Add Current</span>
              </button>
            )}
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Add Bookmark</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredBookmarks.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <p className="text-lg font-medium text-gray-600 mb-2">
                  {searchTerm ? 'No matching bookmarks' : 'No bookmarks yet'}
                </p>
                <p className="text-sm text-gray-500">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Add some bookmarks to quickly access your favorite folders and files'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className={`flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 cursor-pointer ${
                    selectedBookmarks.includes(bookmark.id) ? 'bg-blue-100 border-blue-400' : ''
                  }`}
                  onClick={() => handleBookmarkClick(bookmark)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedBookmarks.includes(bookmark.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedBookmarks([...selectedBookmarks, bookmark.id]);
                        } else {
                          setSelectedBookmarks(selectedBookmarks.filter(id => id !== bookmark.id));
                        }
                      }}
                      className="mr-3 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-2xl mr-4 flex-shrink-0">
                      {getFileIcon(bookmark)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-800 truncate">{bookmark.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          bookmark.type === 'folder' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {bookmark.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate font-mono" title={bookmark.path}>
                        {bookmark.path}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Added {new Date(bookmark.dateAdded).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {bookmark.type === 'folder' && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Click to navigate
                      </span>
                    )}
                    {bookmark.type === 'file' && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        Click to open
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Bookmark Dialog */}
        {showAddDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Bookmark</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="folder"
                          checked={newBookmarkType === 'folder'}
                          onChange={(e) => setNewBookmarkType(e.target.value as 'folder' | 'file')}
                          className="mr-2"
                        />
                        📁 Folder
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="file"
                          checked={newBookmarkType === 'file'}
                          onChange={(e) => setNewBookmarkType(e.target.value as 'folder' | 'file')}
                          className="mr-2"
                        />
                        📄 File
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={newBookmarkName}
                      onChange={(e) => setNewBookmarkName(e.target.value)}
                      placeholder="Enter bookmark name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Path</label>
                    <input
                      type="text"
                      value={newBookmarkPath}
                      onChange={(e) => setNewBookmarkPath(e.target.value)}
                      placeholder="Enter full path..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddDialog(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBookmark}
                    disabled={!newBookmarkName.trim() || !newBookmarkPath.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Bookmark
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
