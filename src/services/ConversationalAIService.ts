import OpenAI from 'openai';

export interface FileCommand {
  action: 'list' | 'search' | 'create' | 'delete' | 'move' | 'copy' | 'rename' | 'open' | 'analyze' | 'organize' | 'info' | 'help';
  target?: string;
  destination?: string;
  filters?: {
    type?: string[];
    size?: { min?: number; max?: number };
    date?: { days?: number; from?: Date; to?: Date };
    name?: string;
  };
  parameters?: Record<string, any>;
  confidence: number;
}

export interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
  command?: FileCommand;
  results?: any;
  fileContext?: {
    currentPath: string;
    selectedFiles: string[];
    recentFiles: string[];
  };
}

export interface ConversationContext {
  currentPath: string;
  selectedFiles: string[];
  recentFiles: string[];
  recentCommands: FileCommand[];
  userPreferences: {
    preferredActions: Record<string, number>;
    commonPaths: string[];
    fileTypes: string[];
  };
}

export class ConversationalAIService {
  private openai: OpenAI | null = null;
  private conversationHistory: ConversationMessage[] = [];
  private context: ConversationContext;
  private maxHistorySize = 100;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    }

    this.context = {
      currentPath: '',
      selectedFiles: [],
      recentFiles: [],
      recentCommands: [],
      userPreferences: {
        preferredActions: {},
        commonPaths: [],
        fileTypes: []
      }
    };

    this.loadConversationHistory();
  }

  setApiKey(apiKey: string): void {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  updateContext(context: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...context };
  }

  async processMessage(userInput: string): Promise<ConversationMessage> {
    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: userInput,
      timestamp: new Date(),
      fileContext: {
        currentPath: this.context.currentPath,
        selectedFiles: [...this.context.selectedFiles],
        recentFiles: [...this.context.recentFiles]
      }
    };

    this.addMessage(userMessage);

    try {
      // Parse the command using AI
      const command = await this.parseCommand(userInput);
      userMessage.command = command;

      // Generate AI response
      const assistantResponse = await this.generateResponse(userInput, command);

      return assistantResponse;
    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: ConversationMessage = {
        id: `msg_${Date.now()}_error`,
        type: 'error',
        content: `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };

      this.addMessage(errorMessage);
      return errorMessage;
    }
  }

  private async parseCommand(input: string): Promise<FileCommand> {
    if (!this.openai) {
      return this.parseCommandFallback(input);
    }

    try {
      const prompt = this.buildCommandParsingPrompt(input);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a file management command parser. Parse natural language into structured file commands.
            
            Available actions: list, search, create, delete, move, copy, rename, open, analyze, organize, info, help
            
            Always respond with valid JSON in this exact format:
            {
              "action": "command_type",
              "target": "file_or_folder_name",
              "destination": "destination_path",
              "filters": {
                "type": ["file_extensions"],
                "size": {"min": 0, "max": 1000000},
                "date": {"days": 7},
                "name": "search_pattern"
              },
              "parameters": {},
              "confidence": 0.9
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const result = response.choices[0].message.content;
      if (!result) throw new Error('Empty response from AI');

      return JSON.parse(result) as FileCommand;
    } catch (error) {
      console.warn('AI command parsing failed, using fallback:', error);
      return this.parseCommandFallback(input);
    }
  }

  private buildCommandParsingPrompt(input: string): string {
    return `
Parse this file management request:
"${input}"

Current context:
- Current directory: ${this.context.currentPath || '/'}
- Selected files: ${this.context.selectedFiles.length > 0 ? this.context.selectedFiles.join(', ') : 'none'}
- Recent files: ${this.context.recentFiles.slice(0, 5).join(', ')}
- Recent commands: ${this.context.recentCommands.slice(0, 3).map(cmd => cmd.action).join(', ')}

Consider:
1. What file operation is being requested?
2. What files or folders are being targeted?
3. Are there any filters or conditions?
4. What's the user's likely intent based on context?

Examples:
"show me all images" → {"action": "list", "filters": {"type": [".jpg", ".png", ".gif"]}}
"delete the selected files" → {"action": "delete", "target": "selected"}
"find large files from last week" → {"action": "search", "filters": {"size": {"min": 10000000}, "date": {"days": 7}}}
"organize my downloads" → {"action": "organize", "target": "downloads"}
`;
  }

  private parseCommandFallback(input: string): FileCommand {
    const lowercaseInput = input.toLowerCase();
    
    // Simple pattern matching for common commands
    if (lowercaseInput.includes('list') || lowercaseInput.includes('show') || lowercaseInput.includes('display')) {
      return {
        action: 'list',
        confidence: 0.7,
        filters: this.extractFilters(input)
      };
    }
    
    if (lowercaseInput.includes('search') || lowercaseInput.includes('find') || lowercaseInput.includes('look for')) {
      return {
        action: 'search',
        target: this.extractTarget(input),
        confidence: 0.7,
        filters: this.extractFilters(input)
      };
    }
    
    if (lowercaseInput.includes('delete') || lowercaseInput.includes('remove')) {
      return {
        action: 'delete',
        target: this.extractTarget(input) || 'selected',
        confidence: 0.8
      };
    }
    
    if (lowercaseInput.includes('move') || lowercaseInput.includes('relocate')) {
      return {
        action: 'move',
        target: this.extractTarget(input),
        destination: this.extractDestination(input),
        confidence: 0.7
      };
    }
    
    if (lowercaseInput.includes('copy') || lowercaseInput.includes('duplicate')) {
      return {
        action: 'copy',
        target: this.extractTarget(input),
        destination: this.extractDestination(input),
        confidence: 0.7
      };
    }
    
    if (lowercaseInput.includes('rename')) {
      return {
        action: 'rename',
        target: this.extractTarget(input),
        destination: this.extractDestination(input),
        confidence: 0.8
      };
    }
    
    if (lowercaseInput.includes('create') || lowercaseInput.includes('make') || lowercaseInput.includes('new')) {
      return {
        action: 'create',
        target: this.extractTarget(input),
        confidence: 0.7
      };
    }
    
    if (lowercaseInput.includes('organize') || lowercaseInput.includes('sort') || lowercaseInput.includes('arrange')) {
      return {
        action: 'organize',
        target: this.extractTarget(input) || 'current',
        confidence: 0.6
      };
    }
    
    if (lowercaseInput.includes('open') || lowercaseInput.includes('launch')) {
      return {
        action: 'open',
        target: this.extractTarget(input),
        confidence: 0.8
      };
    }

    if (lowercaseInput.includes('help') || lowercaseInput.includes('what can') || lowercaseInput.includes('how to')) {
      return {
        action: 'help',
        confidence: 0.9
      };
    }

    // Default to search if no clear action is detected
    return {
      action: 'search',
      target: input,
      confidence: 0.3
    };
  }

  private extractTarget(input: string): string | undefined {
    // Simple extraction logic - in a real implementation, this would be more sophisticated
    const words = input.split(' ');
    
    // Look for quoted strings
    const quoted = input.match(/"([^"]*)"/);
    if (quoted) return quoted[1];
    
    // Look for file extensions
    const extension = input.match(/\.\w+/);
    if (extension) return extension[0];
    
    // Look for common file/folder names
    const commonTargets = ['selected', 'all', 'current', 'downloads', 'documents', 'desktop', 'images', 'videos', 'music'];
    for (const target of commonTargets) {
      if (input.toLowerCase().includes(target)) return target;
    }
    
    return undefined;
  }

  private extractDestination(input: string): string | undefined {
    const toMatch = input.match(/to\s+([^,\s]+)/i);
    if (toMatch) return toMatch[1];
    
    const intoMatch = input.match(/into\s+([^,\s]+)/i);
    if (intoMatch) return intoMatch[1];
    
    return undefined;
  }

  private extractFilters(input: string): FileCommand['filters'] {
    const filters: FileCommand['filters'] = {};
    
    // Extract file types
    const typeMatches = input.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|txt|mp4|mp3|zip|rar|exe|js|ts|html|css)/gi);
    if (typeMatches) {
      filters.type = typeMatches.map(ext => ext.toLowerCase());
    }
    
    // Extract size filters
    const sizeMatch = input.match(/(large|big|huge|small|tiny)/i);
    if (sizeMatch) {
      const sizeType = sizeMatch[1].toLowerCase();
      if (['large', 'big', 'huge'].includes(sizeType)) {
        filters.size = { min: 10 * 1024 * 1024 }; // 10MB+
      } else if (['small', 'tiny'].includes(sizeType)) {
        filters.size = { max: 1024 * 1024 }; // < 1MB
      }
    }
    
    // Extract date filters
    const dateMatch = input.match(/(today|yesterday|last\s+week|last\s+month|recent)/i);
    if (dateMatch) {
      const dateType = dateMatch[1].toLowerCase().replace(/\s+/g, ' ');
      switch (dateType) {
        case 'today':
          filters.date = { days: 1 };
          break;
        case 'yesterday':
          filters.date = { days: 2 };
          break;
        case 'last week':
          filters.date = { days: 7 };
          break;
        case 'last month':
          filters.date = { days: 30 };
          break;
        case 'recent':
          filters.date = { days: 7 };
          break;
      }
    }
    
    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  private async generateResponse(userInput: string, command: FileCommand): Promise<ConversationMessage> {
    if (!this.openai) {
      return this.generateResponseFallback(userInput, command);
    }

    try {
      const prompt = this.buildResponsePrompt(userInput, command);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful file management assistant. You understand file operations and provide clear, friendly responses about file management tasks. Be conversational but informative. If you need to perform an action, explain what you're doing. If there are issues, explain them clearly and suggest solutions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const content = response.choices[0].message.content || 'I understand your request, but I\'m not sure how to respond.';

      const assistantMessage: ConversationMessage = {
        id: `msg_${Date.now()}_assistant`,
        type: 'assistant',
        content,
        timestamp: new Date(),
        command
      };

      this.addMessage(assistantMessage);
      return assistantMessage;

    } catch (error) {
      console.warn('AI response generation failed, using fallback:', error);
      return this.generateResponseFallback(userInput, command);
    }
  }

  private buildResponsePrompt(userInput: string, command: FileCommand): string {
    return `
User said: "${userInput}"

I parsed this as command: ${JSON.stringify(command, null, 2)}

Current context:
- Directory: ${this.context.currentPath || 'Unknown'}
- Selected files: ${this.context.selectedFiles.length} file(s)
- Command confidence: ${(command.confidence * 100).toFixed(1)}%

Please provide a natural, helpful response that:
1. Acknowledges what the user wants to do
2. Explains the action that will be taken (if any)
3. Mentions any important details or requirements
4. Asks for clarification if the confidence is low
5. Is friendly and conversational

Keep it concise but informative.
`;
  }

  private generateResponseFallback(userInput: string, command: FileCommand): ConversationMessage {
    let content = '';

    switch (command.action) {
      case 'list':
        content = `I'll show you the files${command.filters ? ' matching your criteria' : ' in the current directory'}.`;
        break;
      case 'search':
        content = `I'll search for "${command.target}"${command.filters ? ' with the specified filters' : ''}.`;
        break;
      case 'delete':
        content = `I'll delete ${command.target === 'selected' ? 'the selected files' : command.target || 'the specified files'}. Please confirm this action.`;
        break;
      case 'move':
        content = `I'll move ${command.target || 'the files'} to ${command.destination || 'the specified location'}.`;
        break;
      case 'copy':
        content = `I'll copy ${command.target || 'the files'} to ${command.destination || 'the specified location'}.`;
        break;
      case 'rename':
        content = `I'll rename ${command.target || 'the file'} to ${command.destination || 'the new name'}.`;
        break;
      case 'create':
        content = `I'll create ${command.target || 'the new item'} in the current directory.`;
        break;
      case 'organize':
        content = `I'll organize the files in ${command.target === 'current' ? 'the current directory' : command.target || 'the specified location'}.`;
        break;
      case 'open':
        content = `I'll open ${command.target || 'the specified file'}.`;
        break;
      case 'help':
        content = `I can help you with file operations! Try commands like:
• "Show me all images from last week"
• "Delete the selected files"
• "Move photos to Pictures folder"
• "Find large files"
• "Organize my downloads"
• "Create a new folder called Projects"`;
        break;
      default:
        content = `I understand you want to ${command.action}, but I need more information to help you.`;
    }

    if (command.confidence < 0.5) {
      content += `\n\nI'm not entirely sure about your request (${(command.confidence * 100).toFixed(1)}% confidence). Could you please clarify what you'd like to do?`;
    }

    const assistantMessage: ConversationMessage = {
      id: `msg_${Date.now()}_assistant`,
      type: 'assistant',
      content,
      timestamp: new Date(),
      command
    };

    this.addMessage(assistantMessage);
    return assistantMessage;
  }

  private addMessage(message: ConversationMessage): void {
    this.conversationHistory.push(message);
    
    // Keep history size manageable
    if (this.conversationHistory.length > this.maxHistorySize) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistorySize);
    }

    // Update command history for context
    if (message.command && message.type === 'user') {
      this.context.recentCommands.unshift(message.command);
      if (this.context.recentCommands.length > 10) {
        this.context.recentCommands = this.context.recentCommands.slice(0, 10);
      }
    }

    this.saveConversationHistory();
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  getRecentMessages(count: number = 10): ConversationMessage[] {
    return this.conversationHistory.slice(-count);
  }

  clearConversationHistory(): void {
    this.conversationHistory = [];
    this.context.recentCommands = [];
    this.saveConversationHistory();
  }

  searchConversationHistory(query: string): ConversationMessage[] {
    const lowercaseQuery = query.toLowerCase();
    return this.conversationHistory.filter(msg => 
      msg.content.toLowerCase().includes(lowercaseQuery) ||
      (msg.command?.action && msg.command.action.includes(lowercaseQuery))
    );
  }

  exportConversationHistory(): string {
    const exportData = {
      messages: this.conversationHistory,
      context: this.context,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(exportData, null, 2);
  }

  private saveConversationHistory(): void {
    try {
      const data = {
        history: this.conversationHistory,
        context: this.context
      };
      localStorage.setItem('smart-file-explorer-conversation-history', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save conversation history:', error);
    }
  }

  private loadConversationHistory(): void {
    try {
      const saved = localStorage.getItem('smart-file-explorer-conversation-history');
      if (saved) {
        const data = JSON.parse(saved);
        this.conversationHistory = data.history || [];
        this.context = { ...this.context, ...data.context };
      }
    } catch (error) {
      console.warn('Failed to load conversation history:', error);
      this.conversationHistory = [];
    }
  }
}

// Singleton instance
let conversationalAIInstance: ConversationalAIService | null = null;

export const getConversationalAIService = (): ConversationalAIService => {
  try {
    if (!conversationalAIInstance) {
      conversationalAIInstance = new ConversationalAIService();
    }
    return conversationalAIInstance;
  } catch (error) {
    console.warn('Failed to create ConversationalAIService, creating fallback instance:', error);
    // Return a basic instance that will work without external dependencies
    if (!conversationalAIInstance) {
      conversationalAIInstance = new ConversationalAIService();
    }
    return conversationalAIInstance;
  }
};
