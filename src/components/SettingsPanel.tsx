import React, { useState, useEffect } from 'react';
import { 
  AppSettings, 
  AISettings, 
  UISettings, 
  FileOperationSettings, 
  SearchSettings, 
  AdvancedSettings,
  SettingsService 
} from '../services/SettingsService';

interface SettingsPanelProps {
  settingsService: SettingsService;
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

type SettingsTab = 'ai' | 'ui' | 'fileOps' | 'search' | 'advanced';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settingsService,
  isOpen,
  onClose,
  onSettingsChange
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const currentSettings = settingsService.getSettings();
      setSettings(currentSettings);
      setTempSettings(currentSettings);
      setHasChanges(false);
      setValidationErrors({});
    }
  }, [isOpen, settingsService]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await settingsService.updateSettings(tempSettings);
      setSettings(tempSettings);
      setHasChanges(false);
      onSettingsChange?.(tempSettings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      setValidationErrors({ general: 'Failed to save settings. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTempSettings(settings);
    setHasChanges(false);
    setValidationErrors({});
    onClose();
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await settingsService.resetSettings();
        const defaultSettings = settingsService.getSettings();
        setSettings(defaultSettings);
        setTempSettings(defaultSettings);
        setHasChanges(false);
        onSettingsChange?.(defaultSettings);
      } catch (error) {
        console.error('Failed to reset settings:', error);
        setValidationErrors({ general: 'Failed to reset settings. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const updateTempSettings = <K extends keyof AppSettings>(
    section: K, 
    sectionSettings: Partial<AppSettings[K]>
  ) => {
    const updated = {
      ...tempSettings,
      [section]: { ...(tempSettings[section] as any), ...sectionSettings }
    };
    setTempSettings(updated);
    setHasChanges(JSON.stringify(updated) !== JSON.stringify(settings));
  };

  const validateField = (field: string, value: any, min?: number, max?: number): boolean => {
    const errors = { ...validationErrors };
    
    if (typeof value === 'number') {
      if (min !== undefined && value < min) {
        errors[field] = `Must be at least ${min}`;
        setValidationErrors(errors);
        return false;
      }
      if (max !== undefined && value > max) {
        errors[field] = `Must be at most ${max}`;
        setValidationErrors(errors);
        return false;
      }
    }
    
    if (typeof value === 'string' && value.trim() === '' && field.includes('required')) {
      errors[field] = 'This field is required';
      setValidationErrors(errors);
      return false;
    }

    delete errors[field];
    setValidationErrors(errors);
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">⚙️ Settings</h2>
              <p className="text-blue-100 text-sm">Configure your Smart AI File Explorer</p>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <span className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-medium">
                  Unsaved Changes
                </span>
              )}
              <button
                onClick={handleCancel}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-50 border-r overflow-y-auto">
            <div className="p-3">
              <nav className="space-y-1">
                {[
                  { id: 'ai', label: '🤖 AI Configuration', desc: 'OpenAI API and models' },
                  { id: 'ui', label: '🎨 User Interface', desc: 'Theme and appearance' },
                  { id: 'fileOps', label: '📁 File Operations', desc: 'Safety and behavior' },
                  { id: 'search', label: '🔍 Search Settings', desc: 'Results and history' },
                  { id: 'advanced', label: '⚙️ Advanced', desc: 'Performance and debug' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-medium">{tab.label}</div>
                    <div className={`text-xs ${activeTab === tab.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {tab.desc}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {validationErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="text-red-800 text-sm">{validationErrors.general}</div>
              </div>
            )}

            {/* AI Configuration Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🤖 AI Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        OpenAI API Key
                        {!tempSettings.ai.openaiApiKey && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="password"
                        value={tempSettings.ai.openaiApiKey}
                        onChange={(e) => {
                          updateTempSettings('ai', { openaiApiKey: e.target.value });
                          validateField('apiKey', e.target.value);
                        }}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Get your API key from <a href="https://platform.openai.com/" className="text-blue-500">platform.openai.com</a>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                        <select
                          value={tempSettings.ai.model}
                          onChange={(e) => updateTempSettings('ai', { model: e.target.value as AISettings['model'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="gpt-4-turbo-preview">GPT-4 Turbo (Recommended)</option>
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Tokens ({tempSettings.ai.maxTokens})
                        </label>
                        <input
                          type="range"
                          min="100"
                          max="4000"
                          value={tempSettings.ai.maxTokens}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateTempSettings('ai', { maxTokens: value });
                            validateField('maxTokens', value, 100, 4000);
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>100</span>
                          <span>4000</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temperature ({tempSettings.ai.temperature})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={tempSettings.ai.temperature}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            updateTempSettings('ai', { temperature: value });
                            validateField('temperature', value, 0, 2);
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Focused (0)</span>
                          <span>Creative (2)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Batch Size ({tempSettings.ai.batchSize})
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={tempSettings.ai.batchSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateTempSettings('ai', { batchSize: value });
                            validateField('batchSize', value, 1, 50);
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>1</span>
                          <span>50</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">AI Features</h4>
                      {[
                        { key: 'enableSemanticSearch', label: 'Enable Semantic Search', desc: 'Search by meaning using embeddings' },
                        { key: 'enableFileAnalysis', label: 'Enable File Analysis', desc: 'AI-powered file content analysis' },
                        { key: 'enableAdvancedFeatures', label: 'Enable Advanced Features', desc: 'Function calling and complex operations' }
                      ].map(feature => (
                        <label key={feature.key} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.ai[feature.key as keyof AISettings] as boolean}
                            onChange={(e) => updateTempSettings('ai', { [feature.key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">{feature.label}</div>
                            <div className="text-xs text-gray-500">{feature.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UI Settings Tab */}
            {activeTab === 'ui' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🎨 User Interface</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                        <select
                          value={tempSettings.ui.theme}
                          onChange={(e) => updateTempSettings('ui', { theme: e.target.value as UISettings['theme'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="auto">Auto (System)</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default Search Mode</label>
                        <select
                          value={tempSettings.ui.defaultSearchMode}
                          onChange={(e) => updateTempSettings('ui', { defaultSearchMode: e.target.value as UISettings['defaultSearchMode'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="basic">Basic Search</option>
                          <option value="semantic">Semantic Search</option>
                          <option value="advanced">Advanced AI</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Display Options</h4>
                      {[
                        { key: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing and use smaller elements' },
                        { key: 'showFileIcons', label: 'Show File Icons', desc: 'Display icons for different file types' },
                        { key: 'showDetailedView', label: 'Show Detailed View', desc: 'Display file size, date, and metadata' },
                        { key: 'animationsEnabled', label: 'Enable Animations', desc: 'Smooth transitions and effects' },
                        { key: 'showAdvancedOptionsByDefault', label: 'Show Advanced Options', desc: 'Display advanced tools by default' },
                        { key: 'autoFocusSearchInput', label: 'Auto-focus Search Input', desc: 'Automatically focus search field on startup' }
                      ].map(option => (
                        <label key={option.key} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.ui[option.key as keyof UISettings] as boolean}
                            onChange={(e) => updateTempSettings('ui', { [option.key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Operations Tab */}
            {activeTab === 'fileOps' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📁 File Operations</h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Safety Confirmations</h4>
                      {[
                        { key: 'confirmBeforeDelete', label: 'Confirm Before Delete', desc: 'Ask confirmation before deleting files' },
                        { key: 'confirmBeforeMove', label: 'Confirm Before Move', desc: 'Ask confirmation before moving files' },
                        { key: 'confirmBeforeBatchOps', label: 'Confirm Batch Operations', desc: 'Ask confirmation for operations on multiple files' },
                        { key: 'showOperationPreview', label: 'Show Operation Preview', desc: 'Preview what will happen before executing' },
                        { key: 'createBackupOnMove', label: 'Create Backup on Move', desc: 'Create backup before moving important files' }
                      ].map(option => (
                        <label key={option.key} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.fileOperations[option.key as keyof FileOperationSettings] as boolean}
                            onChange={(e) => updateTempSettings('fileOperations', { [option.key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Batch Size ({tempSettings.fileOperations.maxBatchSize})
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="1000"
                          value={tempSettings.fileOperations.maxBatchSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateTempSettings('fileOperations', { maxBatchSize: value });
                            validateField('maxBatchSize', value, 1, 1000);
                          }}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Search Depth ({tempSettings.fileOperations.maxSearchDepth})
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={tempSettings.fileOperations.maxSearchDepth}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateTempSettings('fileOperations', { maxSearchDepth: value });
                            validateField('maxSearchDepth', value, 1, 10);
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Search Behavior</h4>
                      {[
                        { key: 'recursiveSearch', label: 'Recursive Search', desc: 'Search in subdirectories' },
                        { key: 'followSymlinks', label: 'Follow Symbolic Links', desc: 'Follow symlinks during search' },
                        { key: 'excludeHiddenFiles', label: 'Exclude Hidden Files', desc: 'Skip hidden files in results' },
                        { key: 'excludeSystemFiles', label: 'Exclude System Files', desc: 'Skip system files in results' }
                      ].map(option => (
                        <label key={option.key} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.fileOperations[option.key as keyof FileOperationSettings] as boolean}
                            onChange={(e) => updateTempSettings('fileOperations', { [option.key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Settings Tab */}
            {activeTab === 'search' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Search Settings</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Results ({tempSettings.search.maxResults})
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="2000"
                          step="10"
                          value={tempSettings.search.maxResults}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateTempSettings('search', { maxResults: value });
                            validateField('maxResults', value, 10, 2000);
                          }}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Search Timeout ({tempSettings.search.searchTimeout}s)
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="120"
                          value={tempSettings.search.searchTimeout}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateTempSettings('search', { searchTimeout: value });
                            validateField('searchTimeout', value, 5, 120);
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max History Items ({tempSettings.search.maxHistoryItems})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={tempSettings.search.maxHistoryItems}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          updateTempSettings('search', { maxHistoryItems: value });
                          validateField('maxHistoryItems', value, 0, 200);
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Search Features</h4>
                      {[
                        { key: 'enableSearchHistory', label: 'Enable Search History', desc: 'Remember and suggest previous searches' },
                        { key: 'enableSmartSuggestions', label: 'Enable Smart Suggestions', desc: 'AI-powered search suggestions' },
                        { key: 'caseSensitiveSearch', label: 'Case Sensitive Search', desc: 'Distinguish between upper and lowercase' },
                        { key: 'enableRegexSearch', label: 'Enable Regex Search', desc: 'Support regular expression patterns' },
                        { key: 'autoSaveSearches', label: 'Auto-save Searches', desc: 'Automatically save search queries' }
                      ].map(option => (
                        <label key={option.key} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.search[option.key as keyof SearchSettings] as boolean}
                            onChange={(e) => updateTempSettings('search', { [option.key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Advanced Settings</h3>
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center">
                        <div className="text-yellow-600 mr-2">⚠️</div>
                        <div className="text-sm text-yellow-800">
                          These settings can affect app performance and stability. Change only if you know what you're doing.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Log Level</label>
                        <select
                          value={tempSettings.advanced.logLevel}
                          onChange={(e) => updateTempSettings('advanced', { logLevel: e.target.value as AdvancedSettings['logLevel'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="error">Error Only</option>
                          <option value="warn">Warning & Error</option>
                          <option value="info">Info, Warning & Error</option>
                          <option value="debug">All (Debug Mode)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cache Size ({tempSettings.advanced.cacheSize} MB)
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="1000"
                          step="10"
                          value={tempSettings.advanced.cacheSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateTempSettings('advanced', { cacheSize: value });
                            validateField('cacheSize', value, 10, 1000);
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Concurrent Operations ({tempSettings.advanced.maxConcurrentOperations})
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={tempSettings.advanced.maxConcurrentOperations}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          updateTempSettings('advanced', { maxConcurrentOperations: value });
                          validateField('maxConcurrentOperations', value, 1, 20);
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Advanced Features</h4>
                      {[
                        { key: 'enableLogging', label: 'Enable Logging', desc: 'Log application events for debugging' },
                        { key: 'enablePerformanceMetrics', label: 'Enable Performance Metrics', desc: 'Track and display performance data' },
                        { key: 'autoUpdates', label: 'Auto Updates', desc: 'Automatically check for and install updates' },
                        { key: 'enableTelemetry', label: 'Enable Telemetry', desc: 'Send anonymous usage data to improve the app' },
                        { key: 'experimentalFeatures', label: 'Experimental Features', desc: 'Enable beta features (may be unstable)' },
                        { key: 'enableMemoryOptimization', label: 'Memory Optimization', desc: 'Optimize memory usage for better performance' }
                      ].map(option => (
                        <label key={option.key} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced[option.key as keyof AdvancedSettings] as boolean}
                            onChange={(e) => updateTempSettings('advanced', { [option.key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Last modified: {settings.lastModified.toLocaleString()}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !hasChanges || Object.keys(validationErrors).length > 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
