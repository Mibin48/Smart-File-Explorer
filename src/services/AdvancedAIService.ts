import OpenAI from 'openai';

// Browser-compatible path utilities
const getFileExtension = (filePath: string): string => {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot > -1 ? filePath.substring(lastDot) : '';
};

const getBaseName = (filePath: string): string => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const lastSlash = normalizedPath.lastIndexOf('/');
  return lastSlash > -1 ? normalizedPath.substring(lastSlash + 1) : normalizedPath;
};

export interface FileAnalysis {
  filename: string;
  filePath: string;
  summary: string;
  category: string;
  tags: string[];
  suggestedName?: string;
  confidence: number;
}

export interface SemanticSearchResult {
  path: string;
  similarity: number;
  reason: string;
}

export interface SmartOrganizationSuggestion {
  action: 'move' | 'rename' | 'categorize';
  files: string[];
  destination?: string;
  newName?: string;
  reason: string;
  confidence: number;
}

export class AdvancedAIService {
  private openai: OpenAI;
  private embeddings: Map<string, number[]> = new Map();

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // For development only
    });
  }

  /**
   * Advanced GPT-4 function calling for complex file operations
   */
  async processComplexCommand(command: string, context: {
    currentPath: string;
    files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>;
  }) {
    const functions = [
      {
        name: 'search_files_by_criteria',
        description: 'Search files based on multiple criteria including content, date, size, and type',
        parameters: {
          type: 'object',
          properties: {
            contentKeywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to search in file content' },
            fileTypes: { type: 'array', items: { type: 'string' }, description: 'File extensions to filter' },
            dateRange: { 
              type: 'object', 
              properties: {
                from: { type: 'string', format: 'date' },
                to: { type: 'string', format: 'date' }
              }
            },
            sizeRange: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' }
              }
            }
          }
        }
      },
      {
        name: 'organize_files_intelligently',
        description: 'Organize files based on content analysis and patterns',
        parameters: {
          type: 'object',
          properties: {
            organizationType: { 
              type: 'string', 
              enum: ['by_content', 'by_project', 'by_date', 'by_importance'],
              description: 'How to organize the files'
            },
            createFolders: { type: 'boolean', description: 'Whether to create new folders' },
            folderNames: { type: 'array', items: { type: 'string' }, description: 'Suggested folder names' }
          }
        }
      },
      {
        name: 'analyze_file_relationships',
        description: 'Find relationships between files (duplicates, similar content, related projects)',
        parameters: {
          type: 'object',
          properties: {
            analysisType: {
              type: 'string',
              enum: ['duplicates', 'similar_content', 'project_related', 'version_history'],
              description: 'Type of relationship analysis'
            }
          }
        }
      }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an advanced AI file management assistant. You have access to powerful functions to search, organize, and analyze files. 
                     Current directory: ${context.currentPath}
                     Available files: ${context.files.map(f => f.name).join(', ')}`
          },
          {
            role: 'user',
            content: command
          }
        ],
        functions,
        function_call: 'auto',
        temperature: 0.1
      });

      const message = response.choices[0]?.message;
      
      if (message?.function_call) {
        return {
          functionName: message.function_call.name,
          arguments: JSON.parse(message.function_call.arguments || '{}'),
          explanation: message.content
        };
      }

      return {
        response: message?.content,
        suggestions: await this.generateSmartSuggestions(context.files)
      };
    } catch (error) {
      console.error('Advanced AI processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for semantic search
   */
  async generateFileEmbeddings(files: Array<{ path: string; content?: string; name: string }>) {
    const results: Array<{ path: string; embedding: number[] }> = [];

    for (const file of files) {
      try {
        const textContent = file.content || file.name;
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textContent
        });

        const embedding = response.data[0]?.embedding;
        if (embedding) {
          results.push({ path: file.path, embedding });
          this.embeddings.set(file.path, embedding);
        }
      } catch (error) {
        console.warn(`Failed to generate embedding for ${file.path}:`, error);
      }
    }

    return results;
  }

  /**
   * Semantic search using embeddings
   */
  async semanticSearch(query: string, limit: number = 10): Promise<SemanticSearchResult[]> {
    try {
      // Generate embedding for the search query
      const queryResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });

      const queryEmbedding = queryResponse.data[0]?.embedding;
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Calculate similarities
      const similarities: Array<{ path: string; similarity: number }> = [];
      
      for (const [path, embedding] of this.embeddings.entries()) {
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        similarities.push({ path, similarity });
      }

      // Sort by similarity and return top results
      const topResults = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      // Generate explanations for why files match
      const results: SemanticSearchResult[] = [];
      for (const result of topResults) {
        const reason = await this.explainSemanticMatch(query, result.path, result.similarity);
        results.push({
          path: result.path,
          similarity: result.similarity,
          reason
        });
      }

      return results;
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Analyze file content using GPT-4 Vision for images or GPT-4 for text
   */
  async analyzeFileContent(filePath: string, fileContent?: Buffer): Promise<FileAnalysis> {
    const fileExtension = getFileExtension(filePath).toLowerCase();
    const filename = getBaseName(filePath);
    
    try {
      let analysis: FileAnalysis;
      
      if (this.isImageFile(fileExtension) && fileContent) {
        analysis = await this.analyzeImageFile(filePath, fileContent);
      } else if (this.isTextFile(fileExtension) && fileContent) {
        analysis = await this.analyzeTextFile(filePath, fileContent.toString('utf-8'));
      } else {
        analysis = await this.analyzeFileByName(filePath);
      }
      
      // Add filename and path to analysis
      analysis.filename = filename;
      analysis.filePath = filePath;
      
      return analysis;
    } catch (error) {
      console.error(`Failed to analyze ${filePath}:`, error);
      return {
        filename,
        filePath,
        summary: 'Analysis failed',
        category: 'unknown',
        tags: [],
        confidence: 0
      };
    }
  }

  /**
   * Generate smart organization suggestions
   */
  async generateSmartSuggestions(files: Array<{ name: string; path: string; modified: Date; size: number; type: string }>): Promise<SmartOrganizationSuggestion[]> {
    const prompt = `
    Analyze these files and suggest intelligent organization:
    ${files.map(f => `- ${f.name} (${f.type}, ${f.size} bytes, modified: ${f.modified.toLocaleDateString()})`).join('\n')}
    
    Provide suggestions for:
    1. Grouping related files
    2. Creating logical folder structures
    3. Identifying files that might need attention (duplicates, old files, etc.)
    4. Renaming files for better organization
    
    Focus on practical, actionable suggestions.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      });

      const suggestions = this.parseSuggestions(response.choices[0]?.message?.content || '');
      return suggestions;
    } catch (error) {
      console.error('Failed to generate smart suggestions:', error);
      return [];
    }
  }

  /**
   * Find similar files using AI
   */
  async findSimilarFiles(targetFile: string): Promise<string[]> {
    const targetEmbedding = this.embeddings.get(targetFile);
    if (!targetEmbedding) {
      return [];
    }

    const similarities: Array<{ path: string; similarity: number }> = [];
    
    for (const [path, embedding] of this.embeddings.entries()) {
      if (path !== targetFile) {
        const similarity = this.cosineSimilarity(targetEmbedding, embedding);
        if (similarity > 0.8) { // High similarity threshold
          similarities.push({ path, similarity });
        }
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .map(s => s.path);
  }

  /**
   * Advanced duplicate detection with multiple algorithms
   */
  async detectDuplicates(files: Array<{ name: string; path: string; size: number; modified: Date }>): Promise<Array<{ original: string; duplicates: string[]; confidence: number }>> {
    const duplicateGroups: Array<{ original: string; duplicates: string[]; confidence: number }> = [];
    const processed = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      if (processed.has(files[i].path)) continue;

      const currentFile = files[i];
      const potentialDuplicates: Array<{ path: string; confidence: number }> = [];

      for (let j = i + 1; j < files.length; j++) {
        if (processed.has(files[j].path)) continue;

        const compareFile = files[j];
        let confidence = 0;

        // Size-based similarity
        if (currentFile.size === compareFile.size) {
          confidence += 0.4;
        }

        // Name-based similarity
        const nameSimilarity = this.calculateStringSimilarity(currentFile.name, compareFile.name);
        confidence += nameSimilarity * 0.3;

        // Extension match
        const ext1 = currentFile.name.split('.').pop()?.toLowerCase();
        const ext2 = compareFile.name.split('.').pop()?.toLowerCase();
        if (ext1 === ext2) {
          confidence += 0.2;
        }

        // Semantic similarity (if embeddings exist)
        const embedding1 = this.embeddings.get(currentFile.path);
        const embedding2 = this.embeddings.get(compareFile.path);
        if (embedding1 && embedding2) {
          const semanticSim = this.cosineSimilarity(embedding1, embedding2);
          confidence += semanticSim * 0.1;
        }

        if (confidence > 0.7) {
          potentialDuplicates.push({ path: compareFile.path, confidence });
        }
      }

      if (potentialDuplicates.length > 0) {
        const avgConfidence = potentialDuplicates.reduce((sum, d) => sum + d.confidence, 0) / potentialDuplicates.length;
        duplicateGroups.push({
          original: currentFile.path,
          duplicates: potentialDuplicates.map(d => d.path),
          confidence: avgConfidence
        });
        
        potentialDuplicates.forEach(d => processed.add(d.path));
      }
      
      processed.add(currentFile.path);
    }

    return duplicateGroups;
  }

  /**
   * Intelligent file categorization with confidence scoring
   */
  async categorizeFiles(files: Array<{ name: string; path: string; size: number; type: string }>): Promise<Array<{ category: string; files: string[]; confidence: number; description: string }>> {
    const categories: Map<string, { files: string[]; confidence: number[]; description: string }> = new Map();

    for (const file of files) {
      try {
        const analysis = await this.analyzeFileContent(file.path);
        
        if (!categories.has(analysis.category)) {
          categories.set(analysis.category, {
            files: [],
            confidence: [],
            description: `Files categorized as ${analysis.category}`
          });
        }
        
        const categoryData = categories.get(analysis.category)!;
        categoryData.files.push(file.path);
        categoryData.confidence.push(analysis.confidence);
      } catch (error) {
        console.warn(`Failed to categorize ${file.path}:`, error);
      }
    }

    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      files: data.files,
      confidence: data.confidence.reduce((sum, c) => sum + c, 0) / data.confidence.length,
      description: data.description
    }));
  }

  /**
   * Natural language file operations parser
   */
  async parseNaturalLanguageOperation(command: string, availableFiles: string[]): Promise<{
    operation: 'search' | 'move' | 'copy' | 'delete' | 'rename' | 'organize' | 'analyze';
    parameters: any;
    targetFiles: string[];
    confidence: number;
    safetyLevel: 'safe' | 'caution' | 'dangerous';
    explanation: string;
  }> {
    const prompt = `
    Parse this natural language file operation command and extract structured information:
    
    Command: "${command}"
    Available files: ${availableFiles.slice(0, 20).join(', ')}${availableFiles.length > 20 ? '...' : ''}
    
    Determine:
    1. Primary operation (search, move, copy, delete, rename, organize, analyze)
    2. Target files (specific files or criteria)
    3. Operation parameters (destination, criteria, new names, etc.)
    4. Safety level (safe, caution, dangerous)
    5. Confidence in interpretation (0-1)
    
    Return JSON format:
    {
      "operation": "...",
      "parameters": {...},
      "targetFiles": [...],
      "confidence": 0.9,
      "safetyLevel": "safe",
      "explanation": "..."
    }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        operation: result.operation || 'search',
        parameters: result.parameters || {},
        targetFiles: result.targetFiles || [],
        confidence: result.confidence || 0.5,
        safetyLevel: result.safetyLevel || 'safe',
        explanation: result.explanation || 'Operation parsed successfully'
      };
    } catch (error) {
      console.error('Natural language parsing failed:', error);
      return {
        operation: 'search',
        parameters: { query: command },
        targetFiles: [],
        confidence: 0.3,
        safetyLevel: 'safe',
        explanation: 'Fallback to basic search operation'
      };
    }
  }

  /**
   * Generate intelligent file name suggestions
   */
  async suggestFileName(fileContent: string, currentName: string): Promise<string[]> {
    const prompt = `
    Based on this file content and current name, suggest better, more descriptive file names:
    
    Current name: ${currentName}
    Content preview: ${fileContent.substring(0, 500)}...
    
    Suggest 3-5 alternative names that are:
    1. Descriptive and clear
    2. Professional and organized
    3. Easy to search and find
    4. Follow good naming conventions
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      });

      const suggestions = this.parseFileNameSuggestions(response.choices[0]?.message?.content || '');
      return suggestions;
    } catch (error) {
      console.error('Failed to generate file name suggestions:', error);
      return [];
    }
  }

  // Helper methods
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private async explainSemanticMatch(query: string, filePath: string, similarity: number): Promise<string> {
    const confidence = similarity > 0.9 ? 'Very high' : similarity > 0.7 ? 'High' : similarity > 0.5 ? 'Medium' : 'Low';
    return `${confidence} semantic similarity (${Math.round(similarity * 100)}%) - likely related to "${query}"`;
  }

  private isImageFile(extension: string): boolean {
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(extension);
  }

  private isTextFile(extension: string): boolean {
    return ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.js', '.ts', '.html', '.css'].includes(extension);
  }

  private async analyzeImageFile(filePath: string, fileContent: Buffer): Promise<FileAnalysis> {
    const base64Image = fileContent.toString('base64');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and provide a summary, category, and relevant tags for file organization.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.3
    });

    return this.parseAnalysisResponse(response.choices[0]?.message?.content || '');
  }

  private async analyzeTextFile(filePath: string, content: string): Promise<FileAnalysis> {
    const prompt = `
    Analyze this file content and provide:
    1. A brief summary
    2. Appropriate category
    3. Relevant tags for organization
    4. A suggested better file name if current name is unclear
    
    File: ${filePath}
    Content: ${content.substring(0, 2000)}...
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    return this.parseAnalysisResponse(response.choices[0]?.message?.content || '');
  }

  private async analyzeFileByName(filePath: string): Promise<FileAnalysis> {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'user',
          content: `Based on this filename "${fileName}", suggest what category it might belong to and provide relevant tags for organization.`
        }
      ],
      temperature: 0.3
    });

    return this.parseAnalysisResponse(response.choices[0]?.message?.content || '');
  }

  private parseAnalysisResponse(content: string): FileAnalysis {
    // Simple parsing logic - in a real implementation, you'd want more robust parsing
    const lines = content.split('\n');
    let summary = '';
    let category = 'general';
    let tags: string[] = [];
    
    for (const line of lines) {
      if (line.toLowerCase().includes('summary:')) {
        summary = line.split(':')[1]?.trim() || '';
      } else if (line.toLowerCase().includes('category:')) {
        category = line.split(':')[1]?.trim() || 'general';
      } else if (line.toLowerCase().includes('tags:')) {
        const tagString = line.split(':')[1]?.trim() || '';
        tags = tagString.split(',').map(tag => tag.trim());
      }
    }

    return {
      filename: '', // Will be set by caller
      filePath: '', // Will be set by caller
      summary: summary || 'File analysis completed',
      category,
      tags,
      confidence: 0.8
    };
  }

  private parseSuggestions(content: string): SmartOrganizationSuggestion[] {
    // Simplified parsing - you'd want more sophisticated parsing in production
    return [
      {
        action: 'categorize',
        files: [],
        reason: content.substring(0, 200) + '...',
        confidence: 0.7
      }
    ];
  }

  private parseFileNameSuggestions(content: string): string[] {
    // Extract suggested names from AI response
    const lines = content.split('\n');
    const suggestions: string[] = [];
    
    for (const line of lines) {
      if (line.includes('1.') || line.includes('2.') || line.includes('3.') || 
          line.includes('4.') || line.includes('5.') || line.includes('-')) {
        const suggestion = line.replace(/^\d+\.|\-/, '').trim();
        if (suggestion && !suggestion.toLowerCase().includes('suggestion')) {
          suggestions.push(suggestion);
        }
      }
    }
    
    return suggestions.slice(0, 5);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }
}
