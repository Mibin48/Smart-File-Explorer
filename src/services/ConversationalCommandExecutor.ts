import { FileCommand } from './ConversationalAIService';

export interface CommandExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  files?: any[];
  matches?: any[];
  deletedCount?: number;
  movedCount?: number;
  copiedCount?: number;
  name?: string;
}

export interface FileSystemAPI {
  readDirectory: (path: string) => Promise<any[]>;
  searchFiles: (params: any, basePath: string) => Promise<any[]>;
  executeFileOperation: (operation: string, files: string[], destination?: string) => Promise<boolean>;
  openFile: (filePath: string) => Promise<void>;
  renameFile: (filePath: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  createFolder: (path: string, name: string) => Promise<{ success: boolean; error?: string }>;
  createFile: (path: string, name: string, content?: string) => Promise<{ success: boolean; error?: string }>;
}

export class ConversationalCommandExecutor {
  private fileSystemAPI: FileSystemAPI;
  private currentPath: string = '';
  private selectedFiles: string[] = [];

  constructor(fileSystemAPI: FileSystemAPI) {
    this.fileSystemAPI = fileSystemAPI;
  }

  setContext(currentPath: string, selectedFiles: string[]): void {
    this.currentPath = currentPath;
    this.selectedFiles = selectedFiles;
  }

