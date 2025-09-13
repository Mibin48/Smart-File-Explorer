export interface FileInfo {
  name: string;
  path: string;
  fullPath: string;
  size: number;
  isDirectory: boolean;
  extension?: string;
  lastModified: Date;
  lastAccessed?: Date;
  mimeType?: string;
  content?: string; // For text files
  metadata?: Record<string, any>;
}

export type FileActionType = 
  | 'rename' 
  | 'move' 
  | 'duplicate' 
  | 'archive' 
  | 'delete'
  | 'share' 
  | 'edit' 
  | 'convert'
  | 'organize'
  | 'tag'
  | 'summarize'
  | 'translate'
  | 'optimize'
  | 'backup'
  | 'merge'
  | 'split'
  | 'extract'
  | 'categorize'
  | 'compress'
  | 'workflow';

export interface FileAction {
  id: string;
  type: FileActionType;
  label: string;
  description: string;
  icon: string;
  confidence: number; // 0-1 scale
  priority: 'high' | 'medium' | 'low';
  category: 'organization' | 'productivity' | 'maintenance' | 'content' | 'sharing';
  estimatedTime?: string; // e.g., "2 minutes", "instant"
  parameters?: Record<string, any>;
  preconditions?: string[]; // What needs to be true for this action to work
  consequences?: string[]; // What will happen if this action is executed
}

export interface ContextualActions {
  fileInfo: FileInfo;
  suggestedActions: FileAction[];
  reasoning: string;
  analysisTimestamp: Date;
  contextFactors: string[]; // What influenced these suggestions
}

export interface ActionExecutionResult {
  success: boolean;
  actionId: string;
  message: string;
  newFileInfo?: FileInfo;
  undoable: boolean;
  undoData?: any;
}

export interface FileAnalysisContext {
  currentDirectory: string;
  recentFiles: FileInfo[];
  userPreferences?: Record<string, any>;
  projectContext?: {
    type: 'development' | 'design' | 'writing' | 'data' | 'media' | 'general';
    relatedFiles: FileInfo[];
  };
  usage?: {
    accessFrequency: 'never' | 'rarely' | 'sometimes' | 'often' | 'daily';
    lastAccessed: Date;
    totalAccesses: number;
  };
}

export interface AIAnalysisPrompt {
  fileInfo: FileInfo;
  context: FileAnalysisContext;
  availableActions: FileActionType[];
  userGoal?: string; // Optional user-specified intent
}

export interface ActionTemplate {
  type: FileActionType;
  label: string;
  description: string;
  icon: string;
  category: FileAction['category'];
  applicableFileTypes: string[]; // File extensions or types
  requiresContent: boolean; // Whether file content needs to be analyzed
  riskLevel: 'safe' | 'moderate' | 'high'; // Risk of data loss
}
