/**
 * Export/Import Service for Smart AI File Explorer
 * Handles exporting and importing of search results, file lists, and organization data
 */

export interface ExportableFileItem {
  name: string;
  path: string;
  type: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
}

export interface SearchResultsExport {
  query: string;
  searchMode: 'basic' | 'semantic' | 'advanced';
  searchPath: string;
  timestamp: Date;
  resultsCount: number;
  executionTime: number;
  files: ExportableFileItem[];
  metadata: {
    version: string;
    exportedBy: string;
  };
}

export interface OrganizationPlanExport {
  planId: string;
  directoryPath: string;
  timestamp: Date;
  suggestions: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    files: string[];
    targetPath?: string;
    confidence: number;
    reasoning: string;
  }>;
  appliedSuggestions: string[];
  totalFiles: number;
  metadata: {
    version: string;
    exportedBy: string;
  };
}

export interface FileListExport {
  directoryPath: string;
  timestamp: Date;
  files: ExportableFileItem[];
  includeSubdirectories: boolean;
  filters?: {
    fileTypes?: string[];
    sizeRange?: { min?: number; max?: number };
    dateRange?: { from?: Date; to?: Date };
  };
  metadata: {
    version: string;
    exportedBy: string;
  };
}

export type ExportFormat = 'json' | 'csv' | 'txt' | 'html';
export type ExportType = 'search-results' | 'file-list' | 'organization-plan';

export class ExportImportService {
  private readonly APP_VERSION = '1.0.0';
  private readonly EXPORTED_BY = 'Smart AI File Explorer';

