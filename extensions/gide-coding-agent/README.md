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

### Opening the Agent Panel

1. **Command Palette**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Gide: Open Coding Agent Panel"
   - Press Enter

2. **Direct Command**: Use the command `gide-coding-agent.openPanel`

### Using Context Modes

The extension provides four context modes to control what information is shared with the agent:

- **None**: No context sent (most private)
- **File**: Current file name and language
- **Selection**: Current file, selected text, and cursor position
- **Workspace**: Workspace name and file structure information

### Code Suggestions

When the agent provides code in responses, you'll see a "📋 Code Actions" button that allows you to:

1. **Extract Code Blocks**: Automatically detect code in responses
2. **Insert at Cursor**: Place code at your current cursor position
3. **Copy to Clipboard**: Copy code for use elsewhere
4. **Create New File**: Open code in a new VSCode file

### Quick Code Insertion

For rapid code insertion from selected text:

1. Select text containing code suggestions in any editor
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run "Gide: Insert Code Suggestion"
4. Choose from extracted code blocks

### Context Refresh

The extension automatically updates context as you work, but you can manually refresh it using the "🔄 Refresh Context" button in the agent panel.

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
| `gide-coding-agent.agentEndpoint` | Railway agent endpoint URL | `""` |
| `gide-coding-agent.requestTimeout` | Request timeout in milliseconds | `30000` |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GIDE_AGENT_ENDPOINT` | Primary agent endpoint configuration | `https://your-app.railway.app/api` |

### Context Mode Configuration

The extension supports four context modes that you can select in the UI:

- **None**: No context shared with the agent
- **File**: Shares current file name and programming language
- **Selection**: Shares selected text, cursor position, and file info
- **Workspace**: Shares workspace name and project structure

### Security Configuration

The extension prioritizes security by reading sensitive configuration from environment variables:

#### Security Best Practices

1. **Use Environment Variables**: Never hardcode API keys in VSCode settings
   ```bash
   # Secure - environment variable
   export GIDE_API_KEY="your_api_key_here"
   
   # Insecure - don't do this
   # "gide-coding-agent.apiKey": "hardcoded_key_in_settings"
   ```

2. **Regular Key Rotation**: Rotate API keys regularly, especially for production
   ```bash
   # Update your Railway service
   railway variables set GIDE_API_KEY="new_rotated_key"
   ```

3. **Context Mode Selection**: Choose appropriate context sharing levels
   - **None**: For highly sensitive codebases
   - **File**: For general development
   - **Selection**: For specific code assistance
   - **Workspace**: For project-wide context (use with caution)

4. **Monitoring**: Monitor agent requests through conversation history

5. **Network Security**: Ensure your agent endpoint uses HTTPS
   ```bash
   # Secure endpoint
   GIDE_AGENT_ENDPOINT=https://your-service.railway.app/api/chat
   
   # Avoid HTTP in production
   # GIDE_AGENT_ENDPOINT=http://insecure-endpoint.com/api/chat
   ```

#### Error Handling

The extension provides clean error messages for missing or invalid configuration:

- Missing `GIDE_AGENT_ENDPOINT`: Shows setup instructions
- Invalid endpoint URL: Validates URL format
- Network errors: Provides clear connection failure messages
- Timeout errors: Suggests timeout adjustment options

#### Configuration Validation

On startup, the extension:
1. Validates all required environment variables
2. Checks endpoint URL format
3. Shows warning messages for missing optional configuration
4. Provides links to setup documentation

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

# Install dependencies with yarn
yarn install

# Build the extension
yarn build

# Watch for changes during development
yarn watch
```

### Testing

```bash
# Run unit tests
yarn test

# Run linting (when configured)
yarn lint
```

## Configuration

### Environment Variables

The extension uses the following environment variables for secure configuration:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GIDE_AGENT_ENDPOINT` | Railway agent service URL | `https://your-service.railway.app/api/chat` |

#### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GIDE_API_KEY` | API key for agent authentication | - | `sk-proj-...` |
| `GIDE_MODEL_PROVIDER` | AI model provider | - | `openai`, `anthropic` |
| `GIDE_MODEL_NAME` | Specific model to use | - | `gpt-4`, `claude-3-sonnet` |
| `GIDE_REQUEST_TIMEOUT` | Request timeout (ms) | `30000` | `45000` |

### Setting Up Environment Variables

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file with your values:**
   ```bash
   GIDE_AGENT_ENDPOINT=https://your-agent-service.railway.app/api/chat
   GIDE_API_KEY=your_api_key_here
   GIDE_MODEL_PROVIDER=openai
   GIDE_MODEL_NAME=gpt-4
   ```

3. **Set system environment variables** (recommended for production):
   
   **Linux/macOS:**
   ```bash
   export GIDE_AGENT_ENDPOINT="https://your-service.railway.app/api/chat"
   export GIDE_API_KEY="your_api_key_here"
   export GIDE_MODEL_PROVIDER="openai"
   export GIDE_MODEL_NAME="gpt-4"
   ```
   
   **Windows:**
   ```cmd
   set GIDE_AGENT_ENDPOINT=https://your-service.railway.app/api/chat
   set GIDE_API_KEY=your_api_key_here
   set GIDE_MODEL_PROVIDER=openai
   set GIDE_MODEL_NAME=gpt-4
   ```

4. **VSCode settings** (less secure for API keys):
   - Open VSCode settings (`Ctrl/Cmd + ,`)
   - Search for "gide-coding-agent"
   - Configure the settings directly

### Production Deployment

For production deployments, ensure all environment variables are set securely:

