import OpenAI from 'openai';
import {
  FileInfo,
  FileAction,
  FileActionType,
  ContextualActions,
  FileAnalysisContext,
  ActionTemplate,
  ActionExecutionResult,
  AIAnalysisPrompt
} from '../types/ContextualActions';

export class ContextualActionsService {
  private openai: OpenAI | null = null;
  private actionTemplates: ActionTemplate[];

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    }
    this.actionTemplates = this.initializeActionTemplates();
  }

  private initializeActionTemplates(): ActionTemplate[] {
    return [
      {
        type: 'rename',
        label: 'Smart Rename',
        description: 'AI-powered filename suggestion based on content analysis',
        icon: '✏️',
        category: 'organization',
        applicableFileTypes: ['*'],
        requiresContent: true,
        riskLevel: 'safe'
      },
      {
        type: 'extract',
        label: 'Extract Information',
        description: 'Extract key information like dates, names, or data from file',
        icon: '🔍',
        category: 'content',
        applicableFileTypes: ['.txt', '.md', '.doc', '.docx', '.pdf', '.csv'],
        requiresContent: true,
        riskLevel: 'safe'
      },
      {
        type: 'categorize',
        label: 'Smart Categorize',
        description: 'Automatically categorize file based on content and context',
        icon: '📂',
        category: 'organization',
        applicableFileTypes: ['*'],
        requiresContent: true,
        riskLevel: 'safe'
      },
      {
        type: 'compress',
        label: 'Intelligent Compression',
        description: 'Optimize file size while maintaining quality',
        icon: '📦',
        category: 'maintenance',
        applicableFileTypes: ['.jpg', '.png', '.pdf', '.mp4', '.mp3', '.zip'],
        requiresContent: false,
        riskLevel: 'moderate'
      },
      {
        type: 'workflow',
        label: 'Suggest Workflow',
        description: 'Recommend next steps or actions based on file type and content',
        icon: '⚡',
        category: 'productivity',
        applicableFileTypes: ['*'],
        requiresContent: true,
        riskLevel: 'safe'
      },
      {
        type: 'move',
        label: 'Organize',
        description: 'Move to a more appropriate folder',
        icon: '📁',
        category: 'organization',
        applicableFileTypes: ['*'],
        requiresContent: false,
        riskLevel: 'safe'
      },
      {
        type: 'tag',
        label: 'Auto-Tag',
        description: 'Generate relevant tags for easy finding',
        icon: '🏷️',
        category: 'organization',
        applicableFileTypes: ['*'],
        requiresContent: true,
        riskLevel: 'safe'
      },
      {
        type: 'summarize',
        label: 'Summarize',
        description: 'Create a quick summary of the content',
        icon: '📄',
        category: 'content',
        applicableFileTypes: ['.txt', '.md', '.doc', '.docx', '.pdf'],
        requiresContent: true,
        riskLevel: 'safe'
      },
      {
        type: 'archive',
        label: 'Archive',
        description: 'Move old or unused files to archive',
        icon: '📦',
        category: 'maintenance',
        applicableFileTypes: ['*'],
        requiresContent: false,
        riskLevel: 'moderate'
      },
      {
        type: 'duplicate',
        label: 'Create Copy',
        description: 'Create a backup copy with versioning',
        icon: '📋',
        category: 'maintenance',
        applicableFileTypes: ['*'],
        requiresContent: false,
        riskLevel: 'safe'
      },
      {
        type: 'convert',
        label: 'Format Convert',
        description: 'Convert to a different file format',
        icon: '🔄',
        category: 'productivity',
        applicableFileTypes: ['.txt', '.md', '.doc', '.pdf', '.jpg', '.png'],
        requiresContent: false,
        riskLevel: 'moderate'
      },
      {
        type: 'optimize',
        label: 'Optimize',
        description: 'Reduce file size or improve format',
        icon: '⚡',
        category: 'maintenance',
        applicableFileTypes: ['.jpg', '.png', '.pdf', '.mp4', '.mp3'],
        requiresContent: false,
        riskLevel: 'moderate'
      },
      {
        type: 'translate',
        label: 'Translate',
        description: 'Translate content to another language',
        icon: '🌐',
        category: 'content',
        applicableFileTypes: ['.txt', '.md', '.doc', '.docx'],
        requiresContent: true,
        riskLevel: 'safe'
      }
    ];
  }

  setApiKey(apiKey: string): void {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  async analyzeFile(fileInfo: FileInfo, context: FileAnalysisContext, retryCount: number = 0): Promise<ContextualActions> {
    if (!this.openai) {
      return this.getFallbackActions(fileInfo, context);
    }

    const maxRetries = 3;
    const applicableTemplates = this.getApplicableTemplates(fileInfo);
    
    try {
      const prompt = this.buildAnalysisPrompt(fileInfo, context, applicableTemplates);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert file management AI assistant with deep understanding of file systems, user workflows, and productivity optimization. Your goal is to suggest intelligent, contextual actions that genuinely improve the user's file management experience.
            
            Key principles:
            - Prioritize user safety and data integrity
            - Suggest actions based on actual content analysis, not just file names
            - Consider workflow efficiency and organization best practices
            - Provide clear, actionable recommendations with confidence levels
            - Always explain your reasoning
            
            Respond ONLY with valid JSON in the exact format specified.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from the response if it's wrapped in other text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON response from AI');
        }
      }

      // Validate the response structure
      if (!result.reasoning || !Array.isArray(result.actions)) {
        throw new Error('Invalid response structure from AI');
      }

      return this.parseAIResponse(result, fileInfo, applicableTemplates);

    } catch (error) {
      console.warn(`AI analysis attempt ${retryCount + 1} failed:`, error);
      
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.analyzeFile(fileInfo, context, retryCount + 1);
      }
      
      // All retries failed, use fallback
      console.error('All AI analysis attempts failed, using fallback:', error);
      return this.getEnhancedFallbackActions(fileInfo, context, error as Error);
    }
  }

  private buildAnalysisPrompt(fileInfo: FileInfo, context: FileAnalysisContext, templates: ActionTemplate[]): string {
    const fileAge = Math.floor((Date.now() - fileInfo.lastModified.getTime()) / (1000 * 60 * 60 * 24));
    const isOldFile = fileAge > 30;
    const isRecentFile = fileAge < 7;
    
    return `
You are an intelligent file management assistant. Analyze this file and suggest 3-5 practical, contextual actions that would genuinely help the user.

=== FILE ANALYSIS ===
File: ${fileInfo.name}
Extension: ${fileInfo.extension || 'none'}
Size: ${this.formatFileSize(fileInfo.size)}
Location: ${fileInfo.path}
Age: ${fileAge} days (${isOldFile ? 'old' : isRecentFile ? 'recent' : 'moderate age'})
Last Modified: ${fileInfo.lastModified.toLocaleString()}

=== CONTENT ANALYSIS ===
${fileInfo.content ? `Content Preview (${fileInfo.content.length} chars):
"${fileInfo.content.substring(0, 300)}..."` : 'No content available for analysis'}

=== CONTEXT ANALYSIS ===
Directory: ${context.currentDirectory}
Project Type: ${context.projectContext?.type || 'general'}
Usage Pattern: ${context.usage?.accessFrequency || 'unknown'} (${context.usage?.totalAccesses || 0} total accesses)
Directory Contents: ${context.recentFiles.length} other files
Related Files: ${context.recentFiles.slice(0, 3).map(f => f.name).join(', ') || 'none visible'}

=== INTELLIGENT ANALYSIS FACTORS ===
1. **Content Relevance**: What does the file content suggest about its purpose?
2. **Organization Opportunity**: Is the file in the most logical location?
3. **Maintenance Needs**: Does the file need cleanup, optimization, or archiving?
4. **Workflow Enhancement**: What actions would improve the user's workflow?
5. **Risk Assessment**: What are the safest vs most impactful actions?
6. **User Intent**: Based on file type and content, what might the user want to do next?

=== AVAILABLE ACTIONS ===
${templates.map(t => `${t.type}: ${t.description} [${t.category}, ${t.riskLevel} risk]`).join('\n')}

=== RESPONSE FORMAT ===
Respond with a JSON object:
{
  "reasoning": "Brief explanation of your analysis and why these actions are suggested",
  "actions": [
    {
      "type": "action_type",
      "label": "Custom action label",
      "description": "Specific description for this file",
      "confidence": 0.85,
      "priority": "high|medium|low",
      "estimatedTime": "30 seconds",
      "parameters": {"key": "value"},
      "preconditions": ["requirement1", "requirement2"],
      "consequences": ["effect1", "effect2"]
    }
  ],
  "contextFactors": ["factor1", "factor2", "factor3"]
}

**Important**: Only suggest actions that are truly relevant and helpful. Focus on quality over quantity.
`;
  }

  private parseAIResponse(aiResponse: any, fileInfo: FileInfo, templates: ActionTemplate[]): ContextualActions {
    const actions: FileAction[] = (aiResponse.actions || []).map((action: any, index: number) => {
      const template = templates.find(t => t.type === action.type);
      if (!template) return null;

      return {
        id: `action_${Date.now()}_${index}`,
        type: action.type,
        label: action.label || template.label,
        description: action.description || template.description,
        icon: template.icon,
        confidence: Math.max(0, Math.min(1, action.confidence || 0.5)),
        priority: action.priority || 'medium',
        category: template.category,
        estimatedTime: action.estimatedTime || 'Less than 1 minute',
        parameters: action.parameters || {},
        preconditions: action.preconditions || [],
        consequences: action.consequences || []
      };
    }).filter(Boolean);

    return {
      fileInfo,
      suggestedActions: actions,
      reasoning: aiResponse.reasoning || 'Analysis completed',
      analysisTimestamp: new Date(),
      contextFactors: aiResponse.contextFactors || ['AI analysis']
    };
  }

  private getApplicableTemplates(fileInfo: FileInfo): ActionTemplate[] {
    return this.actionTemplates.filter(template => {
      if (template.applicableFileTypes.includes('*')) return true;
      if (!fileInfo.extension) return false;
      return template.applicableFileTypes.includes(fileInfo.extension.toLowerCase());
    });
  }

  private getEnhancedFallbackActions(fileInfo: FileInfo, context: FileAnalysisContext, error?: Error): ContextualActions {
    const fallbackActions: FileAction[] = [];
    const contextFactors: string[] = ['Fallback analysis', 'No AI analysis available'];
    
    if (error) {
      contextFactors.push(`AI Error: ${error.message}`);
    }

    // Intelligent file analysis based on patterns
    const fileName = fileInfo.name.toLowerCase();
    const ext = fileInfo.extension?.toLowerCase();
    const fileAge = Math.floor((Date.now() - fileInfo.lastModified.getTime()) / (1000 * 60 * 60 * 24));
    const isLargeFile = fileInfo.size > 100 * 1024 * 1024; // 100MB
    
    // Smart rename suggestions based on patterns
    if (fileName.includes('untitled') || fileName.includes('new ') || fileName.includes('copy') || fileName.match(/\d{8,}/)) {
      fallbackActions.push({
        id: `rename_${Date.now()}`,
        type: 'rename',
        label: 'Smart Rename Suggestion',
        description: 'File appears to have a generic or temporary name',
        icon: '✏️',
        confidence: 0.8,
        priority: 'high',
        category: 'organization',
        estimatedTime: '30 seconds'
      });
    }

    // Organization suggestions based on location
    if (context.currentDirectory.toLowerCase().includes('desktop') && !fileInfo.isDirectory) {
      fallbackActions.push({
        id: `organize_${Date.now()}`,
        type: 'move',
        label: 'Organize from Desktop',
        description: 'Move file from desktop to a more appropriate location',
        icon: '📁',
        confidence: 0.7,
        priority: 'medium',
        category: 'organization',
        estimatedTime: '1 minute',
        parameters: { suggestedPath: this.suggestOrganizationPath(fileInfo) }
      });
    }

    // Archive suggestions for old files
    if (fileAge > 90 && context.usage?.accessFrequency === 'rarely') {
      fallbackActions.push({
        id: `archive_${Date.now()}`,
        type: 'archive',
        label: 'Archive Old File',
        description: `File is ${fileAge} days old and rarely accessed`,
        icon: '📦',
        confidence: 0.6,
        priority: 'low',
        category: 'maintenance',
        estimatedTime: '30 seconds'
      });
    }

    // Compression suggestions for large files
    if (isLargeFile && ['.jpg', '.png', '.pdf', '.mp4'].includes(ext || '')) {
      fallbackActions.push({
        id: `compress_${Date.now()}`,
        type: 'compress',
        label: 'Optimize Large File',
        description: `File is ${this.formatFileSize(fileInfo.size)} and could be optimized`,
        icon: '📦',
        confidence: 0.75,
        priority: 'medium',
        category: 'maintenance',
        estimatedTime: '2-5 minutes',
        parameters: { currentSize: fileInfo.size }
      });
    }

    // Content-specific actions
    if (['.txt', '.md', '.doc'].includes(ext || '')) {
      fallbackActions.push({
        id: `summarize_${Date.now()}`,
        type: 'summarize',
        label: 'Create Summary',
        description: 'Generate a quick summary of document content',
        icon: '📄',
        confidence: 0.7,
        priority: 'medium',
        category: 'content',
        estimatedTime: '1 minute'
      });
    }

    const reasoning = error 
      ? `AI analysis failed (${error.message}), generated ${fallbackActions.length} rule-based suggestions`
      : `Generated ${fallbackActions.length} intelligent fallback suggestions based on file analysis`;

    return {
      fileInfo,
      suggestedActions: fallbackActions,
      reasoning,
      analysisTimestamp: new Date(),
      contextFactors
    };
  }

  private getFallbackActions(fileInfo: FileInfo, context: FileAnalysisContext): ContextualActions {
    const applicableTemplates = this.getApplicableTemplates(fileInfo);
    const fallbackActions: FileAction[] = [];

    // Basic rename suggestion for files with generic names
    if (fileInfo.name.toLowerCase().includes('untitled') || fileInfo.name.toLowerCase().includes('new ') || fileInfo.name.startsWith('Copy of')) {
      fallbackActions.push({
        id: `rename_${Date.now()}`,
        type: 'rename',
        label: 'Smart Rename',
        description: 'File has a generic name and could be renamed meaningfully',
        icon: '✏️',
        confidence: 0.8,
        priority: 'high',
        category: 'organization',
        estimatedTime: '30 seconds'
      });
    }

    // Organization suggestion for desktop files
    if (context.currentDirectory.includes('Desktop') && !fileInfo.isDirectory) {
      fallbackActions.push({
        id: `organize_${Date.now()}`,
        type: 'move',
        label: 'Organize from Desktop',
        description: 'Move file from desktop to a more organized location',
        icon: '📁',
        confidence: 0.7,
        priority: 'medium',
        category: 'organization',
        estimatedTime: '1 minute'
      });
    }

    // Archive suggestion for old files
    const monthsOld = (Date.now() - fileInfo.lastModified.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld > 6 && context.usage?.accessFrequency === 'rarely') {
      fallbackActions.push({
        id: `archive_${Date.now()}`,
        type: 'archive',
        label: 'Archive Old File',
        description: 'File is old and rarely accessed - consider archiving',
        icon: '📦',
        confidence: 0.6,
        priority: 'low',
        category: 'maintenance',
        estimatedTime: '30 seconds'
      });
    }

    return {
      fileInfo,
      suggestedActions: fallbackActions,
      reasoning: 'Basic analysis without AI assistance',
      analysisTimestamp: new Date(),
      contextFactors: ['File properties', 'Location context', 'Age analysis']
    };
  }

  async executeAction(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    console.log(`Executing action: ${action.type} for file: ${fileInfo.name}`);
    
    try {
      switch (action.type) {
        case 'rename':
          return await this.executeRename(action, fileInfo);
        case 'move':
          return await this.executeMove(action, fileInfo);
        case 'tag':
          return await this.executeTag(action, fileInfo);
        case 'summarize':
          return await this.executeSummarize(action, fileInfo);
        case 'archive':
          return await this.executeArchive(action, fileInfo);
        case 'duplicate':
          return await this.executeDuplicate(action, fileInfo);
        case 'extract':
          return await this.executeExtract(action, fileInfo);
        case 'categorize':
          return await this.executeCategorize(action, fileInfo);
        case 'compress':
          return await this.executeCompress(action, fileInfo);
        case 'workflow':
          return await this.executeWorkflow(action, fileInfo);
        case 'translate':
          return await this.executeTranslate(action, fileInfo);
        case 'optimize':
          return await this.executeOptimize(action, fileInfo);
        default:
          return {
            success: false,
            actionId: action.id,
            message: `Action type '${action.type}' is not yet implemented`,
            undoable: false
          };
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
      return {
        success: false,
        actionId: action.id,
        message: `Error executing action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undoable: false
      };
    }
  }

  private async executeRename(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    if (!this.openai) {
      return {
        success: false,
        actionId: action.id,
        message: 'OpenAI API key not configured for smart rename',
        undoable: false
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Suggest a better filename based on file content and context. Respond with just the new filename (without extension).'
          },
          {
            role: 'user',
            content: `Current filename: ${fileInfo.name}\nFile content preview: ${fileInfo.content?.substring(0, 300) || 'No content available'}`
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      });

      const suggestedName = response.choices[0].message.content?.trim() || 'renamed_file';
      const extension = fileInfo.extension || '';
      const newName = suggestedName + extension;

      // In a real implementation, you would call the file system API here
      // For now, we'll simulate the action
      
      return {
        success: true,
        actionId: action.id,
        message: `File would be renamed to: ${newName}`,
        newFileInfo: { ...fileInfo, name: newName },
        undoable: true,
        undoData: { originalName: fileInfo.name }
      };
    } catch (error) {
      return {
        success: false,
        actionId: action.id,
        message: `Failed to generate new filename: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undoable: false
      };
    }
  }

  private async executeMove(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    // Simulate organizing file based on type/content
    const suggestedPath = this.suggestOrganizationPath(fileInfo);
    
    return {
      success: true,
      actionId: action.id,
      message: `File would be moved to: ${suggestedPath}`,
      newFileInfo: { ...fileInfo, path: suggestedPath },
      undoable: true,
      undoData: { originalPath: fileInfo.path }
    };
  }

  private async executeTag(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    const tags = await this.generateTags(fileInfo);
    
    return {
      success: true,
      actionId: action.id,
      message: `Generated tags: ${tags.join(', ')}`,
      newFileInfo: { ...fileInfo, metadata: { ...fileInfo.metadata, tags } },
      undoable: true,
      undoData: { originalMetadata: fileInfo.metadata }
    };
  }

  private async executeSummarize(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    if (!this.openai || !fileInfo.content) {
      return {
        success: false,
        actionId: action.id,
        message: 'Cannot summarize: No content or API key not configured',
        undoable: false
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Create a concise summary of the file content in 2-3 sentences.'
          },
          {
            role: 'user',
            content: fileInfo.content
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      const summary = response.choices[0].message.content?.trim() || 'Summary not available';
      
      return {
        success: true,
        actionId: action.id,
        message: `Summary: ${summary}`,
        newFileInfo: { ...fileInfo, metadata: { ...fileInfo.metadata, summary } },
        undoable: true,
        undoData: { originalMetadata: fileInfo.metadata }
      };
    } catch (error) {
      return {
        success: false,
        actionId: action.id,
        message: `Failed to create summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undoable: false
      };
    }
  }

  private async executeArchive(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    const archivePath = fileInfo.path.replace(/[^\/\\]+$/, 'Archive/');
    
    return {
      success: true,
      actionId: action.id,
      message: `File would be archived to: ${archivePath}`,
      newFileInfo: { ...fileInfo, path: archivePath + fileInfo.name },
      undoable: true,
      undoData: { originalPath: fileInfo.path }
    };
  }

  private async executeDuplicate(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const duplicateName = fileInfo.name.replace(/(\.[\w\d_-]+)$/i, `_backup_${timestamp}$1`);
    
    return {
      success: true,
      actionId: action.id,
      message: `Backup copy would be created: ${duplicateName}`,
      newFileInfo: { ...fileInfo, name: duplicateName },
      undoable: true
    };
  }

  private suggestOrganizationPath(fileInfo: FileInfo): string {
    const ext = fileInfo.extension?.toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext || '')) {
      return fileInfo.path.replace(/[^\/\\]+$/, 'Images/');
    } else if (['.pdf', '.doc', '.docx', '.txt', '.md'].includes(ext || '')) {
      return fileInfo.path.replace(/[^\/\\]+$/, 'Documents/');
    } else if (['.mp3', '.wav', '.mp4', '.avi', '.mov'].includes(ext || '')) {
      return fileInfo.path.replace(/[^\/\\]+$/, 'Media/');
    } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext || '')) {
      return fileInfo.path.replace(/[^\/\\]+$/, 'Archives/');
    }
    
    return fileInfo.path;
  }

  private async generateTags(fileInfo: FileInfo): Promise<string[]> {
    if (!this.openai || !fileInfo.content) {
      // Fallback to basic tags based on file type and name
      const tags: string[] = [];
      
      if (fileInfo.extension) {
        tags.push(fileInfo.extension.substring(1));
      }
      
      if (fileInfo.name.toLowerCase().includes('project')) tags.push('project');
      if (fileInfo.name.toLowerCase().includes('draft')) tags.push('draft');
      if (fileInfo.name.toLowerCase().includes('final')) tags.push('final');
      
      return tags;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate 3-5 relevant tags for this file based on its content. Respond with just the tags separated by commas.'
          },
          {
            role: 'user',
            content: `Filename: ${fileInfo.name}\nContent: ${fileInfo.content.substring(0, 500)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      });

      return response.choices[0].message.content?.split(',').map(tag => tag.trim()) || [];
    } catch (error) {
      return ['untagged'];
    }
  }

  private async executeExtract(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    if (!this.openai || !fileInfo.content) {
      return {
        success: false,
        actionId: action.id,
        message: 'Cannot extract information: No content or API key not configured',
        undoable: false
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Extract key information from this file content. Focus on dates, names, important facts, and actionable items. Respond with structured data.'
          },
          {
            role: 'user',
            content: `Extract key information from this file:\n\nFilename: ${fileInfo.name}\nContent:\n${fileInfo.content}`
          }
        ],
        temperature: 0.2,
        max_tokens: 300
      });

      const extractedInfo = response.choices[0].message.content?.trim() || 'No information extracted';
      
      return {
        success: true,
        actionId: action.id,
        message: `Extracted information: ${extractedInfo}`,
        newFileInfo: { ...fileInfo, metadata: { ...fileInfo.metadata, extractedInfo } },
        undoable: true,
        undoData: { originalMetadata: fileInfo.metadata }
      };
    } catch (error) {
      return {
        success: false,
        actionId: action.id,
        message: `Failed to extract information: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undoable: false
      };
    }
  }

  private async executeCategorize(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    if (!this.openai || !fileInfo.content) {
      // Fallback categorization based on file extension and name
      const category = this.getCategoryFromFileType(fileInfo);
      return {
        success: true,
        actionId: action.id,
        message: `Categorized as: ${category} (based on file type analysis)`,
        newFileInfo: { ...fileInfo, metadata: { ...fileInfo.metadata, category } },
        undoable: true,
        undoData: { originalMetadata: fileInfo.metadata }
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Categorize this file based on its content and context. Respond with a single, specific category that best describes the file\'s purpose or type.'
          },
          {
            role: 'user',
            content: `Categorize this file:\n\nName: ${fileInfo.name}\nContent: ${fileInfo.content?.substring(0, 500)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 50
      });

      const category = response.choices[0].message.content?.trim() || 'Uncategorized';
      
      return {
        success: true,
        actionId: action.id,
        message: `Categorized as: ${category}`,
        newFileInfo: { ...fileInfo, metadata: { ...fileInfo.metadata, category } },
        undoable: true,
        undoData: { originalMetadata: fileInfo.metadata }
      };
    } catch (error) {
      return {
        success: false,
        actionId: action.id,
        message: `Failed to categorize: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undoable: false
      };
    }
  }

  private async executeCompress(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    // Simulate compression analysis
    const currentSize = action.parameters?.currentSize || fileInfo.size;
    const estimatedSavings = Math.floor(currentSize * 0.3); // Assume 30% reduction
    const newSize = currentSize - estimatedSavings;
    
    return {
      success: true,
      actionId: action.id,
      message: `File compression simulated. Original: ${this.formatFileSize(currentSize)}, Estimated new size: ${this.formatFileSize(newSize)} (${this.formatFileSize(estimatedSavings)} saved)`,
      newFileInfo: { ...fileInfo, size: newSize, metadata: { ...fileInfo.metadata, compressed: true, originalSize: currentSize } },
      undoable: true,
      undoData: { originalSize: currentSize }
    };
  }

  private async executeWorkflow(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    if (!this.openai) {
      const suggestions = this.getBasicWorkflowSuggestions(fileInfo);
      return {
        success: true,
        actionId: action.id,
        message: `Workflow suggestions: ${suggestions.join(', ')}`,
        undoable: false
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Suggest the next 3-5 logical steps or actions a user might want to take with this file. Focus on practical, actionable suggestions.'
          },
          {
            role: 'user',
            content: `Suggest workflow steps for this file:\n\nName: ${fileInfo.name}\nType: ${fileInfo.extension}\nContent preview: ${fileInfo.content?.substring(0, 200) || 'No content available'}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const workflow = response.choices[0].message.content?.trim() || 'No workflow suggestions available';
      
      return {
        success: true,
        actionId: action.id,
        message: `Workflow suggestions: ${workflow}`,
        undoable: false
      };
    } catch (error) {
      return {
        success: false,
        actionId: action.id,
        message: `Failed to generate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undoable: false
      };
    }
  }

  private async executeTranslate(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    if (!this.openai || !fileInfo.content) {
      return {
        success: false,
        actionId: action.id,
        message: 'Cannot translate: No content or API key not configured',
        undoable: false
      };
    }

    const targetLanguage = action.parameters?.targetLanguage || 'Spanish';
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Translate the following text to ${targetLanguage}. Maintain the original formatting and structure.`
          },
          {
            role: 'user',
            content: fileInfo.content.substring(0, 2000) // Limit to first 2000 chars
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      const translatedContent = response.choices[0].message.content?.trim() || 'Translation failed';
      const newName = fileInfo.name.replace(/(\.[^.]+)$/, `_${targetLanguage.toLowerCase()}$1`);
      
      return {
        success: true,
        actionId: action.id,
        message: `Content translated to ${targetLanguage}. Suggested filename: ${newName}`,
        newFileInfo: { ...fileInfo, content: translatedContent, name: newName },
        undoable: true,
        undoData: { originalContent: fileInfo.content, originalName: fileInfo.name }
      };
    } catch (error) {
      return {
        success: false,
        actionId: action.id,
        message: `Failed to translate: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undoable: false
      };
    }
  }

  private async executeOptimize(action: FileAction, fileInfo: FileInfo): Promise<ActionExecutionResult> {
    const ext = fileInfo.extension?.toLowerCase();
    let optimizationType = 'general';
    let estimatedSavings = 0;
    
    if (['.jpg', '.jpeg', '.png'].includes(ext || '')) {
      optimizationType = 'image compression';
      estimatedSavings = Math.floor(fileInfo.size * 0.4); // 40% for images
    } else if (ext === '.pdf') {
      optimizationType = 'PDF optimization';
      estimatedSavings = Math.floor(fileInfo.size * 0.25); // 25% for PDFs
    } else if (['.mp4', '.avi', '.mov'].includes(ext || '')) {
      optimizationType = 'video compression';
      estimatedSavings = Math.floor(fileInfo.size * 0.5); // 50% for videos
    }
    
    return {
      success: true,
      actionId: action.id,
      message: `File optimization (${optimizationType}) simulated. Estimated savings: ${this.formatFileSize(estimatedSavings)}`,
      newFileInfo: { ...fileInfo, size: fileInfo.size - estimatedSavings, metadata: { ...fileInfo.metadata, optimized: true } },
      undoable: true,
      undoData: { originalSize: fileInfo.size }
    };
  }

  private getCategoryFromFileType(fileInfo: FileInfo): string {
    const ext = fileInfo.extension?.toLowerCase();
    const name = fileInfo.name.toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext || '')) return 'Images';
    if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext || '')) return 'Videos';
    if (['.mp3', '.wav', '.flac', '.aac'].includes(ext || '')) return 'Audio';
    if (['.doc', '.docx', '.txt', '.md', '.pdf'].includes(ext || '')) return 'Documents';
    if (['.xls', '.xlsx', '.csv'].includes(ext || '')) return 'Spreadsheets';
    if (['.ppt', '.pptx'].includes(ext || '')) return 'Presentations';
    if (['.zip', '.rar', '.7z', '.tar'].includes(ext || '')) return 'Archives';
    if (['.js', '.ts', '.py', '.java', '.cpp'].includes(ext || '')) return 'Code';
    
    if (name.includes('invoice') || name.includes('receipt')) return 'Financial';
    if (name.includes('contract') || name.includes('agreement')) return 'Legal';
    if (name.includes('report') || name.includes('analysis')) return 'Reports';
    
    return 'Miscellaneous';
  }

  private getBasicWorkflowSuggestions(fileInfo: FileInfo): string[] {
    const ext = fileInfo.extension?.toLowerCase();
    const suggestions: string[] = [];
    
    if (['.doc', '.docx', '.txt', '.md'].includes(ext || '')) {
      suggestions.push('Review and edit content', 'Share with team', 'Convert to PDF', 'Create backup');
    } else if (['.jpg', '.png', '.gif'].includes(ext || '')) {
      suggestions.push('Optimize for web', 'Create thumbnail', 'Add to gallery', 'Tag with keywords');
    } else if (['.pdf'].includes(ext || '')) {
      suggestions.push('Extract text', 'Split pages', 'Add annotations', 'Convert to Word');
    } else {
      suggestions.push('Create backup', 'Add tags', 'Move to appropriate folder', 'Check for updates');
    }
    
    return suggestions;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
