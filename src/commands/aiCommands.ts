import OpenAI from 'openai';

export interface AICommand {
  type: 'search' | 'organize' | 'delete' | 'move' | 'copy' | 'preview';
  query: string;
  parameters: Record<string, any>;
  confidence: number;
  preview?: string;
}

export class AICommandProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, this should be done server-side
    });
  }

  async processCommand(userInput: string): Promise<AICommand> {
    const prompt = `
You are an AI assistant for a Windows file explorer. Parse the user's natural language command and return a structured response.

User input: "${userInput}"

Return a JSON object with:
- type: "search" | "organize" | "delete" | "move" | "copy" | "preview"
- query: the search query or description
- parameters: additional parameters like file types, dates, sizes, etc.
- confidence: number between 0-1 indicating how confident you are in the interpretation
- preview: a brief description of what will be done

Examples:
"Find all PDF files" -> {"type": "search", "query": "PDF files", "parameters": {"fileTypes": ["pdf"], "searchTerm": "*.pdf"}, "confidence": 0.95, "preview": "Searching for all PDF files"}
"Show me files larger than 100MB" -> {"type": "search", "query": "large files", "parameters": {"minSize": "100MB", "searchTerm": "*"}, "confidence": 0.9, "preview": "Finding files larger than 100MB"}
"Find documents modified this week" -> {"type": "search", "query": "recent documents", "parameters": {"fileTypes": ["doc", "docx", "pdf", "txt", "rtf"], "modified": "this week", "searchTerm": "*"}, "confidence": 0.85, "preview": "Searching for documents modified this week"}
"Organize my downloads by file type" -> {"type": "organize", "query": "downloads folder", "parameters": {"by": "file type", "folder": "downloads"}, "confidence": 0.9, "preview": "Organizing downloads folder by file type"}
"Delete old temporary files" -> {"type": "delete", "query": "temporary files", "parameters": {"fileTypes": ["tmp", "temp", "cache"], "older_than": "30 days"}, "confidence": 0.8, "preview": "⚠️ Will delete temporary files older than 30 days"}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(result);
      return parsed as AICommand;
    } catch (error) {
      console.error('AI command processing failed:', error);
      // Fallback to basic parsing
      return this.fallbackParse(userInput);
    }
  }

  private fallbackParse(input: string): AICommand {
    const lowerInput = input.toLowerCase();
    const parameters: Record<string, any> = {};
    
    // File type detection with priority order
    const specificTypeMap: Record<string, string[]> = {
      'pdf': ['pdf'],
      'jpg': ['jpg'],
      'jpeg': ['jpeg'],
      'png': ['png'],
      'gif': ['gif'],
      'mp4': ['mp4'],
      'mp3': ['mp3'],
      'txt': ['txt'],
      'doc': ['doc'],
      'docx': ['docx'],
      'xlsx': ['xlsx'],
      'pptx': ['pptx'],
    };
    
    const categoryTypeMap: Record<string, string[]> = {
      'document': ['doc', 'docx', 'txt', 'rtf', 'odt'], // Note: removed PDF from documents
      'image': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'],
      'video': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
      'audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
      'archive': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
      'code': ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'html', 'css'],
      'spreadsheet': ['xlsx', 'xls', 'csv', 'ods'],
      'presentation': ['pptx', 'ppt', 'odp'],
      'temporary': ['tmp', 'temp', 'cache', 'log']
    };
    
    // Detect file types - first check specific types, then categories
    let detectedFileTypes: string[] = [];
    
    // Check for specific file extensions first (higher priority)
    for (const [extension, types] of Object.entries(specificTypeMap)) {
      if (lowerInput.includes(extension)) {
        detectedFileTypes = [...detectedFileTypes, ...types];
      }
    }
    
    // If no specific types found, check categories
    if (detectedFileTypes.length === 0) {
      for (const [category, extensions] of Object.entries(categoryTypeMap)) {
        if (lowerInput.includes(category)) {
          detectedFileTypes = [...detectedFileTypes, ...extensions];
        }
      }
    }
    
    // Size detection
    const sizeMatch = lowerInput.match(/(\d+)\s*(mb|gb|kb|bytes?)/);
    if (sizeMatch) {
      parameters.minSize = sizeMatch[0];
    }
    
    // Time detection
    if (lowerInput.includes('today') || lowerInput.includes('this week') || lowerInput.includes('last week') ||
        lowerInput.includes('this month') || lowerInput.includes('last month') || lowerInput.includes('recent')) {
      parameters.modified = lowerInput.match(/(today|this week|last week|this month|last month|recent)/)?.[0] || 'recent';
    }
    
    // Search type determination - handle both explicit search commands and direct file type queries
    const isSearchCommand = lowerInput.includes('find') || lowerInput.includes('search') || lowerInput.includes('show');
    const isDirectFileTypeQuery = detectedFileTypes.length > 0 && !isSearchCommand;
    
    if (isSearchCommand || isDirectFileTypeQuery) {
      const searchTerm = detectedFileTypes.length > 0 ? `*.{${detectedFileTypes.join(',')}}` : '*';
      
      return {
        type: 'search',
        query: input,
        parameters: {
          ...parameters,
          fileTypes: detectedFileTypes,
          searchTerm
        },
        confidence: isDirectFileTypeQuery ? 0.9 : 0.8,
        preview: `Searching for ${detectedFileTypes.length > 0 ? detectedFileTypes.join(', ').toUpperCase() + ' files' : 'files'}${parameters.minSize ? ' larger than ' + parameters.minSize : ''}${parameters.modified ? ' modified ' + parameters.modified : ''}`
      };
    }
    
    if (lowerInput.includes('organize') || lowerInput.includes('sort') || lowerInput.includes('arrange')) {
      const folder = lowerInput.includes('download') ? 'downloads' : 
                    lowerInput.includes('desktop') ? 'desktop' :
                    lowerInput.includes('document') ? 'documents' : 'current';
      
      return {
        type: 'organize',
        query: input,
        parameters: {
          by: 'file type',
          folder
        },
        confidence: 0.7,
        preview: `Organizing ${folder} folder by file type`
      };
    }

    if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
      return {
        type: 'delete',
        query: input,
        parameters: {
          ...parameters,
          fileTypes: detectedFileTypes
        },
        confidence: 0.6,
        preview: `⚠️ Planning to delete ${detectedFileTypes.length > 0 ? detectedFileTypes.join(', ') + ' files' : 'selected files'}`
      };
    }

    // Default fallback - if file types were detected, make it a search
    if (detectedFileTypes.length > 0) {
      return {
        type: 'search',
        query: input,
        parameters: {
          fileTypes: detectedFileTypes,
          searchTerm: `*.{${detectedFileTypes.join(',')}}`
        },
        confidence: 0.7,
        preview: `Searching for ${detectedFileTypes.join(', ').toUpperCase()} files`
      };
    }
    
    // True fallback for unrecognized commands
    return {
      type: 'search',
      query: input,
      parameters: {
        searchTerm: '*'
      },
      confidence: 0.5,
      preview: 'Processing your request...'
    };
  }

  async generateFilePreview(filePath: string): Promise<string> {
    // This would analyze file content and generate a preview/summary
    // For now, return a placeholder
    return `Preview of ${filePath}: This is a placeholder for file content analysis.`;
  }

  async suggestOrganization(currentFiles: any[]): Promise<string[]> {
    // This would analyze file patterns and suggest organization strategies
    return [
      'Group by file type',
      'Sort by date modified',
      'Create folders for different categories',
    ];
  }
}

export const createCommandProcessor = (apiKey: string) => {
  return new AICommandProcessor(apiKey);
};
