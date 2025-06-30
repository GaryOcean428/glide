# Gide Coding Agent Extension - Architecture

## Overview

The Gide Coding Agent extension is a comprehensive scaffold for integrating a Railway-hosted coding agent directly into the VSCode fork (Gide). This extension follows modern development practices and VSCode's extension architecture guidelines.

## Architecture Components

### Extension System Integration

The extension integrates with VSCode's existing `remoteCodingAgents` infrastructure:

- **Extension Point**: Registers with the `remoteCodingAgents` extension point
- **Service Integration**: Works with the existing `IRemoteCodingAgentsService`
- **Command System**: Provides commands through VSCode's command palette
- **Configuration**: Uses VSCode's settings system for configuration

### Core Components

#### 1. Extension Entry Point (`extension.ts`)
- **Purpose**: Main activation/deactivation lifecycle management
- **Responsibilities**: 
  - Register commands and webview host
  - Initialize extension services
  - Handle extension lifecycle events

#### 2. Webview Host (`webviewHost.ts`)
- **Purpose**: Bridge between VSCode extension API and React UI
- **Responsibilities**:
  - Create and manage webview panels
  - Handle message passing between extension and UI
  - Manage webview lifecycle and state

#### 3. Agent Client (`agent/AgentClient.ts`)
- **Purpose**: Secure API abstraction for Railway agent communication
- **Design Patterns**:
  - Configuration validation and sanitization
  - Request/response type safety
  - Error handling and retry logic
  - Security-first approach with input sanitization

#### 4. State Management (`state/agentStore.ts`)
- **Purpose**: Centralized state management using Zustand
- **Benefits**:
  - Predictable state updates
  - Easy testing and debugging
  - Extensible architecture
  - TypeScript integration

#### 5. UI Components (`ui/`)
- **AgentPanel.tsx**: Main UI component with modern React hooks
- **ErrorBoundary.tsx**: Comprehensive error handling and recovery
- **Design Principles**:
  - Functional components with hooks
  - Error boundaries for fault tolerance
  - Accessibility and VSCode theme integration

#### 6. Utilities (`utils/sanitize.ts`)
- **Purpose**: Security-focused input/output sanitization
- **Features**:
  - XSS prevention
  - Input validation
  - URL sanitization
  - JSON data cleaning

## State Flow

### Initialization Flow
1. Extension activation triggers webview creation
2. Webview requests configuration from extension
3. Extension provides sanitized configuration
4. UI initializes state store with configuration
5. Agent client is created and connection tested

### Request Flow
1. User enters request in UI
2. Input sanitization and validation
3. State store dispatches request action
4. Agent client sends HTTP request to Railway endpoint
5. Response sanitization and validation
6. State store updates with conversation entry
7. UI renders updated conversation history

### Error Flow
1. Error occurs at any level (network, parsing, etc.)
2. Error boundary catches React errors
3. State store maintains error state
4. User receives appropriate error messaging
5. Recovery options provided (retry, reload, etc.)

## Security Architecture

### Input Sanitization
- All user input sanitized before processing
- HTML entity encoding for display
- URL validation for endpoints
- File path sanitization for security

### Network Security
- HTTPS-only communication with Railway
- Request timeout protection
- No hardcoded credentials or endpoints
- Environment variable support

### Error Handling
- Comprehensive error boundaries
- Sanitized error messages
- No sensitive data exposure
- Graceful degradation

## Configuration Design

### Extension Settings
```json
{
  "gide-coding-agent.agentEndpoint": {
    "type": "string",
    "description": "Railway agent endpoint URL"
  },
  "gide-coding-agent.requestTimeout": {
    "type": "number", 
    "default": 30000,
    "description": "Request timeout in milliseconds"
  }
}
```

### Environment Variables
- `GIDE_AGENT_ENDPOINT`: Primary configuration method
- Falls back to VSCode settings if environment variable not set
- No default hardcoded endpoints for security

## Deployment Architecture

### Railway Integration
- Single-service deployment model
- RESTful API endpoint
- JSON request/response format
- Stateless request handling

### Extension Packaging
- Standard VSCode extension format
- TypeScript compilation to JavaScript
- Asset bundling for webview resources
- Dependency management with npm

## Testing Strategy

### Unit Testing
- Component testing with Jest
- State management testing
- Utility function testing
- Error handling verification

### Integration Testing
- End-to-end extension testing
- Webview communication testing
- API client testing with mock servers
- Configuration validation testing

## Extension Points

### VSCode Integration
- Command contributions for panel opening
- Configuration contributions for settings
- Remote coding agents registration
- Webview provider registration

### Future Extensibility
- Plugin architecture for additional features
- Custom model support
- Multiple agent endpoint support
- Advanced conversation management

## Performance Considerations

### Memory Management
- Proper disposal of webview resources
- Event listener cleanup
- State store memory efficiency
- Conversation history limits

### Network Optimization
- Request timeout management
- Connection pooling considerations
- Response caching strategies
- Offline capability planning

## Development Guidelines

### Code Style
- VSCode coding guidelines compliance
- TypeScript strict mode
- Tab indentation (4 spaces)
- JSDoc documentation for public APIs

### Error Handling
- Fail-safe error boundaries
- User-friendly error messages
- Comprehensive logging
- Recovery mechanisms

### Security First
- Input sanitization at all boundaries
- No client-side secret storage
- HTTPS-only communication
- Regular security reviews

## Monitoring and Diagnostics

### Logging Strategy
- Console logging for development
- VSCode output channel for production
- Error tracking and reporting
- Performance metrics collection

### Debugging Support
- Source map generation
- Development mode configurations
- Webview debugging capabilities
- Extension host debugging integration