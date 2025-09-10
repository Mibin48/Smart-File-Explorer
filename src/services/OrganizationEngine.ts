import { OrganizationSuggestion, OrganizationSession } from './SmartOrganizer';

export interface OrganizationResult {
  success: boolean;
  error?: string;
  filesProcessed: number;
  foldersCreated: number;
  operationDetails: {
    createdFolders: string[];
    movedFiles: string[];
    renamedFiles: { from: string; to: string }[];
  };
}

export interface OrganizationOperation {
  id: string;
  type: 'create_folder' | 'move_files' | 'rename_files' | 'group_similar';
  timestamp: Date;
  suggestion: OrganizationSuggestion;
  result: OrganizationResult;
  undoable: boolean;
}

export class OrganizationEngine {
  private operationHistory: OrganizationOperation[] = [];
  private electronAPI: any;

  constructor() {
    this.electronAPI = (window as any).electronAPI;
    if (!this.electronAPI) {
      console.warn('ElectronAPI not available - file operations will fail');
    }
  }

  /**
   * Execute an organization suggestion
   */
  async executeSuggestion(
    suggestion: OrganizationSuggestion,
    session: OrganizationSession
  ): Promise<OrganizationResult> {
    console.log(`Executing organization suggestion: ${suggestion.title}`);

    const operation: OrganizationOperation = {
      id: this.generateOperationId(),
      type: suggestion.type,
      timestamp: new Date(),
      suggestion,
      result: {
        success: false,
        filesProcessed: 0,
        foldersCreated: 0,
        operationDetails: {
          createdFolders: [],
          movedFiles: [],
          renamedFiles: []
        }
      },
      undoable: false
    };

    try {
      let result: OrganizationResult;

      switch (suggestion.type) {
        case 'create_folder':
          result = await this.executeCreateFolderOperation(suggestion, session);
          break;
        case 'move_files':
          result = await this.executeMoveFilesOperation(suggestion, session);
          break;
        case 'rename_files':
          result = await this.executeRenameFilesOperation(suggestion, session);
          break;
        case 'group_similar':
          result = await this.executeGroupSimilarOperation(suggestion, session);
          break;
        default:
          throw new Error(`Unknown suggestion type: ${suggestion.type}`);
      }

      operation.result = result;
      operation.undoable = result.success && this.isOperationUndoable(suggestion.type);
      
      this.operationHistory.push(operation);
      
      console.log(`Organization operation completed:`, result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Organization operation failed:`, errorMessage);

      operation.result = {
        success: false,
        error: errorMessage,
        filesProcessed: 0,
        foldersCreated: 0,
        operationDetails: {
          createdFolders: [],
          movedFiles: [],
          renamedFiles: []
        }
      };

      this.operationHistory.push(operation);
      return operation.result;
    }
  }

  /**
   * Execute create folder operation
   */
  private async executeCreateFolderOperation(
    suggestion: OrganizationSuggestion,
    session: OrganizationSession
  ): Promise<OrganizationResult> {
    const result: OrganizationResult = {
      success: false,
      filesProcessed: 0,
      foldersCreated: 0,
      operationDetails: {
        createdFolders: [],
        movedFiles: [],
        renamedFiles: []
      }
    };

    if (!suggestion.folderName || !suggestion.targetPath) {
      throw new Error('Missing folder name or target path for create folder operation');
    }

    try {
      // Step 1: Create the folder
      const createResult = await this.electronAPI.createFolder(suggestion.targetPath);
      if (createResult.error) {
        throw new Error(`Failed to create folder: ${createResult.error}`);
      }

      result.operationDetails.createdFolders.push(suggestion.targetPath);
      result.foldersCreated = 1;

      // Step 2: Move files to the new folder
      const filesToMove = suggestion.files.map(filename => {
        // Find full path from session directory
        return `${session.directoryPath}\\${filename}`;
      });

      for (const filePath of filesToMove) {
        try {
          const filename = filePath.split('\\').pop() || '';
          const destinationPath = `${suggestion.targetPath}\\${filename}`;
          
          const moveResult = await this.electronAPI.moveFile(filePath, destinationPath);
          if (moveResult.error) {
            console.warn(`Failed to move file ${filename}: ${moveResult.error}`);
          } else {
            result.operationDetails.movedFiles.push(`${filePath} → ${destinationPath}`);
            result.filesProcessed++;
          }
        } catch (fileError) {
          console.warn(`Error moving file ${filePath}:`, fileError);
        }
      }

      result.success = result.filesProcessed > 0 || result.foldersCreated > 0;
      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute move files operation
   */
  private async executeMoveFilesOperation(
    suggestion: OrganizationSuggestion,
    session: OrganizationSession
  ): Promise<OrganizationResult> {
    const result: OrganizationResult = {
      success: false,
      filesProcessed: 0,
      foldersCreated: 0,
      operationDetails: {
        createdFolders: [],
        movedFiles: [],
        renamedFiles: []
      }
    };

    if (!suggestion.targetPath) {
      throw new Error('Missing target path for move files operation');
    }

    try {
      // Ensure target directory exists
      const dirCheck = await this.electronAPI.checkDirectory(suggestion.targetPath);
      if (dirCheck.error) {
        // Try to create the directory
        const createResult = await this.electronAPI.createFolder(suggestion.targetPath);
        if (createResult.error) {
          throw new Error(`Failed to create target directory: ${createResult.error}`);
        }
        result.operationDetails.createdFolders.push(suggestion.targetPath);
        result.foldersCreated = 1;
      }

      // Move files
      const filesToMove = suggestion.files.map(filename => `${session.directoryPath}\\${filename}`);

      for (const filePath of filesToMove) {
        try {
          const filename = filePath.split('\\').pop() || '';
          const destinationPath = `${suggestion.targetPath}\\${filename}`;
          
          const moveResult = await this.electronAPI.moveFile(filePath, destinationPath);
          if (moveResult.error) {
            console.warn(`Failed to move file ${filename}: ${moveResult.error}`);
          } else {
            result.operationDetails.movedFiles.push(`${filePath} → ${destinationPath}`);
            result.filesProcessed++;
          }
        } catch (fileError) {
          console.warn(`Error moving file ${filePath}:`, fileError);
        }
      }

      result.success = result.filesProcessed > 0;
      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute rename files operation
   */
  private async executeRenameFilesOperation(
    suggestion: OrganizationSuggestion,
    session: OrganizationSession
  ): Promise<OrganizationResult> {
    const result: OrganizationResult = {
      success: false,
      filesProcessed: 0,
      foldersCreated: 0,
      operationDetails: {
        createdFolders: [],
        movedFiles: [],
        renamedFiles: []
      }
    };

    try {
      // For rename operations, we need to generate new names
      // This would typically involve AI-generated suggestions
      for (const filename of suggestion.files) {
        try {
          const filePath = `${session.directoryPath}\\${filename}`;
          const newName = await this.generateBetterFileName(filename, suggestion.reasoning);
          const newPath = `${session.directoryPath}\\${newName}`;
          
          const renameResult = await this.electronAPI.renameFile(filePath, newPath);
          if (renameResult.error) {
            console.warn(`Failed to rename file ${filename}: ${renameResult.error}`);
          } else {
            result.operationDetails.renamedFiles.push({ from: filePath, to: newPath });
            result.filesProcessed++;
          }
        } catch (fileError) {
          console.warn(`Error renaming file ${filename}:`, fileError);
        }
      }

      result.success = result.filesProcessed > 0;
      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute group similar operation
   */
  private async executeGroupSimilarOperation(
    suggestion: OrganizationSuggestion,
    session: OrganizationSession
  ): Promise<OrganizationResult> {
    const result: OrganizationResult = {
      success: false,
      filesProcessed: 0,
      foldersCreated: 0,
      operationDetails: {
        createdFolders: [],
        movedFiles: [],
        renamedFiles: []
      }
    };

    try {
      // Create a folder for similar files
      const groupFolderName = `Similar Files - ${new Date().toISOString().split('T')[0]}`;
      const groupFolderPath = `${session.directoryPath}\\${groupFolderName}`;
      
      const createResult = await this.electronAPI.createFolder(groupFolderPath);
      if (createResult.error) {
        throw new Error(`Failed to create group folder: ${createResult.error}`);
      }

      result.operationDetails.createdFolders.push(groupFolderPath);
      result.foldersCreated = 1;

      // Move similar files to the group folder
      for (const filename of suggestion.files) {
        try {
          const filePath = `${session.directoryPath}\\${filename}`;
          const destinationPath = `${groupFolderPath}\\${filename}`;
          
          const moveResult = await this.electronAPI.moveFile(filePath, destinationPath);
          if (moveResult.error) {
            console.warn(`Failed to move similar file ${filename}: ${moveResult.error}`);
          } else {
            result.operationDetails.movedFiles.push(`${filePath} → ${destinationPath}`);
            result.filesProcessed++;
          }
        } catch (fileError) {
          console.warn(`Error moving similar file ${filename}:`, fileError);
        }
      }

      result.success = result.filesProcessed > 0;
      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Undo the last organization operation
   */
  async undoLastOperation(): Promise<OrganizationResult> {
    const lastOperation = this.operationHistory
      .reverse()
      .find(op => op.undoable && op.result.success);

    if (!lastOperation) {
      throw new Error('No undoable operations found');
    }

    console.log(`Undoing operation: ${lastOperation.suggestion.title}`);

    try {
      const undoResult: OrganizationResult = {
        success: false,
        filesProcessed: 0,
        foldersCreated: 0,
        operationDetails: {
          createdFolders: [],
          movedFiles: [],
          renamedFiles: []
        }
      };

      // Reverse file moves
      for (const moveRecord of lastOperation.result.operationDetails.movedFiles) {
        const [from, to] = moveRecord.split(' → ');
        try {
          const moveBackResult = await this.electronAPI.moveFile(to, from);
          if (!moveBackResult.error) {
            undoResult.operationDetails.movedFiles.push(`${to} → ${from}`);
            undoResult.filesProcessed++;
          }
        } catch (error) {
          console.warn(`Failed to undo file move: ${moveRecord}`, error);
        }
      }

      // Reverse file renames
      for (const renameRecord of lastOperation.result.operationDetails.renamedFiles) {
        try {
          const renameBackResult = await this.electronAPI.renameFile(renameRecord.to, renameRecord.from);
          if (!renameBackResult.error) {
            undoResult.operationDetails.renamedFiles.push({ from: renameRecord.to, to: renameRecord.from });
            undoResult.filesProcessed++;
          }
        } catch (error) {
          console.warn(`Failed to undo file rename:`, renameRecord, error);
        }
      }

      // Remove created folders (only if empty)
      for (const folderPath of lastOperation.result.operationDetails.createdFolders) {
        try {
          const removeResult = await this.electronAPI.removeFolder(folderPath);
          if (!removeResult.error) {
            undoResult.foldersCreated++; // Actually folders removed
          }
        } catch (error) {
          console.warn(`Failed to remove folder: ${folderPath}`, error);
        }
      }

      undoResult.success = undoResult.filesProcessed > 0 || undoResult.foldersCreated > 0;

      // Mark the operation as undone
      lastOperation.undoable = false;

      return undoResult;

    } catch (error) {
      throw new Error(`Failed to undo operation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get operation history
   */
  getOperationHistory(): OrganizationOperation[] {
    return [...this.operationHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Check if operation type is undoable
   */
  private isOperationUndoable(operationType: string): boolean {
    // All operations are potentially undoable
    return ['create_folder', 'move_files', 'rename_files', 'group_similar'].includes(operationType);
  }

  /**
   * Generate a better filename (simplified version)
   */
  private async generateBetterFileName(originalName: string, reasoning: string): Promise<string> {
    // For now, just add a prefix based on reasoning
    // In a full implementation, this would use AI
    const extension = originalName.split('.').pop();
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
    
    let prefix = 'organized';
    if (reasoning.toLowerCase().includes('document')) prefix = 'doc';
    if (reasoning.toLowerCase().includes('image')) prefix = 'img';
    if (reasoning.toLowerCase().includes('video')) prefix = 'vid';
    if (reasoning.toLowerCase().includes('audio')) prefix = 'audio';

    return `${prefix}_${nameWithoutExtension}.${extension}`;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate file paths and permissions
   */
  private async validateOperation(suggestion: OrganizationSuggestion, session: OrganizationSession): Promise<boolean> {
    try {
      // Check if source directory is accessible
      const dirCheck = await this.electronAPI.checkDirectory(session.directoryPath);
      if (dirCheck.error) {
        console.warn(`Source directory not accessible: ${dirCheck.error}`);
        return false;
      }

      // Check if files exist
      for (const filename of suggestion.files) {
        const filePath = `${session.directoryPath}\\${filename}`;
        const fileCheck = await this.electronAPI.checkFile(filePath);
        if (fileCheck.error) {
          console.warn(`File not accessible: ${filePath}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn('Validation failed:', error);
      return false;
    }
  }
}
