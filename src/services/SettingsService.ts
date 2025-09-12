/**
 * Settings Service for Smart AI File Explorer
 * Manages user preferences, AI configuration, and app settings with persistence
 */

export interface AISettings {
  openaiApiKey: string;
  model: 'gpt-4' | 'gpt-4-turbo-preview' | 'gpt-3.5-turbo';
  maxTokens: number;
  temperature: number;
  enableSemanticSearch: boolean;
  enableFileAnalysis: boolean;
  enableAdvancedFeatures: boolean;
  cacheDuration: number; // in minutes
  batchSize: number;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showFileIcons: boolean;
  showDetailedView: boolean;
  animationsEnabled: boolean;
  defaultSearchMode: 'basic' | 'semantic' | 'advanced';
  showAdvancedOptionsByDefault: boolean;
  autoFocusSearchInput: boolean;
}

export interface FileOperationSettings {
  confirmBeforeDelete: boolean;
  confirmBeforeMove: boolean;
  confirmBeforeBatchOps: boolean;
  maxBatchSize: number;
  createBackupOnMove: boolean;
  showOperationPreview: boolean;
  defaultDestination: string;
  recursiveSearch: boolean;
  followSymlinks: boolean;
  maxSearchDepth: number;
  excludeHiddenFiles: boolean;
  excludeSystemFiles: boolean;
}

export interface SearchSettings {
  maxResults: number;
  searchTimeout: number; // in seconds
  enableSearchHistory: boolean;
  maxHistoryItems: number;
  enableSmartSuggestions: boolean;
  caseSensitiveSearch: boolean;
  enableRegexSearch: boolean;
  autoSaveSearches: boolean;
  defaultFilters: {
    fileTypes: string[];
    sizeRange: { min?: number; max?: number };
    dateRange: { days?: number };
  };
}

export interface AdvancedSettings {
  enableLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enablePerformanceMetrics: boolean;
  autoUpdates: boolean;
  enableTelemetry: boolean;
  experimentalFeatures: boolean;
  cacheSize: number; // in MB
  maxConcurrentOperations: number;
  enableMemoryOptimization: boolean;
}

export interface AppSettings {
  ai: AISettings;
  ui: UISettings;
  fileOperations: FileOperationSettings;
  search: SearchSettings;
  advanced: AdvancedSettings;
  version: string;
  lastModified: Date;
}

const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    openaiApiKey: '',
    model: 'gpt-4-turbo-preview',
    maxTokens: 2000,
    temperature: 0.1,
    enableSemanticSearch: true,
    enableFileAnalysis: true,
    enableAdvancedFeatures: true,
    cacheDuration: 60,
    batchSize: 10
  },
  ui: {
    theme: 'auto',
    compactMode: false,
    showFileIcons: true,
    showDetailedView: true,
    animationsEnabled: true,
    defaultSearchMode: 'basic',
    showAdvancedOptionsByDefault: false,
    autoFocusSearchInput: true
  },
  fileOperations: {
    confirmBeforeDelete: true,
    confirmBeforeMove: false,
    confirmBeforeBatchOps: true,
    maxBatchSize: 100,
    createBackupOnMove: false,
    showOperationPreview: true,
    defaultDestination: '',
    recursiveSearch: true,
    followSymlinks: false,
    maxSearchDepth: 5,
    excludeHiddenFiles: true,
    excludeSystemFiles: true
  },
  search: {
    maxResults: 500,
    searchTimeout: 30,
    enableSearchHistory: true,
    maxHistoryItems: 50,
    enableSmartSuggestions: true,
    caseSensitiveSearch: false,
    enableRegexSearch: false,
    autoSaveSearches: true,
    defaultFilters: {
      fileTypes: [],
      sizeRange: {},
      dateRange: {}
    }
  },
  advanced: {
    enableLogging: true,
    logLevel: 'info',
    enablePerformanceMetrics: false,
    autoUpdates: true,
    enableTelemetry: false,
    experimentalFeatures: false,
    cacheSize: 100,
    maxConcurrentOperations: 5,
    enableMemoryOptimization: true
  },
  version: '1.0.0',
  lastModified: new Date()
};

export class SettingsService {
  private settings: AppSettings;
  private listeners: Map<string, ((settings: AppSettings) => void)[]> = new Map();
  private readonly STORAGE_KEY = 'smart-file-explorer-settings';

  constructor() {
    this.settings = this.loadSettings();
    this.validateSettings();
  }

  /**
   * Get current settings
   */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Get specific section of settings
   */
  getAISettings(): AISettings {
    return { ...this.settings.ai };
  }

  getUISettings(): UISettings {
    return { ...this.settings.ui };
  }

  getFileOperationSettings(): FileOperationSettings {
    return { ...this.settings.fileOperations };
  }

  getSearchSettings(): SearchSettings {
    return { ...this.settings.search };
  }

  getAdvancedSettings(): AdvancedSettings {
    return { ...this.settings.advanced };
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings: Partial<AppSettings>): Promise<void> {
    const updatedSettings = {
      ...this.settings,
      ...newSettings,
      lastModified: new Date()
    };

    // Validate the new settings
    if (this.validatePartialSettings(newSettings)) {
      this.settings = updatedSettings;
      await this.saveSettings();
      this.notifyListeners('settings', this.settings);
    }
  }

