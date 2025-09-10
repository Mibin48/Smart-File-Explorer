# Smart AI File Explorer

A modern, intelligent AI-powered file explorer for Windows built with React, TypeScript, and Electron. Features natural language commands, voice input, and seamless AI integration.

## 🚀 Features

### 🧠 Advanced AI-Powered Features
- **Semantic Search**: Find files using meaning-based search with embeddings
- **Intelligent Categorization**: AI automatically categorizes files with confidence scores
- **Smart Organization Panel**: Interactive panel with duplicate detection and organization suggestions
- **Natural Language Operations**: Process complex commands like "organize my downloads" or "find duplicate images"
- **File Similarity Detection**: Find related files using content analysis
- **Intelligent File Naming**: AI-powered suggestions for better file names

### 🎛️ Core Features
- **Natural Language Commands**: Use everyday language to search and manage files
- **Voice Input**: Speak commands using microphone input
- **Smart File Search**: AI-powered search with natural language queries
- **Batch Operations**: Move, copy, delete, and rename multiple files
- **File Preview**: Summarize and preview file contents
- **Auto Organization**: AI suggestions for file organization
- **Modern UI**: Fluent/Mica design following Windows 11 style
- **Secure Operations**: Confirmation dialogs for destructive actions

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Backend**: Electron (main process)
- **AI**: OpenAI GPT-4 API
- **Styling**: Tailwind CSS + Fluent UI
- **Build**: Webpack

### Project Structure
```
src/
├── components/          # React components
│   ├── AdvancedCommandInput.tsx    # Enhanced voice/text input with AI
│   ├── SmartOrganizationPanel.tsx  # AI-powered organization panel
│   ├── FileTree.tsx                # Hierarchical file navigation
│   ├── FileList.tsx                # File display with selection
│   └── ActionPreview.tsx           # AI command preview
├── services/           # AI and backend services
│   └── AdvancedAIService.ts        # Advanced AI features
├── hooks/              # Custom React hooks
│   └── useFileSystem.ts # File system operations
├── commands/           # AI command processing
│   └── aiCommands.ts   # OpenAI integration
├── App.tsx            # Main application component
└── index.tsx          # React entry point
```

### Security & Safety
- **Sandboxed Operations**: File operations run in Electron main process
- **User Confirmation**: All destructive actions require confirmation
- **Error Handling**: Comprehensive error handling with user feedback
- **Access Control**: Limited file system access to user directories

## 📋 Prerequisites

- Node.js 16+
- npm or yarn
- Windows 10/11
- OpenAI API key

## 🛠️ Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up OpenAI API key**:
   Create a `.env` file in the root directory:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Start development mode**:
   ```bash
   npm run dev
   ```

## 🚀 Usage

### Advanced AI Commands
- "Find all duplicate images in my photos"
- "Categorize all files in my downloads folder"
- "Show me files similar to presentation.pptx"
- "Organize my documents by project type"
- "Find files related to machine learning"

### Basic Commands
- "Find all PDF files modified last week"
- "Show me files larger than 100MB"
- "Organize my downloads by file type"
- "Delete files older than 1 year"

### Voice Input
Click the microphone button and speak your command naturally.

### File Operations
- Select files using checkboxes
- Use natural language to specify operations
- Confirm destructive actions in dialog boxes

## 🔧 Configuration

### Environment Variables
```env
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=development|production
```

### Build Configuration
Modify `webpack.config.js` for custom build settings.

## 🧠 AI Integration

### Command Processing
The AI command processor uses GPT-4 to:
1. Parse natural language commands
2. Extract intent and parameters
3. Generate safe file system operations
4. Provide confidence scores

### Supported Operations
- **Search**: Find files by name, type, date, size
- **Organize**: Group files by various criteria
- **Move/Copy**: Batch file operations
- **Delete**: Safe deletion with confirmation
- **Preview**: File content summarization

## 🔒 Security Considerations

### File System Access
- Operations limited to user-accessible directories
- No system file modifications
- Async file operations with proper error handling

### API Security
- OpenAI API key stored securely
- No sensitive data sent to external APIs
- Local processing where possible

### User Safety
- Confirmation dialogs for destructive operations
- Undo functionality for supported operations
- Clear error messages and recovery options

## 🎨 UI/UX Design

### Fluent Design Principles
- **Acrylic/Mica**: Modern backdrop effects
- **Rounded Corners**: Contemporary aesthetics
- **Consistent Spacing**: Fluent spacing system
- **Typography**: Clear hierarchy and readability

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Voice input for accessibility

## 🧪 Testing

### Running Tests
```bash
npm test
```

### Manual Testing Checklist
- [ ] Voice input functionality
- [ ] Natural language search
- [ ] File operations (create, delete, move)
- [ ] Error handling scenarios
- [ ] UI responsiveness

## 📚 API Reference

### Electron IPC Methods
- `read-dir`: Read directory contents
- `search-files`: Search files with query
- `file-operation`: Execute file operations
- `process-ai-command`: Process AI commands

### React Hooks
- `useFileSystem`: File system operations
- `useAICommands`: AI command processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues
1. **OpenAI API errors**: Check API key and quota
2. **File access denied**: Run as administrator or check permissions
3. **Voice input not working**: Check microphone permissions

### Debug Mode
```bash
NODE_ENV=development npm run dev
```

## 🚀 Future Enhancements

- [ ] Local AI model integration
- [ ] Vector database for semantic search
- [ ] Custom command definitions
- [ ] File content analysis
- [ ] Cloud storage integration
- [ ] Multi-language support