#### Railway Deployment
```bash
# Set environment variables in Railway
railway variables set GIDE_AGENT_ENDPOINT="https://your-service.railway.app/api/chat"
railway variables set GIDE_API_KEY="your_api_key_here"
railway variables set GIDE_MODEL_PROVIDER="openai"
railway variables set GIDE_MODEL_NAME="gpt-4"
```

#### Docker Deployment
```bash
docker run -e GIDE_AGENT_ENDPOINT="https://your-service.railway.app/api/chat" \
           -e GIDE_API_KEY="your_api_key" \
           -e GIDE_MODEL_PROVIDER="openai" \
           -e GIDE_MODEL_NAME="gpt-4" \
           your-vscode-image
```

#### Kubernetes Deployment
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gide-agent-config
data:
  api-key: <base64-encoded-api-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vscode-with-gide
spec:
  template:
    spec:
      containers:
      - name: vscode
        env:
        - name: GIDE_AGENT_ENDPOINT
          value: "https://your-service.railway.app/api/chat"
        - name: GIDE_API_KEY
          valueFrom:
            secretKeyRef:
              name: gide-agent-config
              key: api-key
```

### Project Structure

```
gide-coding-agent/
├── src/
│   ├── extension.ts              # Extension entry point
│   ├── webviewHost.ts           # Webview management and communication
│   ├── agent/
│   │   └── AgentClient.ts       # Railway API client
│   ├── actions/
│   │   └── codeSuggestions.ts   # Code insertion and actions
│   ├── state/
│   │   └── agentStore.ts        # Zustand state management
│   ├── utils/
│   │   ├── sanitize.ts          # Security utilities
│   │   └── contextCollector.ts  # VSCode context collection
│   └── __tests__/
│       └── extension.test.ts     # Test suite
├── media/
│   └── styles.css               # Webview styling
├── package.json                 # Extension manifest
├── tsconfig.json               # TypeScript config
├── ARCHITECTURE.md             # Architecture documentation
└── README.md                   # This file
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

#### "Missing required environment variables" Error
- **Cause**: `GIDE_AGENT_ENDPOINT` not set
- **Solution**: Set the required environment variable:
  ```bash
  export GIDE_AGENT_ENDPOINT="https://your-service.railway.app/api/chat"
  ```
- **Alternative**: Configure in VSCode settings (less secure)

#### "Invalid agent endpoint URL" Error
- **Cause**: Malformed URL in configuration
- **Solution**: Ensure URL is properly formatted with protocol:
  ```bash
  # Correct
  GIDE_AGENT_ENDPOINT=https://my-service.railway.app/api/chat
  
  # Incorrect
  GIDE_AGENT_ENDPOINT=my-service.railway.app/api/chat
  ```

#### "Configuration Required" Error
- **Cause**: Agent endpoint not configured or empty
- **Solution**: Set `GIDE_AGENT_ENDPOINT` environment variable or configure in settings

#### "Connection Failed" Error
- **Cause**: Network issues, agent downtime, or authentication failure
- **Solutions**:
  - Check network connection and Railway app status
  - Verify `GIDE_API_KEY` if your service requires authentication
  - Test endpoint directly with curl:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -H "Authorization: Bearer $GIDE_API_KEY" \
         -d '{"request":"ping"}' \
         $GIDE_AGENT_ENDPOINT
    ```

#### "Request Timeout" Error
- **Cause**: Agent response taking too long
- **Solutions**: 
  - Increase timeout: `GIDE_REQUEST_TIMEOUT=60000` (60 seconds)
  - Check agent performance and resource allocation

#### React/UI Errors
- **Cause**: JavaScript errors in the webview
- **Solution**: Use "Try Again" button or reload the extension

### Environment Variable Debugging

1. **Check if variables are set:**
   ```bash
   echo $GIDE_AGENT_ENDPOINT
   echo $GIDE_API_KEY  # (will show asterisks for security)
   ```

2. **Verify in VSCode:**
   - Open VSCode terminal
   - Run: `printenv | grep GIDE`

3. **Test configuration:**
   - Open Gide Coding Agent panel
   - Check for configuration error messages
   - Look in VSCode Developer Console for detailed logs

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

### Completed Features ✅
- [x] Multi-turn conversation history with Zustand state management
- [x] Context-aware requests with user-selectable modes (none/file/selection/workspace)
- [x] Code suggestion extraction and insertion actions
- [x] VSCode integration (insert at cursor, copy to clipboard, create new file)
- [x] Comprehensive input/output sanitization
- [x] Railway endpoint integration with secure configuration
- [x] Error boundaries and graceful error recovery
- [x] Real-time context updates and refresh capability
- [x] Comprehensive test coverage for all features
- [x] Command palette integration with multiple commands

### Planned Features 🚧
- [ ] **Streaming Responses**: Real-time response streaming from Railway agents
- [ ] **Inline Code Completion**: Direct inline suggestions like GitHub Copilot
- [ ] **Custom Commands**: User-defined agent commands and shortcuts
- [ ] **Conversation Export**: Export chat history for documentation
- [ ] **Advanced Context**: Git information, dependencies, and project analysis
- [ ] **Multi-Agent Support**: Connect to multiple specialized coding agents
- [ ] **Plugin Architecture**: Support for custom agent integrations
- [ ] **Performance Optimization**: Response caching and request batching

### Performance Improvements
- [ ] Response caching
- [ ] Connection pooling
- [ ] Memory optimization
- [ ] Advanced conversation search and filtering

### Future Considerations 💭
- Local model support for offline usage
- Integration with other coding assistants
- Advanced code analysis and refactoring
- Team collaboration features
- Custom model fine-tuning support

---

**Note**: This extension is designed specifically for the Gide VSCode fork and Railway deployment. For other environments, modifications may be required.