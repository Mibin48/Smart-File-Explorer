import { ActionExecutionResult, FileInfo } from '../types/ContextualActions';

export interface ActionHistoryEntry {
  id: string;
  timestamp: Date;
  actionType: string;
  actionLabel: string;
  fileInfo: FileInfo;
  result: ActionExecutionResult;
  undoData?: any;
}

export class ActionHistoryService {
  private history: ActionHistoryEntry[] = [];
  private maxHistorySize = 50;
  private storageKey = 'smart-file-explorer-action-history';

  constructor() {
    this.loadFromStorage();
  }

  addAction(
    actionType: string,
    actionLabel: string,
    fileInfo: FileInfo,
    result: ActionExecutionResult
  ): void {
    if (!result.success) return; // Only track successful actions

    const entry: ActionHistoryEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      actionType,
      actionLabel,
      fileInfo: { ...fileInfo },
      result: { ...result },
      undoData: result.undoData
    };

    this.history.unshift(entry);

    // Keep only the most recent actions
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.saveToStorage();
    console.log(`Action recorded: ${actionLabel} on ${fileInfo.name}`);
  }

  getHistory(): ActionHistoryEntry[] {
    return [...this.history];
  }

  getRecentActions(count: number = 10): ActionHistoryEntry[] {
    return this.history.slice(0, count);
  }

  canUndo(entryId: string): boolean {
    const entry = this.history.find(e => e.id === entryId);
    return entry?.result.undoable === true && entry.undoData !== undefined;
  }

  async undoAction(entryId: string): Promise<boolean> {
    const entry = this.history.find(e => e.id === entryId);
    
    if (!entry || !entry.result.undoable || !entry.undoData) {
      console.warn('Cannot undo action: not undoable or no undo data');
      return false;
    }

    try {
      // This is a simulation - in a real implementation, you'd call actual file system APIs
      console.log(`Undoing action: ${entry.actionLabel} on ${entry.fileInfo.name}`);
      
      switch (entry.actionType) {
        case 'rename':
          console.log(`Reverting filename from ${entry.result.newFileInfo?.name} back to ${entry.undoData.originalName}`);
          break;
        case 'move':
          console.log(`Moving file back from ${entry.result.newFileInfo?.path} to ${entry.undoData.originalPath}`);
          break;
        case 'compress':
          console.log(`Restoring original file size from ${entry.undoData.originalSize} bytes`);
          break;
        default:
          console.log('Undo operation completed');
      }

      // Mark as undone by removing from undoable history
      entry.result.undoable = false;
      entry.undoData = undefined;

      return true;
    } catch (error) {
      console.error('Failed to undo action:', error);
      return false;
    }
  }

  clearHistory(): void {
    this.history = [];
    this.saveToStorage();
    console.log('Action history cleared');
  }

  private saveToStorage(): void {
    try {
      const data = {
        history: this.history.map(entry => ({
          ...entry,
          timestamp: entry.timestamp.toISOString() // Convert Date to string for storage
        })),
        version: '1.0'
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save action history to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.history && Array.isArray(data.history)) {
          this.history = data.history.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp) // Convert string back to Date
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load action history from storage:', error);
      this.history = [];
    }
  }

  getStatistics() {
    const actionTypes = this.history.reduce((acc, entry) => {
      acc[entry.actionType] = (acc[entry.actionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const undoableActions = this.history.filter(e => e.result.undoable).length;

    return {
      totalActions: this.history.length,
      undoableActions,
      actionTypes,
      oldestAction: this.history[this.history.length - 1]?.timestamp,
      newestAction: this.history[0]?.timestamp
    };
  }
}

// Singleton instance
let actionHistoryService: ActionHistoryService | null = null;

export function getActionHistoryService(): ActionHistoryService {
  if (!actionHistoryService) {
    actionHistoryService = new ActionHistoryService();
  }
  return actionHistoryService;
}
