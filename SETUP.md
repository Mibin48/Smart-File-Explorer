# Smart AI File Explorer - Setup Instructions

## OpenAI API Integration

To enable the full AI features of this application, you need to set up your OpenAI API key.

### 1. Get your OpenAI API Key

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in to your OpenAI account or create one
3. Click "Create new secret key"
4. Copy the generated API key

### 2. Configure the Application

1. Open the `.env` file in the project root
2. Replace `your_openai_api_key_here` with your actual API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
3. Save the file

### 3. Install Dependencies and Build

```bash
npm install
npm run build
```

### 4. Start the Application

```bash
npm start
```

## Features Available

### With OpenAI API Key:
- **Advanced Natural Language Processing**: The AI can understand complex commands like "Find all PDF files modified in the last week that are larger than 5MB"
- **Intelligent Command Interpretation**: Better understanding of user intent and context
- **Smart File Organization Suggestions**: AI-powered recommendations for organizing files
- **File Content Analysis**: Summarization and preview of file contents

### Without OpenAI API Key (Fallback Mode):
- **Basic Command Processing**: Simple keyword-based command interpretation
- **File Operations**: Standard file operations (search, move, copy, delete)
- **Voice Input**: Speech-to-text functionality still works
- **Modern UI**: Full interface functionality

## Example Commands

Try these natural language commands once you've set up your API key:

- "Find all PDF files"
- "Show me files larger than 100MB"
- "Organize my downloads by file type"
- "Find documents modified this week"
- "Delete old temporary files"

## Security Notes

- Your API key is only stored locally in the `.env` file
- The application runs entirely on your machine
- No file contents are sent to external servers unless specifically using AI analysis features
- File operations require confirmation for destructive actions

## Troubleshooting

### API Key Issues:
- Make sure your API key starts with `sk-`
- Check that your OpenAI account has available credits
- Verify the key has the correct permissions

### Build Issues:
- Run `npm install` to ensure all dependencies are installed
- Try `npm run dev-build` for development mode with detailed error messages

### Runtime Issues:
- Check the developer console (F12) for detailed error messages
- Ensure Electron is properly installed: `npm install electron --save-dev`
- Try running in development mode: `npm run dev`

## Development Mode

For development with hot reloading:

```bash
# Terminal 1: Build with watch mode
npm run dev-build

# Terminal 2: Start Electron
npm run dev
```

This allows you to make changes to the code and see them reflected immediately.
