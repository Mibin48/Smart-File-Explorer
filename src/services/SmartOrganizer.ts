import { AdvancedAIService, FileAnalysis } from './AdvancedAIService';

export interface OrganizationRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    fileTypes?: string[];
    contentKeywords?: string[];
    sizeRange?: { min?: number; max?: number };
    dateRange?: { days?: number; months?: number };
    namePatterns?: string[];
  };
  action: {
    type: 'move' | 'copy' | 'categorize';
    targetFolder: string;
    createFolder?: boolean;
  };
  confidence: number;
}

export interface OrganizationSuggestion {
  id: string;
  type: 'create_folder' | 'move_files' | 'rename_files' | 'group_similar';
  title: string;
  description: string;
  files: string[];
  targetPath?: string;
  folderName?: string;
  confidence: number;
  reasoning: string;
  impact: {
    filesAffected: number;
    foldersToCreate: number;
    estimatedTime: number;
  };
}

export interface OrganizationSession {
  id: string;
  timestamp: Date;
  directoryPath: string;
  totalFiles: number;
  suggestions: OrganizationSuggestion[];
  appliedSuggestions: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export class SmartOrganizer {
  private aiService: AdvancedAIService;
  private sessions: Map<string, OrganizationSession> = new Map();

  constructor(aiService: AdvancedAIService) {
    this.aiService = aiService;
  }

  /**
   * Analyze directory and generate comprehensive organization suggestions
   */
  async generateOrganizationPlan(
    directoryPath: string,
    files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>
  ): Promise<OrganizationSession> {
    const sessionId = this.generateSessionId();
    const timestamp = new Date();

    console.log(`Starting organization analysis for ${files.length} files in ${directoryPath}`);

    try {
      // Step 1: Analyze file content using existing AI service
      const fileAnalyses = await this.analyzeFilesContent(files);
      
      // Step 2: Generate AI-powered organization suggestions
      const suggestions = await this.generateAISuggestions(files, fileAnalyses, directoryPath);
      
      // Step 3: Add rule-based suggestions
      const ruleSuggestions = await this.generateRuleBasedSuggestions(files, directoryPath);
      
      // Step 4: Combine and prioritize suggestions
      const allSuggestions = [...suggestions, ...ruleSuggestions];
      const prioritizedSuggestions = this.prioritizeSuggestions(allSuggestions);

      const session: OrganizationSession = {
        id: sessionId,
        timestamp,
        directoryPath,
        totalFiles: files.length,
        suggestions: prioritizedSuggestions,
        appliedSuggestions: [],
        status: 'pending'
      };

      this.sessions.set(sessionId, session);
      return session;

    } catch (error) {
      console.error('Failed to generate organization plan:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered organization suggestions using GPT-4
   */
  private async generateAISuggestions(
    files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>,
    analyses: FileAnalysis[],
    directoryPath: string
  ): Promise<OrganizationSuggestion[]> {
    const prompt = `
    You are an expert file organization assistant. Analyze these files and provide intelligent organization suggestions.
    
    Directory: ${directoryPath}
    Files (${files.length}):
    ${files.map((f, i) => `${i + 1}. ${f.name} (${f.type}, ${f.size} bytes, ${f.modified.toLocaleDateString()})`).join('\n')}
    
    AI Analysis Results:
    ${analyses.map((a, i) => `${i + 1}. ${a.filename}: ${a.summary} [${a.category}] Tags: ${a.tags.join(', ')}`).join('\n')}
    
    Please suggest 3-5 specific organization actions that would improve this directory structure:
    
    For each suggestion, provide:
    1. Type (create_folder, move_files, rename_files, or group_similar)
    2. Clear title and description
    3. Specific files to affect
    4. Target folder name (if creating/moving)
    5. Detailed reasoning
    6. Confidence level (0-1)
    
    Focus on:
    - Grouping related content
    - Reducing clutter
    - Creating logical folder structures
    - Improving findability
    
    Format your response as JSON with this structure:
    {
      "suggestions": [
        {
          "type": "create_folder",
          "title": "Create Documents Folder",
          "description": "Group all document files together",
          "files": ["file1.pdf", "file2.docx"],
          "folderName": "Documents",
          "reasoning": "These files are all documents and would benefit from being grouped together",
          "confidence": 0.9
        }
      ]
    }
    `;

    try {
      const response = await this.aiService['openai'].chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      const parsed = JSON.parse(content);
      const suggestions: OrganizationSuggestion[] = [];

      for (const suggestion of parsed.suggestions || []) {
        const organizationSuggestion: OrganizationSuggestion = {
          id: this.generateSuggestionId(),
          type: suggestion.type,
          title: suggestion.title,
          description: suggestion.description,
          files: suggestion.files || [],
          targetPath: suggestion.folderName ? `${directoryPath}\\${suggestion.folderName}` : undefined,
          folderName: suggestion.folderName,
          confidence: suggestion.confidence || 0.5,
          reasoning: suggestion.reasoning || '',
          impact: {
            filesAffected: (suggestion.files || []).length,
            foldersToCreate: suggestion.type === 'create_folder' ? 1 : 0,
            estimatedTime: this.estimateOperationTime(suggestion.type, (suggestion.files || []).length)
          }
        };
        suggestions.push(organizationSuggestion);
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      return [];
    }
  }

  /**
   * Generate rule-based organization suggestions
   */
  private async generateRuleBasedSuggestions(
    files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>,
    directoryPath: string
  ): Promise<OrganizationSuggestion[]> {
    const suggestions: OrganizationSuggestion[] = [];

    // Rule 1: Group by file type
    const fileTypeGroups = this.groupFilesByType(files);
    for (const [type, groupFiles] of fileTypeGroups.entries()) {
      if (groupFiles.length >= 3) { // Only suggest if there are multiple files
        const folderName = this.getFolderNameForType(type);
        suggestions.push({
          id: this.generateSuggestionId(),
          type: 'create_folder',
          title: `Create ${folderName} Folder`,
          description: `Group ${groupFiles.length} ${type} files together`,
          files: groupFiles.map(f => f.name),
          targetPath: `${directoryPath}\\${folderName}`,
          folderName,
          confidence: 0.8,
          reasoning: `Found ${groupFiles.length} ${type} files that would benefit from being organized together`,
          impact: {
            filesAffected: groupFiles.length,
            foldersToCreate: 1,
            estimatedTime: this.estimateOperationTime('create_folder', groupFiles.length)
          }
        });
      }
    }

    // Rule 2: Group large files
    const largeFiles = files.filter(f => f.size > 50 * 1024 * 1024); // >50MB
    if (largeFiles.length >= 2) {
      suggestions.push({
        id: this.generateSuggestionId(),
        type: 'create_folder',
        title: 'Create Large Files Folder',
        description: `Group ${largeFiles.length} large files (>50MB) together`,
        files: largeFiles.map(f => f.name),
        targetPath: `${directoryPath}\\Large Files`,
        folderName: 'Large Files',
        confidence: 0.7,
        reasoning: 'Large files can clutter directories and benefit from separate organization',
        impact: {
          filesAffected: largeFiles.length,
          foldersToCreate: 1,
          estimatedTime: this.estimateOperationTime('create_folder', largeFiles.length)
        }
      });
    }

    // Rule 3: Group old files
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const oldFiles = files.filter(f => f.modified < sixMonthsAgo);
    
    if (oldFiles.length >= 5) {
      suggestions.push({
        id: this.generateSuggestionId(),
        type: 'create_folder',
        title: 'Create Archive Folder',
        description: `Archive ${oldFiles.length} files older than 6 months`,
        files: oldFiles.map(f => f.name),
        targetPath: `${directoryPath}\\Archive`,
        folderName: 'Archive',
        confidence: 0.6,
        reasoning: 'Old files can be archived to reduce clutter while keeping them accessible',
        impact: {
          filesAffected: oldFiles.length,
          foldersToCreate: 1,
          estimatedTime: this.estimateOperationTime('create_folder', oldFiles.length)
        }
      });
    }

    // Rule 4: Identify potential duplicates by name similarity
    const duplicateGroups = this.findPotentialDuplicates(files);
    for (const group of duplicateGroups) {
      if (group.length > 1) {
        suggestions.push({
          id: this.generateSuggestionId(),
          type: 'group_similar',
          title: `Review Potential Duplicates`,
          description: `Found ${group.length} files with similar names`,
          files: group.map(f => f.name),
          confidence: 0.5,
          reasoning: 'These files have similar names and might be duplicates or related versions',
          impact: {
            filesAffected: group.length,
            foldersToCreate: 0,
            estimatedTime: this.estimateOperationTime('group_similar', group.length)
          }
        });
      }
    }

    return suggestions;
  }

  /**
   * Get organization session
   */
  getSession(sessionId: string): OrganizationSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Helper methods and other utility functions...
  private groupFilesByType(files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>): Map<string, typeof files> {
    const groups = new Map<string, typeof files>();
    
    for (const file of files) {
      const type = this.getFileCategory(file.type);
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(file);
    }
    
    return groups;
  }

  private getFileCategory(extension: string): string {
    const ext = extension.toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'].includes(ext)) {
      return 'images';
    }
    if (['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'].includes(ext)) {
      return 'videos';
    }
    if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'].includes(ext)) {
      return 'audio';
    }
    if (['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'].includes(ext)) {
      return 'documents';
    }
    if (['.xls', '.xlsx', '.csv', '.ods'].includes(ext)) {
      return 'spreadsheets';
    }
    if (['.ppt', '.pptx', '.odp'].includes(ext)) {
      return 'presentations';
    }
    if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(ext)) {
      return 'archives';
    }
    if (['.js', '.ts', '.html', '.css', '.py', '.java', '.cpp', '.c', '.php'].includes(ext)) {
      return 'code';
    }
    
    return 'other';
  }

  private getFolderNameForType(type: string): string {
    const folderNames: { [key: string]: string } = {
      'images': 'Images',
      'videos': 'Videos', 
      'audio': 'Audio',
      'documents': 'Documents',
      'spreadsheets': 'Spreadsheets',
      'presentations': 'Presentations',
      'archives': 'Archives',
      'code': 'Code',
      'other': 'Other Files'
    };
    
    return folderNames[type] || 'Other Files';
  }

  private findPotentialDuplicates(files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>): Array<typeof files> {
    const groups: Array<typeof files> = [];
    const processed = new Set<string>();
    
    for (const file of files) {
      if (processed.has(file.name)) continue;
      
      const similar = files.filter(f => 
        f !== file && 
        !processed.has(f.name) && 
        this.areFilesSimilar(file.name, f.name)
      );
      
      if (similar.length > 0) {
        const group = [file, ...similar];
        groups.push(group);
        group.forEach(f => processed.add(f.name));
      }
    }
    
    return groups;
  }

  private areFilesSimilar(name1: string, name2: string): boolean {
    const normalize = (name: string) => name.toLowerCase().replace(/[_\-\s\(\)]/g, '');
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    const versionPattern = /(.+?)(?:_v\d+|_\d+|\(\d+\))/;
    const match1 = n1.match(versionPattern);
    const match2 = n2.match(versionPattern);
    
    if (match1 && match2 && match1[1] === match2[1]) return true;
    
    return false;
  }

  private async analyzeFilesContent(files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>): Promise<FileAnalysis[]> {
    const analyses: FileAnalysis[] = [];
    const sampleFiles = files.slice(0, 10); // Limit to avoid API overuse
    
    for (const file of sampleFiles) {
      try {
        const analysis = await this.aiService.analyzeFileContent(file.path);
        analyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze ${file.name}:`, error);
      }
    }
    
    return analyses;
  }

  private prioritizeSuggestions(suggestions: OrganizationSuggestion[]): OrganizationSuggestion[] {
    return suggestions.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) {
        return confidenceDiff;
      }
      return b.impact.filesAffected - a.impact.filesAffected;
    });
  }

  private estimateOperationTime(operationType: string, fileCount: number): number {
    const baseTime: { [key: string]: number } = {
      'create_folder': 2,
      'move_files': 1,
      'rename_files': 0.5,
      'group_similar': 0.2
    };
    
    return (baseTime[operationType] || 1) * fileCount + 2;
  }

  private generateSessionId(): string {
    return `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSuggestionId(): string {
    return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
