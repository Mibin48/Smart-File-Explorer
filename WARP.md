# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Smart AI File Explorer is an Electron-based desktop application built with React and TypeScript. It combines traditional file management with advanced AI capabilities powered by OpenAI's GPT-4, embeddings, and vision models. The app provides natural language file operations, semantic search, and intelligent file organization.

## Essential Commands

### Development Workflow
```bash
# Install dependencies
npm install

# Build for development/production
npm run build

# Run in development mode
npm run dev

# Start the built application
npm start

# Build with watch mode for development
npm run dev-build
```

### Environment Setup
1. Create `.env` file in root with:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   NODE_ENV=development
   ```
2. API key is required for advanced AI features but app works in fallback mode without it

### Quick Launch
- Use `Start-SmartFileExplorer.bat` for automated setup and launch
- Automatically installs dependencies and builds if needed

## Architecture Overview

### Core Technology Stack
- **Frontend**: React 18 + TypeScript with Fluent Design UI
- **Backend**: Electron main/renderer processes
- **AI Integration**: OpenAI GPT-4, embeddings, and vision models
- **Build System**: Webpack with custom configuration
- **Styling**: Tailwind CSS + custom Fluent-inspired styles

### Process Architecture
- **Main Process** (`main.js`): File system operations, IPC handlers, AI command processing
- **Renderer Process** (`src/`): React UI, components, hooks, and services  
- **Preload Script** (`preload.js`): Secure bridge between main and renderer

### Key IPC Channels
- `read-dir`: Directory listing with metadata
- `search-files`: Advanced file search with multiple criteria
- `file-operation`: Safe file operations (move, copy, delete)
- `process-ai-command`: AI command interpretation
- `get-user-home`: System directory paths

## Critical Code Structure

### AI Services Layer
- **`AdvancedAIService.ts`**: Core AI integration with OpenAI APIs
  - Semantic search using embeddings
  - GPT-4 function calling for complex operations
  - File content analysis and categorization
  - Smart organization suggestions

### Command Processing
- **Dual AI Processing**: OpenAI API primary, local fallback in main process
- **`aiCommands.ts`**: Structured AI command interpretation
- **Main Process AI**: Embedded command processor for offline functionality

### File System Integration
- **`useFileSystem.ts`**: React hook for file operations
- **Security**: All destructive operations require confirmation dialogs
- **Path Handling**: Windows-specific path handling with proper escaping

### UI Components Architecture
- **Three-Mode Input**: Basic, Semantic, and Advanced AI command modes
- **`AdvancedCommandInput.tsx`**: Multi-modal AI interface
- **`SmartOrganizationPanel.tsx`**: AI-powered file organization UI
- **State Management**: React hooks with centralized AI service integration

## Advanced AI Feature Implementation

### Core AI Models Integration
- **GPT-4 Turbo Preview**: Complex reasoning and function calling
- **GPT-4 Vision Preview**: Image content analysis and understanding
- **Text-Embedding-3-Small**: Semantic search and similarity detection
- **Multi-modal Analysis**: Handles text, images, code, documents, audio, video

### Semantic Search & Content Understanding
- Uses OpenAI embeddings for meaning-based file discovery
- Caches embeddings to avoid redundant API calls
- Cosine similarity calculations for relationship detection
- Content-aware search: "Find documents about machine learning" or "Show images with people"
- Code comprehension: Understands programming languages and can categorize by purpose

### Advanced Function Calling System
The AI uses structured function calls for complex operations:
- **`search_files_by_criteria`**: Multi-dimensional searches (content, date, size, type)
- **`organize_files_intelligently`**: Content-based smart organization
- **`analyze_file_relationships`**: Duplicate detection, similarity analysis, version history
- **`categorize_files_by_content`**: AI-powered file categorization with confidence scores
- **`generate_file_insights`**: Deep content analysis and metadata extraction

### Multi-Modal Content Analysis
#### Text Files (Code, Documents, Scripts)
- **Code Analysis**: Detects programming language, purpose, complexity
- **Document Summarization**: Extracts key topics and themes
- **Educational Content**: Identifies subject matter (physics, math, programming)
- **File Purpose Recognition**: Distinguishes between homework, projects, tutorials

#### Image Processing with GPT-4 Vision
- **Scene Description**: Detailed analysis of image content
- **Object Recognition**: Identifies people, objects, landscapes, charts
- **Context Understanding**: Screenshots vs photos vs diagrams vs UI mockups
- **Quality Assessment**: Resolution, composition, professional vs casual

#### Audio/Video Intelligence
- **Metadata Extraction**: Duration, bitrate, format analysis
- **Content Inference**: Music vs speech vs sound effects
- **Quality Classification**: Professional vs amateur production
- **Cultural Context**: Classical music vs popular vs international content

### Intelligent Duplicate Detection
- **Multi-Algorithm Approach**: Size + name + semantic + content similarity
- **Confidence Scoring**: Weighted analysis (40% size, 30% name, 20% extension, 10% semantic)
- **Version Recognition**: Identifies different versions of same content
- **Smart Recommendations**: Suggests which duplicates to keep/archive

### Natural Language Command Processing
- **Complex Query Parsing**: "Find C++ files related to data structures from last month"
- **Context-Aware Operations**: Understands project relationships and file dependencies
- **Safety Classification**: Categorizes operations as safe/caution/dangerous
- **Multi-Step Reasoning**: Breaks complex requests into executable operations

### Content-Based File Organization
- **Project Detection**: Groups related files automatically (HTML + CSS + JS)
- **Subject Classification**: Academic files by subject (physics, programming, etc.)
- **Workflow Understanding**: Identifies file creation patterns and usage
- **Smart Folder Suggestions**: Creates meaningful hierarchy based on content analysis

## Development Patterns

### Error Handling Strategy
- Graceful degradation from AI features to local processing
- Comprehensive try-catch blocks with user-friendly messages
- Console logging for debugging AI interactions

### File Safety
- All file operations go through confirmation dialogs
- Read-only operations by default
- Async file operations with proper error handling

### API Integration Pattern
```typescript
// Always provide fallback when OpenAI fails
try {
  const result = await aiService.processCommand(command);
} catch (error) {
  const fallbackResult = await localProcessing(command);
}
```

### Component Communication
- Props drilling for file selection state
- Callback patterns for AI command results  
- Central state management in App.tsx

## Testing and Debugging

### Manual Testing Focus Areas
- Voice input functionality with microphone permissions
- File operations across different directories
- AI command processing with various natural language inputs
- Error scenarios (API failures, file access denied)

### Debug Mode
- Set `NODE_ENV=development` for detailed logging
- Use browser dev tools in Electron renderer process
- Check console for AI processing steps

## Important File Paths and Patterns

### Configuration Files
- `webpack.config.js`: Custom build with Tailwind and environment variables
- `tsconfig.json`: Standard React TypeScript configuration  
- `.env`: API keys and environment settings

### File Extensions and Types
The app has extensive file type mappings for:
- Documents: doc, docx, pdf, txt, rtf
- Images: jpg, png, gif, svg, webp
- Media: mp4, mp3, avi, wav
- Archives: zip, rar, 7z
- Code files: js, ts, py, java, cpp, html, css

### Path Handling
- Windows-specific path separators (`\\`)
- User directory detection via `os.homedir()`
- Special handling for OneDrive paths

## Security Considerations

### API Key Management
- API keys stored in `.env` file only
- Never logged or transmitted except to OpenAI
- Graceful fallback when API unavailable

### File System Access
- Limited to user-accessible directories
- No system file modifications allowed
- Confirmation required for destructive operations

## AI Command Examples (Real Test Data)

With the current TestFiles content, try these advanced commands:

### Content-Based Search Examples
```
"Find C programming files about data structures"
"Show Python files with class definitions"
"Find HTML files with form elements"
"Locate audio files by classical composers"
"Find videos about nature or landscapes"
"Show PDF documents about electronics or circuits"
```

### Semantic Organization Commands
```
"Organize code files by programming language and purpose"
"Group audio files by genre and quality"
"Categorize documents by subject matter"
"Create folders for academic vs entertainment content"
"Separate professional from personal files"
```

### Advanced Analysis Operations
```
"Analyze duplicate audio files and suggest which to keep"
"Find related files across different formats (HTML + CSS + JS)"
"Identify incomplete projects or file sets"
"Show files that might need better names"
"Find academic files that belong to the same course"
```

## AI Service Architecture Deep Dive

### File Content Analysis Pipeline
1. **File Type Detection**: Extension + magic number analysis
2. **Content Extraction**: Read file content for analysis
3. **AI Model Selection**: Choose appropriate model (GPT-4, Vision, embeddings)
4. **Context Building**: Create rich prompts with file metadata
5. **Result Processing**: Parse AI responses into structured data
6. **Confidence Scoring**: Rate reliability of analysis results

### Embedding Management System
- **Lazy Loading**: Generates embeddings on-demand
- **Persistent Caching**: Stores embeddings to avoid API calls
- **Batch Processing**: Handles multiple files efficiently
- **Similarity Indexing**: Fast retrieval of related content

### Multi-Language Code Understanding
The system recognizes and analyzes:
- **C/C++**: System programming, data structures, algorithms
- **Python**: Classes, functions, GUI frameworks, data processing
- **HTML/CSS/JS**: Web development, UI components, interactivity
- **Font Files**: Typography resources and design assets
- **Build Artifacts**: Executables and their source relationships

## Common Development Tasks

### Adding New AI Functions
1. Define function schema in `AdvancedAIService.ts`
2. Add corresponding handler method with proper error handling
3. Update UI components to display results appropriately
4. Add fallback behavior for offline/API failure scenarios
5. Test with diverse file types and edge cases

### Extending Content Analysis
1. Add new file type detection in `isImageFile()`, `isTextFile()` helpers
2. Create specialized analysis methods (e.g., `analyzePdfFile()`, `analyzeAudioFile()`)
3. Update parsing logic in `parseAnalysisResponse()` for new data types
4. Add appropriate confidence scoring for new analysis types

### Performance Optimization
- **Batch API Calls**: Process multiple files in single requests
- **Smart Caching**: Cache analysis results based on file modification time
- **Progressive Loading**: Start with filename analysis, upgrade to content analysis
- **Rate Limiting**: Respect OpenAI API limits with exponential backoff

### Testing AI Features
1. **Unit Tests**: Mock OpenAI responses for consistent testing
2. **Integration Tests**: Use test files with known content
3. **Performance Tests**: Measure API response times and caching effectiveness
4. **Edge Case Testing**: Handle malformed files, network failures, API limits

The app represents a sophisticated integration of multiple AI models with traditional file management, requiring careful attention to both the AI service layer, content analysis pipeline, and the underlying file system operations. The real test files provide rich content for demonstrating advanced AI capabilities across multiple domains (programming, music, academics, media).