  /**
   * Export search results to specified format
   */
  async exportSearchResults(
    results: ExportableFileItem[],
    query: string,
    searchMode: 'basic' | 'semantic' | 'advanced',
    searchPath: string,
    executionTime: number,
    format: ExportFormat
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    const exportData: SearchResultsExport = {
      query,
      searchMode,
      searchPath,
      timestamp: new Date(),
      resultsCount: results.length,
      executionTime,
      files: results,
      metadata: {
        version: this.APP_VERSION,
        exportedBy: this.EXPORTED_BY
      }
    };

    const sanitizedQuery = this.sanitizeFilename(query);
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'json':
        return {
          content: JSON.stringify(exportData, null, 2),
          filename: `search-results_${sanitizedQuery}_${timestamp}.json`,
          mimeType: 'application/json'
        };

      case 'csv':
        return {
          content: this.convertSearchResultsToCSV(exportData),
          filename: `search-results_${sanitizedQuery}_${timestamp}.csv`,
          mimeType: 'text/csv'
        };

      case 'txt':
        return {
          content: this.convertSearchResultsToText(exportData),
          filename: `search-results_${sanitizedQuery}_${timestamp}.txt`,
          mimeType: 'text/plain'
        };

      case 'html':
        return {
          content: this.convertSearchResultsToHTML(exportData),
          filename: `search-results_${sanitizedQuery}_${timestamp}.html`,
          mimeType: 'text/html'
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export file list to specified format
   */
  async exportFileList(
    files: ExportableFileItem[],
    directoryPath: string,
    includeSubdirectories: boolean,
    format: ExportFormat,
    filters?: {
      fileTypes?: string[];
      sizeRange?: { min?: number; max?: number };
      dateRange?: { from?: Date; to?: Date };
    }
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    const exportData: FileListExport = {
      directoryPath,
      timestamp: new Date(),
      files,
      includeSubdirectories,
      filters,
      metadata: {
        version: this.APP_VERSION,
        exportedBy: this.EXPORTED_BY
      }
    };

    const dirName = this.sanitizeFilename(directoryPath.split(/[/\\]/).pop() || 'files');
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'json':
        return {
          content: JSON.stringify(exportData, null, 2),
          filename: `file-list_${dirName}_${timestamp}.json`,
          mimeType: 'application/json'
        };

      case 'csv':
        return {
          content: this.convertFileListToCSV(exportData),
          filename: `file-list_${dirName}_${timestamp}.csv`,
          mimeType: 'text/csv'
        };

      case 'txt':
        return {
          content: this.convertFileListToText(exportData),
          filename: `file-list_${dirName}_${timestamp}.txt`,
          mimeType: 'text/plain'
        };

      case 'html':
        return {
          content: this.convertFileListToHTML(exportData),
          filename: `file-list_${dirName}_${timestamp}.html`,
          mimeType: 'text/html'
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export organization plan to specified format
   */
  async exportOrganizationPlan(
    planId: string,
    directoryPath: string,
    suggestions: any[],
    appliedSuggestions: string[],
    totalFiles: number,
    format: ExportFormat
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    const exportData: OrganizationPlanExport = {
      planId,
      directoryPath,
      timestamp: new Date(),
      suggestions: suggestions.map(s => ({
        id: s.id,
        type: s.type,
        title: s.title,
        description: s.description,
        files: s.files,
        targetPath: s.targetPath,
        confidence: s.confidence,
        reasoning: s.reasoning
      })),
      appliedSuggestions,
      totalFiles,
      metadata: {
        version: this.APP_VERSION,
        exportedBy: this.EXPORTED_BY
      }
    };

    const dirName = this.sanitizeFilename(directoryPath.split(/[/\\]/).pop() || 'organization');
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'json':
        return {
          content: JSON.stringify(exportData, null, 2),
          filename: `organization-plan_${dirName}_${timestamp}.json`,
          mimeType: 'application/json'
        };

      case 'csv':
        return {
          content: this.convertOrganizationPlanToCSV(exportData),
          filename: `organization-plan_${dirName}_${timestamp}.csv`,
          mimeType: 'text/csv'
        };

      case 'txt':
        return {
          content: this.convertOrganizationPlanToText(exportData),
          filename: `organization-plan_${dirName}_${timestamp}.txt`,
          mimeType: 'text/plain'
        };

      case 'html':
        return {
          content: this.convertOrganizationPlanToHTML(exportData),
          filename: `organization-plan_${dirName}_${timestamp}.html`,
          mimeType: 'text/html'
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Download exported content as file
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Import data from JSON string
   */
  async importFromJSON(jsonContent: string): Promise<{
    type: ExportType;
    data: SearchResultsExport | FileListExport | OrganizationPlanExport;
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(jsonContent);
      
      // Determine data type
      let type: ExportType;
      let isValid = true;

      if (parsed.query && parsed.searchMode && parsed.files) {
        type = 'search-results';
        const validation = this.validateSearchResultsImport(parsed);
        isValid = validation.isValid;
        errors.push(...validation.errors);
      } else if (parsed.directoryPath && parsed.files && !parsed.query) {
        type = 'file-list';
        const validation = this.validateFileListImport(parsed);
        isValid = validation.isValid;
        errors.push(...validation.errors);
      } else if (parsed.planId && parsed.suggestions) {
        type = 'organization-plan';
        const validation = this.validateOrganizationPlanImport(parsed);
        isValid = validation.isValid;
        errors.push(...validation.errors);
      } else {
        isValid = false;
        errors.push('Unknown or invalid data format');
        type = 'search-results'; // default
      }

      return {
        type,
        data: parsed,
        isValid,
        errors
      };
    } catch (error) {
      return {
        type: 'search-results',
        data: {} as any,
        isValid: false,
        errors: [`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Private helper methods

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100);
  }

  private convertSearchResultsToCSV(data: SearchResultsExport): string {
    const headers = ['Name', 'Path', 'Type', 'Size (bytes)', 'Modified', 'Is Directory'];
    const rows = [
      `# Search Results Export`,
      `# Query: ${data.query}`,
      `# Search Mode: ${data.searchMode}`,
      `# Path: ${data.searchPath}`,
      `# Results: ${data.resultsCount}`,
      `# Exported: ${data.timestamp.toISOString()}`,
      ``,
      headers.join(',')
    ];

    data.files.forEach(file => {
      rows.push([
        this.escapeCSVField(file.name),
        this.escapeCSVField(file.path),
        this.escapeCSVField(file.type),
        file.size.toString(),
        file.modified.toISOString(),
        file.isDirectory.toString()
      ].join(','));
    });

    return rows.join('\n');
  }

  private convertSearchResultsToText(data: SearchResultsExport): string {
    const lines = [
      `Smart AI File Explorer - Search Results Export`,
      `=====================================`,
      ``,
      `Query: ${data.query}`,
      `Search Mode: ${data.searchMode}`,
      `Search Path: ${data.searchPath}`,
      `Results Found: ${data.resultsCount}`,
      `Execution Time: ${data.executionTime}ms`,
      `Export Date: ${data.timestamp.toLocaleString()}`,
      ``,
      `Files:`,
      `------`
    ];

    data.files.forEach((file, index) => {
      lines.push(`${index + 1}. ${file.name}`);
      lines.push(`   Path: ${file.path}`);
      lines.push(`   Type: ${file.type}`);
      lines.push(`   Size: ${this.formatFileSize(file.size)}`);
      lines.push(`   Modified: ${file.modified.toLocaleString()}`);
      lines.push(`   Directory: ${file.isDirectory ? 'Yes' : 'No'}`);
      lines.push('');
    });

    return lines.join('\n');
  }

  private convertSearchResultsToHTML(data: SearchResultsExport): string {
    const fileRows = data.files.map(file => `
      <tr>
        <td>${this.escapeHTML(file.name)}</td>
        <td><small>${this.escapeHTML(file.path)}</small></td>
        <td>${file.type}</td>
        <td>${this.formatFileSize(file.size)}</td>
        <td>${file.modified.toLocaleString()}</td>
        <td>${file.isDirectory ? '📁' : '📄'}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search Results - ${this.escapeHTML(data.query)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; }
        .stat-label { font-size: 0.9em; color: #666; margin-bottom: 5px; }
        .stat-value { font-size: 1.2em; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
        th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; color: #333; border-bottom: 2px solid #e9ecef; }
        td { padding: 10px 12px; border-bottom: 1px solid #e9ecef; }
        tr:hover { background: #f8f9fa; }
        .export-info { margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 6px; font-size: 0.9em; color: #1976d2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Search Results</h1>
        <p>Query: "${this.escapeHTML(data.query)}"</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="stat-label">Search Mode</div>
            <div class="stat-value">${data.searchMode}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Results Found</div>
            <div class="stat-value">${data.resultsCount}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Execution Time</div>
            <div class="stat-value">${data.executionTime}ms</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Search Path</div>
            <div class="stat-value"><small>${this.escapeHTML(data.searchPath)}</small></div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Path</th>
                <th>Type</th>
                <th>Size</th>
                <th>Modified</th>
                <th>Type</th>
            </tr>
        </thead>
        <tbody>
            ${fileRows}
        </tbody>
    </table>
    
    <div class="export-info">
        📊 Exported on ${data.timestamp.toLocaleString()} by ${data.metadata.exportedBy} v${data.metadata.version}
    </div>
</body>
</html>
    `.trim();
  }

  private convertFileListToCSV(data: FileListExport): string {
    const headers = ['Name', 'Path', 'Type', 'Size (bytes)', 'Modified', 'Is Directory'];
    const rows = [
      `# File List Export`,
      `# Directory: ${data.directoryPath}`,
      `# Include Subdirectories: ${data.includeSubdirectories}`,
      `# Total Files: ${data.files.length}`,
      `# Exported: ${data.timestamp.toISOString()}`,
      ``,
      headers.join(',')
    ];

    data.files.forEach(file => {
      rows.push([
        this.escapeCSVField(file.name),
        this.escapeCSVField(file.path),
        this.escapeCSVField(file.type),
        file.size.toString(),
        file.modified.toISOString(),
        file.isDirectory.toString()
      ].join(','));
    });

    return rows.join('\n');
  }

  private convertFileListToText(data: FileListExport): string {
    const lines = [
      `Smart AI File Explorer - File List Export`,
      `=======================================`,
      ``,
      `Directory: ${data.directoryPath}`,
      `Include Subdirectories: ${data.includeSubdirectories ? 'Yes' : 'No'}`,
      `Total Files: ${data.files.length}`,
      `Export Date: ${data.timestamp.toLocaleString()}`,
      ``,
      `Files:`,
      `------`
    ];

    data.files.forEach((file, index) => {
      lines.push(`${index + 1}. ${file.name}`);
      lines.push(`   Path: ${file.path}`);
      lines.push(`   Type: ${file.type}`);
      lines.push(`   Size: ${this.formatFileSize(file.size)}`);
      lines.push(`   Modified: ${file.modified.toLocaleString()}`);
      lines.push(`   Directory: ${file.isDirectory ? 'Yes' : 'No'}`);
      lines.push('');
    });

    return lines.join('\n');
  }

  private convertFileListToHTML(data: FileListExport): string {
    // Similar to convertSearchResultsToHTML but adapted for file lists
    const fileRows = data.files.map(file => `
      <tr>
        <td>${this.escapeHTML(file.name)}</td>
        <td><small>${this.escapeHTML(file.path)}</small></td>
        <td>${file.type}</td>
        <td>${this.formatFileSize(file.size)}</td>
        <td>${file.modified.toLocaleString()}</td>
        <td>${file.isDirectory ? '📁' : '📄'}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File List - ${this.escapeHTML(data.directoryPath)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #4facfe; }
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
        th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; color: #333; border-bottom: 2px solid #e9ecef; }
        td { padding: 10px 12px; border-bottom: 1px solid #e9ecef; }
        tr:hover { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📁 File List</h1>
        <p>Directory: ${this.escapeHTML(data.directoryPath)}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Path</th>
                <th>Type</th>
                <th>Size</th>
                <th>Modified</th>
                <th>Type</th>
            </tr>
        </thead>
        <tbody>
            ${fileRows}
        </tbody>
    </table>
</body>
</html>
    `.trim();
  }

  private convertOrganizationPlanToCSV(data: OrganizationPlanExport): string {
    const headers = ['Suggestion ID', 'Type', 'Title', 'Description', 'Files Count', 'Target Path', 'Confidence', 'Reasoning'];
    const rows = [
      `# Organization Plan Export`,
      `# Directory: ${data.directoryPath}`,
      `# Total Files: ${data.totalFiles}`,
      `# Suggestions: ${data.suggestions.length}`,
      `# Exported: ${data.timestamp.toISOString()}`,
      ``,
      headers.join(',')
    ];

    data.suggestions.forEach(suggestion => {
      rows.push([
        this.escapeCSVField(suggestion.id),
        this.escapeCSVField(suggestion.type),
        this.escapeCSVField(suggestion.title),
        this.escapeCSVField(suggestion.description),
        suggestion.files.length.toString(),
        this.escapeCSVField(suggestion.targetPath || ''),
        suggestion.confidence.toString(),
        this.escapeCSVField(suggestion.reasoning)
      ].join(','));
    });

    return rows.join('\n');
  }

  private convertOrganizationPlanToText(data: OrganizationPlanExport): string {
    const lines = [
      `Smart AI File Explorer - Organization Plan Export`,
      `==============================================`,
      ``,
      `Directory: ${data.directoryPath}`,
      `Total Files: ${data.totalFiles}`,
      `Suggestions: ${data.suggestions.length}`,
      `Applied: ${data.appliedSuggestions.length}`,
      `Export Date: ${data.timestamp.toLocaleString()}`,
      ``,
      `Organization Suggestions:`,
      `-----------------------`
    ];

    data.suggestions.forEach((suggestion, index) => {
      const isApplied = data.appliedSuggestions.includes(suggestion.id);
      lines.push(`${index + 1}. ${suggestion.title} ${isApplied ? '✅ Applied' : '⏳ Pending'}`);
      lines.push(`   Type: ${suggestion.type}`);
      lines.push(`   Description: ${suggestion.description}`);
      lines.push(`   Files Affected: ${suggestion.files.length}`);
      if (suggestion.targetPath) {
        lines.push(`   Target: ${suggestion.targetPath}`);
      }
      lines.push(`   Confidence: ${Math.round(suggestion.confidence * 100)}%`);
      lines.push(`   Reasoning: ${suggestion.reasoning}`);
      lines.push('');
    });

    return lines.join('\n');
  }

  private convertOrganizationPlanToHTML(data: OrganizationPlanExport): string {
    const suggestionRows = data.suggestions.map((suggestion, index) => {
      const isApplied = data.appliedSuggestions.includes(suggestion.id);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${this.escapeHTML(suggestion.title)}</td>
          <td><span class="type-badge type-${suggestion.type}">${suggestion.type}</span></td>
          <td>${suggestion.files.length}</td>
          <td><small>${this.escapeHTML(suggestion.targetPath || '-')}</small></td>
          <td><div class="confidence-bar"><div class="confidence-fill" style="width: ${suggestion.confidence * 100}%"></div><span>${Math.round(suggestion.confidence * 100)}%</span></div></td>
          <td>${isApplied ? '<span class="status-applied">✅ Applied</span>' : '<span class="status-pending">⏳ Pending</span>'}</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Organization Plan - ${this.escapeHTML(data.directoryPath)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
        th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; color: #333; border-bottom: 2px solid #e9ecef; }
        td { padding: 10px 12px; border-bottom: 1px solid #e9ecef; vertical-align: top; }
        tr:hover { background: #f8f9fa; }
        .type-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 500; }
        .type-create_folder { background: #e3f2fd; color: #1976d2; }
        .type-move_files { background: #f3e5f5; color: #7b1fa2; }
        .type-rename_files { background: #e8f5e8; color: #388e3c; }
        .confidence-bar { position: relative; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .confidence-fill { height: 100%; background: linear-gradient(90deg, #28a745, #17a2b8, #ffc107); transition: width 0.3s; }
        .confidence-bar span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.8em; font-weight: 500; }
        .status-applied { color: #28a745; font-weight: 600; }
        .status-pending { color: #ffc107; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🗂️ Organization Plan</h1>
        <p>Directory: ${this.escapeHTML(data.directoryPath)}</p>
        <p>Generated: ${data.timestamp.toLocaleString()}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Suggestion</th>
                <th>Type</th>
                <th>Files</th>
                <th>Target</th>
                <th>Confidence</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${suggestionRows}
        </tbody>
    </table>
</body>
</html>
    `.trim();
  }

  // Validation methods
  private validateSearchResultsImport(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.query || typeof data.query !== 'string') {
      errors.push('Missing or invalid query field');
    }
    if (!data.searchMode || !['basic', 'semantic', 'advanced'].includes(data.searchMode)) {
      errors.push('Missing or invalid searchMode field');
    }
    if (!Array.isArray(data.files)) {
      errors.push('Missing or invalid files array');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateFileListImport(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.directoryPath || typeof data.directoryPath !== 'string') {
      errors.push('Missing or invalid directoryPath field');
    }
    if (!Array.isArray(data.files)) {
      errors.push('Missing or invalid files array');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateOrganizationPlanImport(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.planId || typeof data.planId !== 'string') {
      errors.push('Missing or invalid planId field');
    }
    if (!Array.isArray(data.suggestions)) {
      errors.push('Missing or invalid suggestions array');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Utility methods
  private escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// Singleton instance
let exportImportInstance: ExportImportService | null = null;

export const getExportImportService = (): ExportImportService => {
  if (!exportImportInstance) {
    exportImportInstance = new ExportImportService();
  }
  return exportImportInstance;
};
