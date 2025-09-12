/**
 * Search History Service for Smart AI File Explorer
 * Manages search history, favorites, and smart suggestions
 */

export interface SearchHistoryItem {
  id: string;
  query: string;
  searchMode: 'basic' | 'semantic' | 'advanced';
  timestamp: Date;
  path: string;
  resultsCount: number;
  executionTime: number;
  isFavorite: boolean;
  tags: string[];
  success: boolean;
}

export interface SearchSuggestion {
  query: string;
  confidence: number;
  category: 'recent' | 'popular' | 'similar' | 'ai-generated';
  metadata?: {
    usage_count?: number;
    last_used?: Date;
    related_queries?: string[];
  };
}

export interface SearchStatistics {
  totalSearches: number;
  successRate: number;
  averageExecutionTime: number;
  mostUsedMode: 'basic' | 'semantic' | 'advanced';
  popularQueries: Array<{ query: string; count: number }>;
  searchesByDay: Array<{ date: string; count: number }>;
  searchesByPath: Array<{ path: string; count: number }>;
}

export class SearchHistoryService {
  private history: SearchHistoryItem[] = [];
  private readonly STORAGE_KEY = 'smart-file-explorer-search-history';
  private readonly MAX_HISTORY_ITEMS = 200;
  private readonly MAX_SUGGESTIONS = 10;

  constructor() {
    this.loadHistory();
  }

  /**
   * Add a new search to history
   */
  addSearchToHistory(params: {
    query: string;
    searchMode: 'basic' | 'semantic' | 'advanced';
    path: string;
    resultsCount: number;
    executionTime: number;
    success?: boolean;
    tags?: string[];
  }): void {
    const searchItem: SearchHistoryItem = {
      id: this.generateId(),
      query: params.query.trim(),
      searchMode: params.searchMode,
      timestamp: new Date(),
      path: params.path,
      resultsCount: params.resultsCount,
      executionTime: params.executionTime,
      isFavorite: false,
      tags: params.tags || [],
      success: params.success !== false
    };

    // Remove duplicate recent searches
    this.history = this.history.filter(item => 
      !(item.query === searchItem.query && 
        item.path === searchItem.path && 
        item.searchMode === searchItem.searchMode)
    );

    // Add to beginning
    this.history.unshift(searchItem);

    // Limit history size
    if (this.history.length > this.MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(0, this.MAX_HISTORY_ITEMS);
    }

    this.saveHistory();
  }

  /**
   * Get search history with filtering options
   */
  getHistory(options?: {
    limit?: number;
    searchMode?: 'basic' | 'semantic' | 'advanced';
    path?: string;
    favorites?: boolean;
    query?: string;
    dateRange?: { from: Date; to: Date };
  }): SearchHistoryItem[] {
    let filtered = [...this.history];

    if (options) {
      if (options.searchMode) {
        filtered = filtered.filter(item => item.searchMode === options.searchMode);
      }

      if (options.path) {
        filtered = filtered.filter(item => item.path === options.path);
      }

      if (options.favorites) {
        filtered = filtered.filter(item => item.isFavorite);
      }

      if (options.query) {
        const queryLower = options.query.toLowerCase();
        filtered = filtered.filter(item => 
          item.query.toLowerCase().includes(queryLower) ||
          item.tags.some(tag => tag.toLowerCase().includes(queryLower))
        );
      }

      if (options.dateRange) {
        filtered = filtered.filter(item => 
          item.timestamp >= options.dateRange!.from && 
          item.timestamp <= options.dateRange!.to
        );
      }

      if (options.limit) {
        filtered = filtered.slice(0, options.limit);
      }
    }

    return filtered;
  }

  /**
   * Toggle favorite status of a search item
   */
  toggleFavorite(searchId: string): boolean {
    const item = this.history.find(h => h.id === searchId);
    if (item) {
      item.isFavorite = !item.isFavorite;
      this.saveHistory();
      return item.isFavorite;
    }
    return false;
  }

