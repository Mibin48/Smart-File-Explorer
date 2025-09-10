import { useState, useCallback } from 'react';

export interface FileItem {
  name: string;
  type: string;
  modified: string;
  size: string;
  isDirectory: boolean;
  fullPath: string;
}

export const useFileSystem = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError(null);

    try {
      // Use Electron API to read directory
      const result = await (window as any).electronAPI.readDir(dirPath);

      if (result.error) {
        setError(result.error);
        setFiles([]);
      } else {
        setFiles(result);
      }
    } catch (err) {
      setError('Failed to read directory');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchFiles = useCallback(async (searchParams: any, searchPath?: string) => {
    console.log('useFileSystem searchFiles called with:', { searchParams, searchPath });
    
    // Get user home directory if no search path provided
    let actualSearchPath = searchPath;
    if (!actualSearchPath) {
      try {
        const userDirs = await (window as any).electronAPI.getUserHome();
        actualSearchPath = userDirs.home;
        console.log('Using home directory:', actualSearchPath);
      } catch (err) {
        actualSearchPath = 'C:\\';
        console.log('Fallback to C:\\');
      }
    }
    
    console.log('Final search path:', actualSearchPath);
    
    setLoading(true);
    setError(null);

    try {
      console.log('Calling electronAPI.searchFiles with:', { searchParams, actualSearchPath });
      
      // Use Electron API to search files with enhanced parameters
      const result = await (window as any).electronAPI.searchFiles(searchParams, actualSearchPath);
      
      console.log('Search result from electron:', result);

      if (result && result.error) {
        console.error('Search error:', result.error);
        setError(result.error);
        setFiles([]);
      } else if (Array.isArray(result)) {
        console.log(`Found ${result.length} files`);
        setFiles(result);
      } else {
        console.log('Unexpected result format:', result);
        setFiles([]);
      }
    } catch (err) {
      console.error('Search failed with exception:', err);
      setError('Search failed: ' + (err instanceof Error ? err.message : String(err)));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeFileOperation = useCallback(async (operation: string, files: string[], destination?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Electron API for file operations
      const result = await (window as any).electronAPI.fileOperation(operation, files, destination);
      
      if (result.error) {
        setError(result.error);
        return false;
      }
      
      return result.success;
    } catch (err) {
      setError('File operation failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    files,
    loading,
    error,
    readDirectory,
    searchFiles,
    executeFileOperation,
  };
};
