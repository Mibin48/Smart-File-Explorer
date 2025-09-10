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
    
    // Initialize with user's actual directories
    const initialTree: TreeNode[] = [
      {
        name: 'Test Files (Demo)',
        path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles',
        isDirectory: true,
        expanded: true,
        children: [
          {
            name: 'Documents',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Documents',
            isDirectory: true,
            expanded: false,
          },
          {
            name: 'Images',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Images',
            isDirectory: true,
            expanded: false,
          },
          {
            name: 'Videos',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Videos',
            isDirectory: true,
            expanded: false,
          },
          {
            name: 'Code',
            path: 'C:\\Users\\mibin\\OneDrive\\Desktop\\Smart File-Explorer\\TestFiles\\Code',
            isDirectory: true,
            expanded: false,
          },
        ],
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
    if (node.isDirectory) {
      node.expanded = !node.expanded;
      setTreeData([...treeData]);
      onPathChange(node.path);
    }
  };

  const renderNode = (node: TreeNode, level: number = 0): JSX.Element => {
    const paddingLeft = level * 20;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-2 px-3 cursor-pointer rounded transition-colors ${
            currentPath === node.path 
              ? 'bg-blue-100 text-blue-700 border-l-3 border-blue-500 shadow-sm' 
              : 'hover:bg-gray-100 hover:shadow-sm'
          }`}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={() => toggleNode(node)}
          title={`Click to select: ${node.path}`}
        >
          {node.isDirectory ? (
            <svg
              className={`w-4 h-4 mr-2 transition-transform ${
                node.expanded ? 'rotate-90' : ''
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className="text-sm truncate">{node.name}</span>
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
    <div className="h-full flex flex-col">
      <div className="p-4 flex-shrink-0">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">STEP 1: SELECT DIRECTORY</h3>
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
            👉 Click on any directory below to select it for AI search
          </div>
        </div>
      </div>
      <div className="flex-1 scrollbar-thin px-4 pb-4" style={{ overflowY: 'auto' }}>
        <div className="space-y-1">
          {treeData.map((node) => renderNode(node))}
        </div>
      </div>
    </div>
  );
};