  async updateAISettings(aiSettings: Partial<AISettings>): Promise<void> {
    const updatedAI = { ...this.settings.ai, ...aiSettings };
    await this.updateSettings({ ai: updatedAI });
    this.notifyListeners('ai', this.settings);
  }

  async updateUISettings(uiSettings: Partial<UISettings>): Promise<void> {
    const updatedUI = { ...this.settings.ui, ...uiSettings };
    await this.updateSettings({ ui: updatedUI });
    this.notifyListeners('ui', this.settings);
  }

  async updateFileOperationSettings(fileSettings: Partial<FileOperationSettings>): Promise<void> {
    const updatedFileOps = { ...this.settings.fileOperations, ...fileSettings };
    await this.updateSettings({ fileOperations: updatedFileOps });
    this.notifyListeners('fileOperations', this.settings);
  }

  async updateSearchSettings(searchSettings: Partial<SearchSettings>): Promise<void> {
    const updatedSearch = { ...this.settings.search, ...searchSettings };
    await this.updateSettings({ search: updatedSearch });
    this.notifyListeners('search', this.settings);
  }

  async updateAdvancedSettings(advancedSettings: Partial<AdvancedSettings>): Promise<void> {
    const updatedAdvanced = { ...this.settings.advanced, ...advancedSettings };
    await this.updateSettings({ advanced: updatedAdvanced });
    this.notifyListeners('advanced', this.settings);
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, lastModified: new Date() };
    await this.saveSettings();
    this.notifyListeners('settings', this.settings);
  }

  async resetSection(section: keyof Pick<AppSettings, 'ai' | 'ui' | 'fileOperations' | 'search' | 'advanced'>): Promise<void> {
    const defaultSection = DEFAULT_SETTINGS[section];
    await this.updateSettings({ [section]: defaultSection });
  }

  /**
   * Export/Import settings
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  async importSettings(settingsJson: string): Promise<boolean> {
    try {
      const importedSettings = JSON.parse(settingsJson) as AppSettings;
      
      if (this.validateSettings(importedSettings)) {
        this.settings = {
          ...importedSettings,
          lastModified: new Date()
        };
        await this.saveSettings();
        this.notifyListeners('settings', this.settings);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Event listeners
   */
  addEventListener(event: string, listener: (settings: AppSettings) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  removeEventListener(event: string, listener: (settings: AppSettings) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Utility methods
   */
  isAIConfigured(): boolean {
    return Boolean(this.settings.ai.openaiApiKey && this.settings.ai.openaiApiKey !== '');
  }

  getTheme(): 'light' | 'dark' {
    if (this.settings.ui.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.settings.ui.theme;
  }

  shouldConfirmOperation(operation: 'delete' | 'move' | 'batchOps'): boolean {
    switch (operation) {
      case 'delete': return this.settings.fileOperations.confirmBeforeDelete;
      case 'move': return this.settings.fileOperations.confirmBeforeMove;
      case 'batchOps': return this.settings.fileOperations.confirmBeforeBatchOps;
      default: return true;
    }
  }

  /**
   * Private methods
   */
  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppSettings;
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private async saveSettings(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings to local storage');
    }
  }

  private mergeWithDefaults(stored: Partial<AppSettings>): AppSettings {
    return {
      ai: { ...DEFAULT_SETTINGS.ai, ...stored.ai },
      ui: { ...DEFAULT_SETTINGS.ui, ...stored.ui },
      fileOperations: { ...DEFAULT_SETTINGS.fileOperations, ...stored.fileOperations },
      search: { ...DEFAULT_SETTINGS.search, ...stored.search },
      advanced: { ...DEFAULT_SETTINGS.advanced, ...stored.advanced },
      version: stored.version || DEFAULT_SETTINGS.version,
      lastModified: stored.lastModified ? new Date(stored.lastModified) : new Date()
    };
  }

  private validateSettings(settings: AppSettings = this.settings): boolean {
    try {
      // Validate AI settings
      if (settings.ai.temperature < 0 || settings.ai.temperature > 2) return false;
      if (settings.ai.maxTokens < 1 || settings.ai.maxTokens > 4000) return false;
      if (settings.ai.cacheDuration < 0) return false;
      if (settings.ai.batchSize < 1 || settings.ai.batchSize > 100) return false;

      // Validate file operation settings
      if (settings.fileOperations.maxBatchSize < 1) return false;
      if (settings.fileOperations.maxSearchDepth < 1) return false;

      // Validate search settings
      if (settings.search.maxResults < 1) return false;
      if (settings.search.searchTimeout < 1) return false;
      if (settings.search.maxHistoryItems < 0) return false;

      // Validate advanced settings
      if (settings.advanced.cacheSize < 1) return false;
      if (settings.advanced.maxConcurrentOperations < 1) return false;

      return true;
    } catch (error) {
      console.error('Settings validation failed:', error);
      return false;
    }
  }

  private validatePartialSettings(settings: Partial<AppSettings>): boolean {
    // Create a temporary merged settings object for validation
    const tempSettings = { ...this.settings, ...settings };
    return this.validateSettings(tempSettings);
  }

  private notifyListeners(event: string, settings: AppSettings): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(settings);
        } catch (error) {
          console.error('Settings listener error:', error);
        }
      });
    }
  }
}

// Singleton instance
let settingsInstance: SettingsService | null = null;

export const getSettingsService = (): SettingsService => {
  if (!settingsInstance) {
    settingsInstance = new SettingsService();
  }
  return settingsInstance;
};
