import React, { useState, useEffect } from 'react';

interface FileTreeProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  userDirectories?: any;
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  expanded?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({ currentPath, onPathChange, userDirectories }) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (!userDirectories) return;
    
    // Initialize with user's actual directories - Test Files first for easy demo
    const initialTree: TreeNode[] = [
      {
        name: '🎆 Demo Files',
        path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles',
        isDirectory: true,
        expanded: true,
        children: [
          {
            name: '📄 Documents',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Documents',
            isDirectory: true,
            expanded: false,
          },
          {
            name: '🖼️ Images',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Images',
            isDirectory: true,
            expanded: false,
          },
          {
            name: '🎵 Audio',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Audio',
            isDirectory: true,
            expanded: false,
          },
          {
            name: '💻 Code',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Code',
            isDirectory: true,
            expanded: false,
          },
          {
            name: '📊 Presentations',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Presentations',
            isDirectory: true,
            expanded: false,
          },
          {
            name: '📹 Videos',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Videos',
            isDirectory: true,
            expanded: false,
          },
          {
            name: '📈 Spreadsheets',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Spreadsheets',
            isDirectory: true,
            expanded: false,
          },
          {
            name: '📦 Archives',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Archives',
            isDirectory: true,
            expanded: false,
          },
          {
            name: '🗂️ Temporary',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Temporary',
            isDirectory: true,
            expanded: false,
          },
        ],
      },
      {
        name: 'System Directories',
        path: 'separator2', 
        isDirectory: false,
        expanded: false,
      },
      {
        name: 'Desktop',
        path: userDirectories.desktop,
        isDirectory: true,
        expanded: false,
      },
      {
        name: 'Documents',
        path: userDirectories.documents,
        isDirectory: true,
        expanded: false,
      },
      {
        name: 'Downloads',
        path: userDirectories.downloads,
        isDirectory: true,
        expanded: false,
      },
      {
        name: 'OneDrive',
        path: userDirectories.oneDrive,
        isDirectory: true,
        expanded: false,
      },
      {
        name: 'Pictures',
        path: userDirectories.pictures,
        isDirectory: true,
        expanded: false,
      },
      {
        name: 'Videos',
        path: userDirectories.videos,
        isDirectory: true,
        expanded: false,
      },
      {
        name: 'Music',
        path: userDirectories.music,
        isDirectory: true,
        expanded: false,
      },
      {
        name: 'Home Directory',
        path: userDirectories.home,
        isDirectory: true,
        expanded: true,
        children: [
          {
            name: 'Desktop',
            path: userDirectories.desktop,
            isDirectory: true,
            expanded: false,
          },
          {
            name: 'Documents',
            path: userDirectories.documents,
            isDirectory: true,
            expanded: false,
          },
          {
            name: 'Downloads',
            path: userDirectories.downloads,
            isDirectory: true,
            expanded: false,
          },
        ],
      },
      {
        name: 'Local Disk (C:)',
        path: 'C:\\',
        isDirectory: true,
        expanded: false,
        children: [
          {
            name: 'Program Files',
            path: 'C:\\Program Files',
            isDirectory: true,
            expanded: false,
          },
          {
            name: 'Users',
            path: 'C:\\Users',
            isDirectory: true,
            expanded: false,
          },
          {
            name: 'Windows',
            path: 'C:\\Windows',
            isDirectory: true,
            expanded: false,
          },
        ],
      },
    ];
    setTreeData(initialTree);
  }, [userDirectories]);

  const toggleNode = (node: TreeNode) => {
    // Skip separators
    if (node.path.startsWith('separator')) {
      return;
    }
    if (node.isDirectory) {
      node.expanded = !node.expanded;
      setTreeData([...treeData]);
      onPathChange(node.path);
    }
  };

  const renderNode = (node: TreeNode, level: number = 0): JSX.Element => {
    const paddingLeft = level * 20;
    const isSeparator = node.path.startsWith('separator');

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-2 px-3 rounded-md transition-all duration-200 ${
            isSeparator
              ? 'cursor-default text-gray-400 text-xs font-medium border-b border-gray-200 mb-1 bg-transparent'
              : currentPath === node.path 
              ? 'bg-blue-500 text-white shadow-md cursor-pointer transform scale-[1.02]' 
              : 'hover:bg-white hover:shadow-sm cursor-pointer text-gray-700 hover:text-gray-900'
          }`}
          style={{ paddingLeft: `${paddingLeft + 12}px`, marginLeft: `${level * 4}px` }}
          onClick={() => !isSeparator && toggleNode(node)}
          title={isSeparator ? '' : `Click to select: ${node.path}`}
        >
          {!isSeparator && node.isDirectory ? (
            <svg
              className={`w-4 h-4 mr-3 transition-transform duration-200 ${
                node.expanded ? 'rotate-90' : ''
              } ${currentPath === node.path ? 'text-white' : 'text-gray-500'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : !isSeparator ? (
            <svg className={`w-4 h-4 mr-3 ${currentPath === node.path ? 'text-white' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          ) : null}
          <span className={`text-sm font-medium truncate ${
            currentPath === node.path ? 'text-white' : isSeparator ? 'text-gray-400' : 'text-gray-700'
          }`}>{node.name}</span>
        </div>
        {node.expanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-3 flex-shrink-0 bg-white border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          Directories
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {treeData.map((node) => renderNode(node))}
        </div>
      </div>
    </div>
  );
};