  async executeCommand(command: FileCommand): Promise<CommandExecutionResult> {
    console.log('Executing command:', command);

    try {
      switch (command.action) {
        case 'list':
          return await this.executeList(command);
        case 'search':
          return await this.executeSearch(command);
        case 'delete':
          return await this.executeDelete(command);
        case 'move':
          return await this.executeMove(command);
        case 'copy':
          return await this.executeCopy(command);
        case 'rename':
          return await this.executeRename(command);
        case 'create':
          return await this.executeCreate(command);
        case 'open':
          return await this.executeOpen(command);
        case 'organize':
          return await this.executeOrganize(command);
        case 'analyze':
          return await this.executeAnalyze(command);
        case 'help':
          return this.executeHelp();
        default:
          return {
            success: false,
            message: `Command "${command.action}" is not supported yet.`
          };
      }
    } catch (error) {
      console.error('Command execution error:', error);
      return {
        success: false,
        message: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeList(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      const files = await this.fileSystemAPI.readDirectory(this.currentPath);
      let filteredFiles = files;

      // Apply filters if specified
      if (command.filters) {
        filteredFiles = this.applyFilters(files, command.filters);
      }

      return {
        success: true,
        message: `Found ${filteredFiles.length} files${command.filters ? ' matching your criteria' : ''}.`,
        files: filteredFiles,
        data: { totalFiles: files.length, filteredFiles: filteredFiles.length }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeSearch(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      const searchParams: any = {
        searchTerm: command.target || '',
        fileTypes: command.filters?.type || [],
        sizeRange: command.filters?.size || {},
        dateRange: command.filters?.date || {}
      };

      const matches = await this.fileSystemAPI.searchFiles(searchParams, this.currentPath);

      return {
        success: true,
        message: `Search completed. Found ${matches.length} results for "${command.target}".`,
        matches,
        data: { searchTerm: command.target, resultCount: matches.length }
      };
    } catch (error) {
      return {
        success: false,
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeDelete(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      let filesToDelete: string[] = [];

      if (command.target === 'selected' || !command.target) {
        filesToDelete = [...this.selectedFiles];
      } else {
        // Try to find files matching the target
        const files = await this.fileSystemAPI.readDirectory(this.currentPath);
        filesToDelete = files
          .filter(file => file.name.toLowerCase().includes(command.target!.toLowerCase()))
          .map(file => file.fullPath || `${this.currentPath}\\${file.name}`);
      }

      if (filesToDelete.length === 0) {
        return {
          success: false,
          message: 'No files found to delete. Please select files or specify a valid target.'
        };
      }

      const success = await this.fileSystemAPI.executeFileOperation('delete', filesToDelete);

      if (success) {
        return {
          success: true,
          message: `Successfully deleted ${filesToDelete.length} file(s).`,
          deletedCount: filesToDelete.length,
          data: { deletedFiles: filesToDelete }
        };
      } else {
        return {
          success: false,
          message: 'Delete operation failed. Some files may not have been deleted.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeMove(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      let filesToMove: string[] = [];
      let destination = command.destination;

      if (command.target === 'selected' || !command.target) {
        filesToMove = [...this.selectedFiles];
      } else {
        // Try to find files matching the target
        const files = await this.fileSystemAPI.readDirectory(this.currentPath);
        filesToMove = files
          .filter(file => file.name.toLowerCase().includes(command.target!.toLowerCase()))
          .map(file => file.fullPath || `${this.currentPath}\\${file.name}`);
      }

      if (!destination) {
        return {
          success: false,
          message: 'No destination specified for move operation.'
        };
      }

      if (filesToMove.length === 0) {
        return {
          success: false,
          message: 'No files found to move. Please select files or specify a valid target.'
        };
      }

      // Resolve common folder names
      destination = this.resolveDestinationPath(destination);

      const success = await this.fileSystemAPI.executeFileOperation('move', filesToMove, destination);

      if (success) {
        return {
          success: true,
          message: `Successfully moved ${filesToMove.length} file(s) to ${destination}.`,
          movedCount: filesToMove.length,
          data: { movedFiles: filesToMove, destination }
        };
      } else {
        return {
          success: false,
          message: 'Move operation failed. Some files may not have been moved.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Move failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeCopy(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      let filesToCopy: string[] = [];
      let destination = command.destination;

      if (command.target === 'selected' || !command.target) {
        filesToCopy = [...this.selectedFiles];
      } else {
        const files = await this.fileSystemAPI.readDirectory(this.currentPath);
        filesToCopy = files
          .filter(file => file.name.toLowerCase().includes(command.target!.toLowerCase()))
          .map(file => file.fullPath || `${this.currentPath}\\${file.name}`);
      }

      if (!destination) {
        return {
          success: false,
          message: 'No destination specified for copy operation.'
        };
      }

      if (filesToCopy.length === 0) {
        return {
          success: false,
          message: 'No files found to copy. Please select files or specify a valid target.'
        };
      }

      destination = this.resolveDestinationPath(destination);

      const success = await this.fileSystemAPI.executeFileOperation('copy', filesToCopy, destination);

      if (success) {
        return {
          success: true,
          message: `Successfully copied ${filesToCopy.length} file(s) to ${destination}.`,
          copiedCount: filesToCopy.length,
          data: { copiedFiles: filesToCopy, destination }
        };
      } else {
        return {
          success: false,
          message: 'Copy operation failed. Some files may not have been copied.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeRename(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      if (!command.target || !command.destination) {
        return {
          success: false,
          message: 'Both current name and new name are required for rename operation.'
        };
      }

      // Find the file to rename
      const files = await this.fileSystemAPI.readDirectory(this.currentPath);
      const targetFile = files.find(file => 
        file.name.toLowerCase().includes(command.target!.toLowerCase()) ||
        (this.selectedFiles.length === 1 && command.target === 'selected')
      );

      if (!targetFile && command.target !== 'selected') {
        return {
          success: false,
          message: `File "${command.target}" not found.`
        };
      }

      const fileToRename = targetFile ? 
        (targetFile.fullPath || `${this.currentPath}\\${targetFile.name}`) : 
        this.selectedFiles[0];

      const result = await this.fileSystemAPI.renameFile(fileToRename, command.destination);

      if (result.success) {
        return {
          success: true,
          message: `Successfully renamed to "${command.destination}".`,
          name: command.destination,
          data: { originalPath: fileToRename, newName: command.destination }
        };
      } else {
        return {
          success: false,
          message: result.error || 'Rename operation failed.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeCreate(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      if (!command.target) {
        return {
          success: false,
          message: 'Please specify what you want to create.'
        };
      }

      const name = command.target;
      const isFolder = command.parameters?.type === 'folder' || 
                       name.toLowerCase().includes('folder') || 
                       name.toLowerCase().includes('directory') ||
                       !name.includes('.');

      let result;
      
      if (isFolder) {
        result = await this.fileSystemAPI.createFolder(this.currentPath, name);
      } else {
        const content = command.parameters?.content || '';
        result = await this.fileSystemAPI.createFile(this.currentPath, name, content);
      }

      if (result.success) {
        return {
          success: true,
          message: `Successfully created ${isFolder ? 'folder' : 'file'}: "${name}".`,
          name,
          data: { type: isFolder ? 'folder' : 'file', path: `${this.currentPath}\\${name}` }
        };
      } else {
        return {
          success: false,
          message: result.error || 'Create operation failed.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeOpen(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      if (!command.target) {
        return {
          success: false,
          message: 'Please specify which file to open.'
        };
      }

      let fileToOpen: string = '';

      if (command.target === 'selected' && this.selectedFiles.length > 0) {
        fileToOpen = this.selectedFiles[0];
      } else {
        const files = await this.fileSystemAPI.readDirectory(this.currentPath);
        const targetFile = files.find(file => 
          file.name.toLowerCase().includes(command.target!.toLowerCase())
        );

        if (!targetFile) {
          return {
            success: false,
            message: `File "${command.target}" not found.`
          };
        }

        fileToOpen = targetFile.fullPath || `${this.currentPath}\\${targetFile.name}`;
      }

      await this.fileSystemAPI.openFile(fileToOpen);

      return {
        success: true,
        message: `Opening "${command.target}".`,
        data: { openedFile: fileToOpen }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeOrganize(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      const files = await this.fileSystemAPI.readDirectory(this.currentPath);
      
      // Simple organization by file type
      const organizedCount = await this.organizeFilesByType(files);

      return {
        success: true,
        message: `Organization completed. Processed ${organizedCount} files.`,
        data: { organizedCount, totalFiles: files.length }
      };
    } catch (error) {
      return {
        success: false,
        message: `Organization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeAnalyze(command: FileCommand): Promise<CommandExecutionResult> {
    try {
      const files = await this.fileSystemAPI.readDirectory(this.currentPath);
      
      const analysis = {
        totalFiles: files.length,
        fileTypes: this.analyzeFileTypes(files),
        sizeDistribution: this.analyzeSizeDistribution(files),
        ageDistribution: this.analyzeAgeDistribution(files)
      };

      return {
        success: true,
        message: `Analysis complete. Found ${files.length} files with various types and sizes.`,
        data: analysis
      };
    } catch (error) {
      return {
        success: false,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private executeHelp(): CommandExecutionResult {
    const helpContent = `
🤖 **AI File Assistant Commands**

**Basic Operations:**
• "Show me all files" - List files in current directory
• "Find large files" - Search for files by size
• "Delete selected files" - Remove selected files
• "Move photos to Pictures" - Move files to specific folder
• "Copy documents to backup" - Duplicate files to another location
• "Rename file to new-name" - Change file name
• "Create folder Projects" - Make new folder
• "Open document.txt" - Launch file

**Smart Filters:**
• "Show images from last week" - Filter by type and date
• "Find small files under 1MB" - Filter by size
• "List PDF files" - Filter by extension

**Organization:**
• "Organize this folder" - Auto-sort by file type
• "Analyze folder contents" - Get detailed statistics

**Tips:**
• Use natural language - I understand context
• Select files first, then say "delete selected"
• I can work with file types like "images", "documents", etc.
• Voice input is available on supported browsers
`;

    return {
      success: true,
      message: helpContent.trim()
    };
  }

  private applyFilters(files: any[], filters: FileCommand['filters']): any[] {
    let filtered = files;

    if (filters?.type) {
      filtered = filtered.filter(file => {
        const extension = file.extension?.toLowerCase() || '';
        return filters.type!.some(type => extension === type.toLowerCase());
      });
    }

    if (filters?.size) {
      filtered = filtered.filter(file => {
        const size = file.size || 0;
        return (!filters.size!.min || size >= filters.size!.min) &&
               (!filters.size!.max || size <= filters.size!.max);
      });
    }

    if (filters?.date?.days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.date.days);
      
      filtered = filtered.filter(file => {
        const modDate = new Date(file.lastModified);
        return modDate >= cutoffDate;
      });
    }

    if (filters?.name) {
      const nameFilter = filters.name.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(nameFilter)
      );
    }

    return filtered;
  }

  private resolveDestinationPath(destination: string): string {
    const commonPaths: Record<string, string> = {
      'desktop': 'C:\\Users\\{user}\\Desktop',
      'documents': 'C:\\Users\\{user}\\Documents',
      'downloads': 'C:\\Users\\{user}\\Downloads',
      'pictures': 'C:\\Users\\{user}\\Pictures',
      'music': 'C:\\Users\\{user}\\Music',
      'videos': 'C:\\Users\\{user}\\Videos'
    };

    const normalizedDest = destination.toLowerCase();
    
    if (commonPaths[normalizedDest]) {
      const username = process.env.USERNAME || 'User';
      return commonPaths[normalizedDest].replace('{user}', username);
    }

    return destination;
  }

  private async organizeFilesByType(files: any[]): Promise<number> {
    const typeMap: Record<string, string[]> = {
      'Images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'],
      'Documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
      'Videos': ['.mp4', '.avi', '.mkv', '.mov', '.wmv'],
      'Music': ['.mp3', '.wav', '.flac', '.m4a'],
      'Archives': ['.zip', '.rar', '.7z', '.tar']
    };

    let organizedCount = 0;

    for (const [folderName, extensions] of Object.entries(typeMap)) {
      const matchingFiles = files.filter(file => {
        const ext = file.extension?.toLowerCase() || '';
        return extensions.includes(ext);
      });

      if (matchingFiles.length > 0) {
        try {
          const folderPath = `${this.currentPath}\\${folderName}`;
          await this.fileSystemAPI.createFolder(this.currentPath, folderName);
          
          const filePaths = matchingFiles.map(file => 
            file.fullPath || `${this.currentPath}\\${file.name}`
          );
          
          await this.fileSystemAPI.executeFileOperation('move', filePaths, folderPath);
          organizedCount += matchingFiles.length;
        } catch (error) {
          console.warn(`Failed to organize ${folderName} files:`, error);
        }
      }
    }

    return organizedCount;
  }

  private analyzeFileTypes(files: any[]): Record<string, number> {
    const typeCount: Record<string, number> = {};
    
    files.forEach(file => {
      const ext = file.extension?.toLowerCase() || 'no extension';
      typeCount[ext] = (typeCount[ext] || 0) + 1;
    });

    return typeCount;
  }

  private analyzeSizeDistribution(files: any[]): Record<string, number> {
    const sizeRanges = {
      'Under 1MB': 0,
      '1MB - 10MB': 0,
      '10MB - 100MB': 0,
      'Over 100MB': 0
    };

    files.forEach(file => {
      const size = file.size || 0;
      const sizeMB = size / (1024 * 1024);

      if (sizeMB < 1) sizeRanges['Under 1MB']++;
      else if (sizeMB < 10) sizeRanges['1MB - 10MB']++;
      else if (sizeMB < 100) sizeRanges['10MB - 100MB']++;
      else sizeRanges['Over 100MB']++;
    });

    return sizeRanges;
  }

  private analyzeAgeDistribution(files: any[]): Record<string, number> {
    const ageRanges = {
      'Today': 0,
      'This week': 0,
      'This month': 0,
      'Older': 0
    };

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const modTime = new Date(file.lastModified).getTime();
      const ageDays = (now - modTime) / dayMs;

      if (ageDays < 1) ageRanges['Today']++;
      else if (ageDays < 7) ageRanges['This week']++;
      else if (ageDays < 30) ageRanges['This month']++;
      else ageRanges['Older']++;
    });

    return ageRanges;
  }
}

export default ConversationalCommandExecutor;
