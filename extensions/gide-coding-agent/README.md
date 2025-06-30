# Gide Coding Agent Extension

A comprehensive coding agent extension for the Gide VSCode fork, providing seamless integration with Railway-hosted AI agents for enhanced development productivity.

## Features

### 🤖 AI-Powered Coding Assistant
- **Natural Language Processing**: Communicate with your coding agent using plain English
- **Code Generation**: Generate functions, classes, and entire modules
- **Code Explanation**: Get detailed explanations of complex code sections
- **Bug Fixing**: Identify and fix issues in your code with AI assistance
- **Code Optimization**: Improve performance and maintainability

### 🔒 Security & Privacy
- **No Hardcoded Endpoints**: All agent endpoints are configurable
- **Input Sanitization**: Comprehensive sanitization of all user input and agent output
- **Secure Communication**: HTTPS-only communication with Railway-hosted agents
- **No Data Storage**: No sensitive data stored locally
- **Error Isolation**: Secure error handling without data exposure

### 🎨 Modern UI/UX
- **React-Based Interface**: Modern, responsive web interface
- **VSCode Theme Integration**: Seamlessly matches your VSCode theme
- **Error Boundaries**: Graceful error handling and recovery
- **Real-time Updates**: Live conversation updates
- **Accessibility**: Full keyboard navigation and screen reader support

### 🏗️ Architecture
- **Zustand State Management**: Predictable and extensible state management
- **TypeScript**: Full type safety throughout the codebase
- **Modular Design**: Clean separation of concerns
- **Extension Points**: Integrates with VSCode's extension system
- **Railway Deployment**: Optimized for Railway single-service deployment

## Installation

### Prerequisites
- Gide VSCode fork (or compatible VSCode version)
- Railway-hosted coding agent endpoint
- Node.js and npm for development

### Setup

1. **Configure Agent Endpoint**
   ```bash
   # Option 1: Environment Variable (Recommended)
   export GIDE_AGENT_ENDPOINT="https://your-railway-app.railway.app/api/agent"
   
   # Option 2: VSCode Settings
   # Go to: File → Preferences → Settings → Extensions → Gide Coding Agent
   # Set "Agent Endpoint" to your Railway URL
   ```

2. **Install Extension**
   - Place the extension folder in your VSCode extensions directory
   - Reload VSCode
   - The extension will activate automatically

3. **Verify Installation**
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run "Gide: Open Coding Agent Panel"
   - Test connection to your Railway agent

## Usage

### Basic Usage

1. **Open the Agent Panel**
   - Use Command Palette: "Gide: Open Coding Agent Panel"
   - Or use the keyboard shortcut if configured

2. **Start a Conversation**
   ```
   Example requests:
   - "Create a function to sort an array of objects by name"
   - "Explain this code: [paste your code]"
   - "Find the bug in this function: [paste your code]"
   - "Optimize this algorithm for better performance"
   ```

3. **Review and Apply Responses**
   - Agent responses include generated code and explanations
   - Copy code directly from the response
   - Ask follow-up questions for clarification

### Advanced Features

#### Context-Aware Requests
The agent can use context from your current workspace:
- Current file information
- Selected text
- Workspace root directory

#### Conversation History
- All conversations are saved during the session
- Clear history when needed
- Scroll through previous interactions

#### Error Recovery
- Automatic retry on network failures
- Graceful handling of agent downtime
- Clear error messages with suggested actions

## Configuration

### Extension Settings

Access via: `File → Preferences → Settings → Extensions → Gide Coding Agent`

| Setting | Description | Default |
|---------|-------------|---------|
| `agentEndpoint` | Railway agent endpoint URL | `""` |
| `requestTimeout` | Request timeout in milliseconds | `30000` |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GIDE_AGENT_ENDPOINT` | Primary agent endpoint configuration | `https://your-app.railway.app/api` |

## Railway Deployment

### Agent Backend Requirements

Your Railway-hosted agent should implement:

#### API Endpoint
```
POST /api/agent
Content-Type: application/json

Request Body:
{
  "id": "unique-request-id",
  "request": "user's natural language request",
  "context": {
    "currentFile": "optional-file-path",
    "selectedText": "optional-selected-text",
    "workspaceRoot": "optional-workspace-path"
  }
}

Response Body:
{
  "id": "same-request-id",
  "response": "agent's response text",
  "success": true,
  "metadata": {
    "model": "gpt-4", // optional
    "tokensUsed": 150, // optional
    "processingTime": 1500 // optional
  }
}
```

#### Error Responses
```json
{
  "id": "request-id",
  "response": "Error message for user",
  "success": false,
  "error": "Technical error details"
}
```

### Deployment Example

```bash
# Deploy to Railway
railway login
railway new
railway add
railway deploy

# Set environment variables
railway variables set OPENAI_API_KEY=your-key
railway variables set MODEL_NAME=gpt-4
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/GaryOcean428/gide.git
cd gide/extensions/gide-coding-agent

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch
```

### Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

### Project Structure

```
gide-coding-agent/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── webviewHost.ts        # Webview management
│   ├── agent/
│   │   └── AgentClient.ts    # API client
│   ├── state/
│   │   └── agentStore.ts     # State management
│   ├── ui/
│   │   ├── AgentPanel.tsx    # Main UI component
│   │   └── ErrorBoundary.tsx # Error handling
│   ├── utils/
│   │   └── sanitize.ts       # Security utilities
│   └── __tests__/            # Test files
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript config
├── ARCHITECTURE.md          # Architecture docs
└── README.md               # This file
```

## Security

### Input Sanitization
- All user input is sanitized before processing
- HTML entities encoded for safe display
- URL validation for endpoint configuration
- File path sanitization for security

### Network Security
- HTTPS-only communication
- No hardcoded API keys or secrets
- Request timeout protection
- Error message sanitization

### Privacy
- No local data storage of conversations
- No telemetry or analytics
- No data sharing with third parties
- User controls all data flow

## Troubleshooting

### Common Issues

#### "Configuration Required" Error
- **Cause**: Agent endpoint not configured
- **Solution**: Set `GIDE_AGENT_ENDPOINT` environment variable or configure in settings

#### "Connection Failed" Error
- **Cause**: Network issues or agent downtime
- **Solution**: Check network connection and Railway app status

#### "Request Timeout" Error
- **Cause**: Agent response taking too long
- **Solution**: Increase timeout in settings or check agent performance

#### React/UI Errors
- **Cause**: JavaScript errors in the webview
- **Solution**: Use "Try Again" button or reload the extension

### Debug Mode

1. Enable VSCode Developer Tools
2. Open webview developer console
3. Check console logs for detailed error information
4. Report issues with log details

### Support

For issues related to:
- **Extension Bugs**: Create an issue in the Gide repository
- **Railway Deployment**: Check Railway documentation
- **Agent Implementation**: Review API specification above

## License

This extension is part of the Gide project and follows the same licensing terms.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding guidelines in ARCHITECTURE.md
4. Add tests for new functionality
5. Submit a pull request

## Roadmap

### Planned Features
- [ ] Multiple agent endpoint support
- [ ] Conversation export/import
- [ ] Custom model selection
- [ ] Advanced context integration
- [ ] Plugin system for extensions
- [ ] Offline mode capabilities
- [ ] Conversation search and filtering

### Performance Improvements
- [ ] Response caching
- [ ] Streaming responses
- [ ] Connection pooling
- [ ] Memory optimization

---

**Note**: This extension is designed specifically for the Gide VSCode fork and Railway deployment. For other environments, modifications may be required.