  /**
   * Remove search item from history
   */
  removeFromHistory(searchId: string): boolean {
    const initialLength = this.history.length;
    this.history = this.history.filter(item => item.id !== searchId);
    
    if (this.history.length < initialLength) {
      this.saveHistory();
      return true;
    }
    return false;
  }

  /**
   * Clear all history (with optional filters)
   */
  clearHistory(options?: {
    keepFavorites?: boolean;
    olderThan?: Date;
    searchMode?: 'basic' | 'semantic' | 'advanced';
  }): number {
    const initialLength = this.history.length;

    if (!options) {
      this.history = [];
    } else {
      let filtered = this.history;

      if (options.keepFavorites) {
        filtered = filtered.filter(item => item.isFavorite);
      } else {
        filtered = [];
      }

      if (options.olderThan) {
        filtered = this.history.filter(item => 
          item.timestamp > options.olderThan! || item.isFavorite
        );
      }

      if (options.searchMode) {
        filtered = this.history.filter(item => 
          item.searchMode !== options.searchMode! || item.isFavorite
        );
      }

      this.history = filtered;
    }

    this.saveHistory();
    return initialLength - this.history.length;
  }

  /**
   * Get smart search suggestions based on history
   */
  getSuggestions(currentQuery?: string, currentPath?: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = currentQuery?.toLowerCase() || '';

    // Recent searches (last 10)
    const recent = this.getHistory({ limit: 10 })
      .filter(item => !queryLower || item.query.toLowerCase().includes(queryLower))
      .slice(0, 5);

    recent.forEach(item => {
      suggestions.push({
        query: item.query,
        confidence: 0.8,
        category: 'recent',
        metadata: {
          last_used: item.timestamp,
          related_queries: []
        }
      });
    });

    // Popular queries (most frequent)
    const queryFrequency = new Map<string, number>();
    this.history.forEach(item => {
      const query = item.query.toLowerCase();
      queryFrequency.set(query, (queryFrequency.get(query) || 0) + 1);
    });

    const popular = Array.from(queryFrequency.entries())
      .filter(([query]) => !queryLower || query.includes(queryLower))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    popular.forEach(([query, count]) => {
      if (!suggestions.some(s => s.query.toLowerCase() === query)) {
        suggestions.push({
          query: query,
          confidence: Math.min(0.9, 0.6 + (count / 20)),
          category: 'popular',
          metadata: {
            usage_count: count
          }
        });
      }
    });

    // Similar queries (basic string matching)
    if (currentQuery && currentQuery.length > 2) {
      const similar = this.history
        .filter(item => this.calculateSimilarity(item.query, currentQuery) > 0.6)
        .filter(item => item.query !== currentQuery)
        .slice(0, 3);

      similar.forEach(item => {
        if (!suggestions.some(s => s.query === item.query)) {
          suggestions.push({
            query: item.query,
            confidence: 0.7,
            category: 'similar',
            metadata: {
              last_used: item.timestamp
            }
          });
        }
      });
    }

    // AI-generated suggestions (based on patterns)
    const aiSuggestions = this.generateAISuggestions(currentQuery, currentPath);
    aiSuggestions.forEach(suggestion => {
      if (!suggestions.some(s => s.query === suggestion.query)) {
        suggestions.push(suggestion);
      }
    });

    // Sort by confidence and limit
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.MAX_SUGGESTIONS);
  }

  /**
   * Get search statistics
   */
  getStatistics(): SearchStatistics {
    const total = this.history.length;
    
    if (total === 0) {
      return {
        totalSearches: 0,
        successRate: 0,
        averageExecutionTime: 0,
        mostUsedMode: 'basic',
        popularQueries: [],
        searchesByDay: [],
        searchesByPath: []
      };
    }

    const successful = this.history.filter(item => item.success).length;
    const successRate = successful / total;

    const totalExecutionTime = this.history.reduce((sum, item) => sum + item.executionTime, 0);
    const averageExecutionTime = totalExecutionTime / total;

    // Most used search mode
    const modeCount = { basic: 0, semantic: 0, advanced: 0 };
    this.history.forEach(item => {
      modeCount[item.searchMode]++;
    });
    const mostUsedMode = Object.entries(modeCount)
      .sort(([, a], [, b]) => b - a)[0][0] as 'basic' | 'semantic' | 'advanced';

    // Popular queries
    const queryCount = new Map<string, number>();
    this.history.forEach(item => {
      const query = item.query.toLowerCase();
      queryCount.set(query, (queryCount.get(query) || 0) + 1);
    });
    const popularQueries = Array.from(queryCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Searches by day (last 30 days)
    const dayCount = new Map<string, number>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.history
      .filter(item => item.timestamp > thirtyDaysAgo)
      .forEach(item => {
        const day = item.timestamp.toISOString().split('T')[0];
        dayCount.set(day, (dayCount.get(day) || 0) + 1);
      });

    const searchesByDay = Array.from(dayCount.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Searches by path
    const pathCount = new Map<string, number>();
    this.history.forEach(item => {
      const path = item.path;
      pathCount.set(path, (pathCount.get(path) || 0) + 1);
    });
    const searchesByPath = Array.from(pathCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    return {
      totalSearches: total,
      successRate,
      averageExecutionTime,
      mostUsedMode,
      popularQueries,
      searchesByDay,
      searchesByPath
    };
  }

  /**
   * Export search history
   */
  exportHistory(): string {
    return JSON.stringify({
      history: this.history,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Import search history
   */
  async importHistory(data: string, mergeWithExisting: boolean = true): Promise<boolean> {
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.history || !Array.isArray(parsed.history)) {
        return false;
      }

      const importedItems = parsed.history.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })) as SearchHistoryItem[];

      if (mergeWithExisting) {
        // Merge with existing, avoiding duplicates
        const existingQueries = new Set(
          this.history.map(item => `${item.query}_${item.path}_${item.timestamp.getTime()}`)
        );

        const newItems = importedItems.filter(item => 
          !existingQueries.has(`${item.query}_${item.path}_${new Date(item.timestamp).getTime()}`)
        );

        this.history = [...this.history, ...newItems];
      } else {
        this.history = importedItems;
      }

      // Sort by timestamp and limit
      this.history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      if (this.history.length > this.MAX_HISTORY_ITEMS) {
        this.history = this.history.slice(0, this.MAX_HISTORY_ITEMS);
      }

      this.saveHistory();
      return true;
    } catch (error) {
      console.error('Failed to import search history:', error);
      return false;
    }
  }

  // Private methods

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.history = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }

  private generateId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
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

  private generateAISuggestions(currentQuery?: string, currentPath?: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // Common file type searches
    const fileTypes = ['pdf', 'jpg', 'png', 'mp4', 'mp3', 'doc', 'txt', 'zip'];
    if (!currentQuery || currentQuery.length < 3) {
      fileTypes.forEach(type => {
        suggestions.push({
          query: `find ${type} files`,
          confidence: 0.6,
          category: 'ai-generated'
        });
      });
    }

    // Size-based searches
    const sizeSuggestions = [
      'find large files',
      'show files larger than 100MB',
      'find small files'
    ];

    if (!currentQuery || ['large', 'size', 'big', 'small'].some(word => 
      currentQuery.toLowerCase().includes(word))) {
      sizeSuggestions.forEach(query => {
        suggestions.push({
          query,
          confidence: 0.5,
          category: 'ai-generated'
        });
      });
    }

    // Time-based searches
    const timeSuggestions = [
      'find recent files',
      'show files from today',
      'find files from this week',
      'show old files'
    ];

    if (!currentQuery || ['recent', 'today', 'week', 'old', 'new'].some(word => 
      currentQuery.toLowerCase().includes(word))) {
      timeSuggestions.forEach(query => {
        suggestions.push({
          query,
          confidence: 0.5,
          category: 'ai-generated'
        });
      });
    }

    return suggestions.slice(0, 3);
  }
}

// Singleton instance
let searchHistoryInstance: SearchHistoryService | null = null;

export const getSearchHistoryService = (): SearchHistoryService => {
  if (!searchHistoryInstance) {
    searchHistoryInstance = new SearchHistoryService();
  }
  return searchHistoryInstance;
};
