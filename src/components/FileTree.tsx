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
  childrenLoaded?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({ currentPath, onPathChange, userDirectories }) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [drives, setDrives] = useState<string[]>([]);

  // Load available drives on component mount
  useEffect(() => {
    const loadDrives = async () => {
      try {
        console.log('Loading drives...');
        const availableDrives = await (window as any).electronAPI.getDrives();
        console.log('Received drives from API:', availableDrives);
        
        if (availableDrives && Array.isArray(availableDrives) && availableDrives.length > 0) {
          setDrives(availableDrives);
          console.log('Set drives:', availableDrives);
        } else {
          console.warn('No drives returned from API, using fallback');
          setDrives(['C:\\']);
        }
      } catch (error) {
        console.error('Failed to load drives:', error);
        // Fallback to common Windows drives
        setDrives(['C:\\', 'D:\\']);
      }
    };
    
    loadDrives();
  }, []);

  useEffect(() => {
    if (!userDirectories) return;
    
    const loadTestFilesChildren = async () => {
      try {
        // Get dynamic path for cross-computer compatibility
        const appPath = await (window as any).electronAPI.getAppPath();
        const testFilesPath = appPath ? `${appPath}\\TestFiles` : 'C:\\TestFiles';
        const result = await (window as any).electronAPI.readDir(testFilesPath);
        if (result && !result.error && Array.isArray(result)) {
          const subdirectories = result
            .filter((item: any) => item.isDirectory)
            .map((dir: any) => ({
              name: getDirectoryIcon(dir.name) + ' ' + dir.name,
              path: dir.fullPath,
              isDirectory: true,
              expanded: false,
              childrenLoaded: false,
              children: undefined
            }));
          return subdirectories;
        }
      } catch (err) {
        console.error('Failed to load TestFiles directory:', err);
      }
      return [];
    };
    
    // Initialize with user's actual directories - Test Files first for easy demo
    const initializeTree = async () => {
      const testFilesChildren = await loadTestFilesChildren();
      
      // Get dynamic path for cross-computer compatibility
      const appPath = await (window as any).electronAPI.getAppPath();
      const testFilesPath = appPath ? `${appPath}\\TestFiles` : 'C:\\TestFiles';
      
      const initialTree: TreeNode[] = [
        {
          name: '🎆 Demo Files',
          path: testFilesPath,
          isDirectory: true,
          expanded: true,
          childrenLoaded: true,
          children: testFilesChildren,
        },
        {
          name: '☁️ OneDrive',
          path: userDirectories.oneDrive,
          isDirectory: true,
          expanded: false,
          childrenLoaded: false,
        },
        {
          name: '🏠 Home Directory',
          path: userDirectories.home,
          isDirectory: true,
          expanded: false,
          childrenLoaded: false,
        },
        // Add separator
        {
          name: 'Drives',
          path: 'separator-drives',
          isDirectory: false,
        },
        // Add all detected drives dynamically
        ...drives.map((drive, index) => {
          // Get drive letter for display
          const driveLetter = drive.replace(':\\', ':');
          const driveInfo = getDriveInfo(drive);
          
          return {
            name: `${driveInfo.icon} ${driveInfo.label} (${driveLetter})`,
            path: drive,
            isDirectory: true,
            expanded: false,
            childrenLoaded: false,
          };
        }),
      ];
      setTreeData(initialTree);
    };
    
    initializeTree();
  }, [userDirectories, drives]);
  
  // Helper function to get appropriate icons for directory names
  const getDirectoryIcon = (dirName: string): string => {
    const name = dirName.toLowerCase();
    if (name.includes('document')) return '📄';
    if (name.includes('image')) return '🖼️';
    if (name.includes('audio')) return '🎵';
    if (name.includes('code')) return '💻';
    if (name.includes('presentation')) return '📊';
    if (name.includes('video')) return '📹';
    if (name.includes('spreadsheet')) return '📈';
    if (name.includes('archive')) return '📦';
    if (name.includes('temp')) return '🗂️';
    return '📁';
  };

  // Helper function to get drive information
  const getDriveInfo = (drivePath: string) => {
    const driveLetter = drivePath.charAt(0).toUpperCase();
    
    // Common drive types and their typical purposes
    switch (driveLetter) {
      case 'C':
        return { icon: '💾', label: 'System Drive' };
      case 'D':
        return { icon: '💿', label: 'Local Disk' };
      case 'E':
      case 'F':
      case 'G':
      case 'H':
        return { icon: '💽', label: 'Local Disk' };
      case 'A':
      case 'B':
        return { icon: '💾', label: 'Floppy Disk' };
      default:
        return { icon: '💿', label: 'Local Disk' };
    }
  };

  const toggleNode = async (node: TreeNode) => {
    // Skip separators
    if (node.path.startsWith('separator')) {
      return;
    }
    if (node.isDirectory) {
      node.expanded = !node.expanded;
      
      // If expanding and children haven't been loaded, load them dynamically
      if (node.expanded && !node.childrenLoaded) {
        try {
          console.log(`Loading contents for: ${node.path}`);
          const result = await (window as any).electronAPI.readDir(node.path);
          
          if (result && result.error) {
            console.error(`Error reading directory ${node.path}:`, result.error);
            // Add a placeholder child to indicate error
            node.children = [{
              name: `Cannot access ${node.name}`,
              path: '',
              isDirectory: false,
              expanded: false,
              childrenLoaded: true,
              children: [],
              isError: true
            }];
            node.childrenLoaded = true;
          } else if (result && Array.isArray(result)) {
            // Filter to only show directories in the tree
            const subdirectories = result
              .filter((item: any) => item.isDirectory)
              .map((dir: any) => ({
                name: dir.name,
                path: dir.fullPath,
                isDirectory: true,
                expanded: false,
                childrenLoaded: false,
                children: undefined
              }));
            
            console.log(`Loaded ${subdirectories.length} subdirectories for ${node.path}`);
            node.children = subdirectories;
            node.childrenLoaded = true;
          } else {
            console.warn(`Unexpected result format for ${node.path}:`, result);
            node.children = [];
            node.childrenLoaded = true;
          }
        } catch (err) {
          console.error(`Failed to load directory contents for ${node.path}:`, err);
          node.children = [];
          node.childrenLoaded = true;
        }
      }
      
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
              : (node as any).isError
              ? 'text-red-500 cursor-not-allowed opacity-75 bg-red-50 hover:bg-red-50'
              : currentPath === node.path 
              ? 'bg-blue-500 text-white shadow-md cursor-pointer transform scale-[1.02]' 
              : 'hover:bg-white hover:shadow-sm cursor-pointer text-gray-700 hover:text-gray-900'
          }`}
          style={{ paddingLeft: `${paddingLeft + 12}px`, marginLeft: `${level * 4}px` }}
          onClick={() => !isSeparator && !(node as any).isError && toggleNode(node)}
          title={isSeparator ? '' : (node as any).isError ? 'Access denied' : `Click to select: ${node.path}`}
        >
          {(node as any).isError ? (
            <svg className="w-4 h-4 mr-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : !isSeparator && node.isDirectory ? (
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
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
        <div className="space-y-1">
          {treeData.map((node) => renderNode(node))}
        </div>
      </div>
    </div>
  );
};
