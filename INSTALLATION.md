# Installation Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+**: Download from [nodejs.org](https://nodejs.org/)
- **Windows 10/11** (Electron app designed for Windows)
- **OpenAI API Key**: Get one from [platform.openai.com](https://platform.openai.com/)

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/smart-ai-file-explorer.git
   cd smart-ai-file-explorer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your OpenAI API key**
   
   Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_actual_api_key_here
   NODE_ENV=development
   ```
   
   **⚠️ Important**: Replace `your_actual_api_key_here` with your real OpenAI API key

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start the application**
   ```bash
   npm start
   ```

## 🎯 First Time Setup

### Getting Your OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key
5. Copy and paste it into your `.env` file

**💡 Cost**: The app uses GPT-4 which costs approximately $0.03 per 1K tokens. Normal usage should cost less than $1-2 per month.

### Troubleshooting

#### "require is not defined" Error
- Make sure you've run `npm run build` before `npm start`
- Delete `dist/` folder and rebuild: `npm run build`

#### "OpenAI API Key not found"
- Check your `.env` file exists in the root directory
- Verify the API key is correct (no quotes needed)
- Restart the application after adding the key

#### "Electron failed to start"
- Run `npm install electron --save-dev`
- Try: `npx electron .`

#### White screen on startup
- Open Developer Tools (Ctrl+Shift+I) to check for errors
- Rebuild the app: `npm run build && npm start`

## 🎮 How to Use

### Basic Commands
- Type or speak: "Find all PDF files"
- "Show me images from this week"  
- "Organize my downloads folder"
- "Delete temporary files"

### Advanced AI Features
- "Find duplicate images"
- "Categorize my documents"
- "Show files similar to presentation.pptx"

### Voice Input
1. Click the microphone button
2. Speak your command clearly
3. Wait for processing
4. Review the results

## 🔧 Development Mode

For developers who want to modify the code:

```bash
# Install development dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests (if available)
npm test
```

## 📁 Project Structure

```
smart-ai-file-explorer/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── services/          # AI services
│   └── hooks/             # Custom hooks
├── dist/                  # Built files (generated)
├── node_modules/          # Dependencies (generated)
├── main.js               # Electron main process
├── preload.js           # Electron preload script
├── package.json         # Dependencies and scripts
└── README.md           # Project documentation
```

## 🆘 Getting Help

If you encounter issues:

1. **Check the README.md** for basic usage
2. **Open an issue** on GitHub with:
   - Your operating system
   - Node.js version (`node --version`)
   - Error messages (screenshots help!)
   - Steps to reproduce the problem

## 🤝 Contributing

Want to improve the project?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📜 License

This project is open source under the MIT License.
