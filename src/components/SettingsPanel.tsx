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
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">🤖</span>
                    AI Provider Configuration
                  </h3>
                  <div className="space-y-4">
                    {/* API Key Section */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-700">OpenAI API Configuration</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tempSettings.ai.openaiApiKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tempSettings.ai.openaiApiKey ? '✓ Connected' : '⚠ Not Configured'}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key {!tempSettings.ai.openaiApiKey && <span className="text-red-500">*</span>}
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              value={tempSettings.ai.openaiApiKey}
                              onChange={(e) => {
                                updateTempSettings('ai', { openaiApiKey: e.target.value });
                                validateField('apiKey', e.target.value);
                              }}
                              placeholder="sk-proj-..."
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {tempSettings.ai.openaiApiKey ? (
                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Model Configuration */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="text-purple-600 mr-2">⚙️</span>
                        Model & Performance Settings
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
                          <select
                            value={tempSettings.ai.model}
                            onChange={(e) => updateTempSettings('ai', { model: e.target.value as AISettings['model'] })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="gpt-4-turbo-preview">🚀 GPT-4 Turbo (Recommended)</option>
                            <option value="gpt-4">🧠 GPT-4 (Most Accurate)</option>
                            <option value="gpt-3.5-turbo">⚡ GPT-3.5 Turbo (Fastest)</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {tempSettings.ai.model === 'gpt-4-turbo-preview' && 'Best balance of speed and intelligence'}
                            {tempSettings.ai.model === 'gpt-4' && 'Highest quality but slower responses'}
                            {tempSettings.ai.model === 'gpt-3.5-turbo' && 'Fastest responses, good for simple tasks'}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Tokens: {tempSettings.ai.maxTokens}
                          </label>
                          <input
                            type="range"
                            min="100"
                            max="4000"
                            step="100"
                            value={tempSettings.ai.maxTokens}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              updateTempSettings('ai', { maxTokens: value });
                              validateField('maxTokens', value, 100, 4000);
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Higher values allow longer responses but cost more
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Features Configuration */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="text-green-600 mr-2">✨</span>
                        AI-Powered Features
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium text-gray-700">Enable Advanced Features</label>
                            <p className="text-sm text-gray-500">Contextual actions, smart suggestions, and file analysis</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tempSettings.ai.enableAdvancedFeatures}
                              onChange={(e) => updateTempSettings('ai', { enableAdvancedFeatures: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium text-gray-700">Smart File Analysis</label>
                            <p className="text-sm text-gray-500">Analyze file content for better suggestions</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tempSettings.ai.enableSmartAnalysis}
                              onChange={(e) => updateTempSettings('ai', { enableSmartAnalysis: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium text-gray-700">Auto-Retry on Errors</label>
                            <p className="text-sm text-gray-500">Automatically retry failed AI requests</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tempSettings.ai.enableAutoRetry}
                              onChange={(e) => updateTempSettings('ai', { enableAutoRetry: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UI Settings Tab */}
            {activeTab === 'ui' && (
              <div className="space-y-6">
                <div className="bg-pink-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">🎨</span>
                    Appearance & Interface
                  </h3>
                  
                  {/* Theme Configuration */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-blue-600 mr-2">🌟</span>
                      Theme Settings
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Color Theme</label>
                        <select
                          value={tempSettings.ui.theme}
                          onChange={(e) => updateTempSettings('ui', { theme: e.target.value as UISettings['theme'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="auto">🌍 Auto (Follow System)</option>
                          <option value="light">☀️ Light Theme</option>
                          <option value="dark">🌙 Dark Theme</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                        <select
                          value={tempSettings.ui.accentColor}
                          onChange={(e) => updateTempSettings('ui', { accentColor: e.target.value as UISettings['accentColor'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="blue">🔵 Blue (Default)</option>
                          <option value="purple">🔮 Purple</option>
                          <option value="green">🟢 Green</option>
                          <option value="orange">🟠 Orange</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">UI Density</label>
                        <select
                          value={tempSettings.ui.density}
                          onChange={(e) => updateTempSettings('ui', { density: e.target.value as UISettings['density'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="comfortable">📏 Comfortable</option>
                          <option value="compact">📊 Compact</option>
                          <option value="spacious">🗃 Spacious</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Display Options */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-purple-600 mr-2">🖼️</span>
                      Display Options
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Show File Extensions</label>
                          <p className="text-sm text-gray-500">Always display file extensions in lists</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.ui.showFileExtensions}
                            onChange={(e) => updateTempSettings('ui', { showFileExtensions: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Show Hidden Files</label>
                          <p className="text-sm text-gray-500">Display files and folders that start with a dot</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.ui.showHiddenFiles}
                            onChange={(e) => updateTempSettings('ui', { showHiddenFiles: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Show File Sizes</label>
                          <p className="text-sm text-gray-500">Display file sizes in human-readable format</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.ui.showFileSizes}
                            onChange={(e) => updateTempSettings('ui', { showFileSizes: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Enable Animations</label>
                          <p className="text-sm text-gray-500">Smooth transitions and hover effects</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.ui.enableAnimations}
                            onChange={(e) => updateTempSettings('ui', { enableAnimations: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Font & Size Settings */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-green-600 mr-2">🔤</span>
                      Font & Size Settings
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Size: {tempSettings.ui.fontSize}px
                        </label>
                        <input
                          type="range"
                          min="12"
                          max="20"
                          step="1"
                          value={tempSettings.ui.fontSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateTempSettings('ui', { fontSize: value });
                            validateField('fontSize', value, 12, 20);
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Small</span>
                          <span>Normal</span>
                          <span>Large</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                        <select
                          value={tempSettings.ui.fontFamily}
                          onChange={(e) => updateTempSettings('ui', { fontFamily: e.target.value as UISettings['fontFamily'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="system">System Default</option>
                          <option value="inter">Inter (Modern)</option>
                          <option value="roboto">Roboto (Clean)</option>
                          <option value="monospace">Monospace (Code)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Operations Tab */}
            {activeTab === 'fileOps' && (
              <div className="space-y-6">
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">🔒</span>
                    Safety & File Operation Settings
                  </h3>
                  
                  {/* Confirmation Settings */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      Confirmation Settings
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Confirm Delete Operations</label>
                          <p className="text-sm text-gray-500">Ask for confirmation before deleting files</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.fileOperations.confirmDelete}
                            onChange={(e) => updateTempSettings('fileOperations', { confirmDelete: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Confirm Move Operations</label>
                          <p className="text-sm text-gray-500">Ask for confirmation when moving files to different locations</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.fileOperations.confirmMove}
                            onChange={(e) => updateTempSettings('fileOperations', { confirmMove: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Confirm Batch Operations</label>
                          <p className="text-sm text-gray-500">Ask for confirmation when operating on multiple files</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.fileOperations.confirmBatchOperations}
                            onChange={(e) => updateTempSettings('fileOperations', { confirmBatchOperations: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Backup & Safety */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-green-600 mr-2">🛡️</span>
                      Backup & Safety
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Use Recycle Bin</label>
                          <p className="text-sm text-gray-500">Move deleted files to recycle bin instead of permanent deletion</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.fileOperations.useRecycleBin}
                            onChange={(e) => updateTempSettings('fileOperations', { useRecycleBin: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Create Backups on Move</label>
                          <p className="text-sm text-gray-500">Create backup copies when moving important files</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.fileOperations.createBackupOnMove}
                            onChange={(e) => updateTempSettings('fileOperations', { createBackupOnMove: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Auto-Save File Changes</label>
                          <p className="text-sm text-gray-500">Automatically save changes to files when possible</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.fileOperations.autoSave}
                            onChange={(e) => updateTempSettings('fileOperations', { autoSave: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Default Behavior */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-blue-600 mr-2">⚙️</span>
                      Default Behavior
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default File Action</label>
                        <select
                          value={tempSettings.fileOperations.defaultFileAction}
                          onChange={(e) => updateTempSettings('fileOperations', { defaultFileAction: e.target.value as FileOperationSettings['defaultFileAction'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="open">📄 Open File</option>
                          <option value="preview">👁️ Preview File</option>
                          <option value="select">✓ Select File</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Duplicate Handling</label>
                        <select
                          value={tempSettings.fileOperations.duplicateHandling}
                          onChange={(e) => updateTempSettings('fileOperations', { duplicateHandling: e.target.value as FileOperationSettings['duplicateHandling'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="ask">❓ Ask Every Time</option>
                          <option value="rename">🏷️ Auto Rename</option>
                          <option value="replace">🔄 Replace Existing</option>
                          <option value="skip">⏭️ Skip Duplicates</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Settings Tab */}
            {activeTab === 'search' && (
              <div className="space-y-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">🔍</span>
                    Search & Indexing Settings
                  </h3>
                  
                  {/* Search Behavior */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-blue-600 mr-2">🎯</span>
                      Search Behavior
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Results: {tempSettings.search.maxResults}
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
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>10</span>
                          <span>1000</span>
                          <span>2000</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search Mode</label>
                        <select
                          value={tempSettings.search.searchMode}
                          onChange={(e) => updateTempSettings('search', { searchMode: e.target.value as SearchSettings['searchMode'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="fuzzy">🎨 Fuzzy (Smart matching)</option>
                          <option value="exact">🎯 Exact (Precise matching)</option>
                          <option value="regex">🔧 Regex (Advanced patterns)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Search Options */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-purple-600 mr-2">⚙️</span>
                      Search Options
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Case Sensitive Search</label>
                          <p className="text-sm text-gray-500">Distinguish between uppercase and lowercase letters</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.search.caseSensitive}
                            onChange={(e) => updateTempSettings('search', { caseSensitive: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Include File Content</label>
                          <p className="text-sm text-gray-500">Search inside text files, not just filenames</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.search.includeContent}
                            onChange={(e) => updateTempSettings('search', { includeContent: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Include Hidden Files</label>
                          <p className="text-sm text-gray-500">Search in hidden files and folders</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.search.includeHidden}
                            onChange={(e) => updateTempSettings('search', { includeHidden: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Save Search History</label>
                          <p className="text-sm text-gray-500">Remember previous searches for quick access</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.search.saveHistory}
                            onChange={(e) => updateTempSettings('search', { saveHistory: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Indexing Settings */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-orange-600 mr-2">🗜</span>
                      Indexing & Performance
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Enable File Indexing</label>
                          <p className="text-sm text-gray-500">Build search index for faster results (uses more disk space)</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.search.enableIndexing}
                            onChange={(e) => updateTempSettings('search', { enableIndexing: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            History Size: {tempSettings.search.historySize}
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="1000"
                            step="10"
                            value={tempSettings.search.historySize}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              updateTempSettings('search', { historySize: value });
                              validateField('historySize', value, 10, 1000);
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 mt-1">Number of searches to remember</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Search Timeout (ms)</label>
                          <select
                            value={tempSettings.search.searchTimeout}
                            onChange={(e) => updateTempSettings('search', { searchTimeout: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="1000">⚡ 1 second (Fast)</option>
                            <option value="5000">⏱️ 5 seconds (Balanced)</option>
                            <option value="10000">🕰️ 10 seconds (Thorough)</option>
                            <option value="30000">🐢 30 seconds (Deep)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">⚙️</span>
                    Advanced Performance & System Settings
                  </h3>
                  
                  {/* Performance Settings */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-red-600 mr-2">🚀</span>
                      Performance Optimization
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Enable File Caching</label>
                          <p className="text-sm text-gray-500">Cache file information for faster loading (uses more RAM)</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced.enableCaching}
                            onChange={(e) => updateTempSettings('advanced', { enableCaching: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Enable GPU Acceleration</label>
                          <p className="text-sm text-gray-500">Use hardware acceleration for thumbnails and previews</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced.enableGPUAcceleration}
                            onChange={(e) => updateTempSettings('advanced', { enableGPUAcceleration: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cache Size (MB): {tempSettings.advanced.cacheSize}
                          </label>
                          <input
                            type="range"
                            min="50"
                            max="2048"
                            step="50"
                            value={tempSettings.advanced.cacheSize}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              updateTempSettings('advanced', { cacheSize: value });
                              validateField('cacheSize', value, 50, 2048);
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>50MB</span>
                            <span>1GB</span>
                            <span>2GB</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Worker Threads: {tempSettings.advanced.workerThreads}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="16"
                            step="1"
                            value={tempSettings.advanced.workerThreads}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              updateTempSettings('advanced', { workerThreads: value });
                              validateField('workerThreads', value, 1, 16);
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 mt-1">More threads = faster processing, more CPU usage</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Debugging & Logging */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-yellow-600 mr-2">🐛</span>
                      Debugging & Logging
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Enable Debug Mode</label>
                          <p className="text-sm text-gray-500">Show detailed error messages and performance metrics</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced.debugMode}
                            onChange={(e) => updateTempSettings('advanced', { debugMode: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Verbose Logging</label>
                          <p className="text-sm text-gray-500">Log detailed information about operations (larger log files)</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced.verboseLogging}
                            onChange={(e) => updateTempSettings('advanced', { verboseLogging: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Performance Monitoring</label>
                          <p className="text-sm text-gray-500">Track and display performance metrics in real-time</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced.performanceMonitoring}
                            onChange={(e) => updateTempSettings('advanced', { performanceMonitoring: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Log Level</label>
                        <select
                          value={tempSettings.advanced.logLevel}
                          onChange={(e) => updateTempSettings('advanced', { logLevel: e.target.value as AdvancedSettings['logLevel'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="error">🔴 Error Only</option>
                          <option value="warn">🟡 Warnings & Errors</option>
                          <option value="info">🔵 Info, Warnings & Errors</option>
                          <option value="debug">🔍 All Messages (Debug)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Security & Privacy */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-green-600 mr-2">🔐</span>
                      Security & Privacy
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Enable Telemetry</label>
                          <p className="text-sm text-gray-500">Send anonymous usage data to help improve the app</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced.enableTelemetry}
                            onChange={(e) => updateTempSettings('advanced', { enableTelemetry: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">Check for Updates</label>
                          <p className="text-sm text-gray-500">Automatically check for app updates on startup</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced.autoUpdate}
                            onChange={(e) => updateTempSettings('advanced', { autoUpdate: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Experimental Features */}
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="text-orange-600 mr-2">⚠️</span>
                      Experimental Features
                    </h4>
                    <div className="bg-yellow-100 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> These features are experimental and may cause instability. Use at your own risk.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-700">AI Batch Operations</label>
                          <p className="text-sm text-gray-500">Use AI to perform operations on multiple files simultaneously</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings.advanced.enableExperimentalFeatures}
                            onChange={(e) => updateTempSettings('advanced', { enableExperimentalFeatures: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
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
