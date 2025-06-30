/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import { ContextWatcher, collectVSCodeContext, formatContextForDisplay } from './utils/contextCollector';
import { CodeSuggestionProvider } from './actions/codeSuggestions';
import { selectRelevantContext } from './state/agentStore';

/**
 * Manages the webview hosting the React UI for the coding agent
 * Handles communication between VSCode and the React components
 */
export class WebviewHost implements vscode.Disposable {
	private panel: vscode.WebviewPanel | undefined;
	private readonly disposables: vscode.Disposable[] = [];
	private contextWatcher: ContextWatcher;

	constructor(private readonly context: vscode.ExtensionContext) {
		this.contextWatcher = new ContextWatcher();
		this.disposables.push(this.contextWatcher);
		
		// Set up context change listener
		this.contextWatcher.onContextChanged((context) => {
			this.panel?.webview.postMessage({
				type: 'contextChanged',
				payload: context
			});
		});
	}

	/**
	 * Shows the coding agent panel, creating it if necessary
	 */
	public showPanel(): void {
		if (this.panel) {
			this.panel.reveal();
			return;
		}

		this.panel = vscode.window.createWebviewPanel(
			'gide-coding-agent',
			'Gide Coding Agent',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
				]
			}
		);

		this.panel.webview.html = this.getWebviewContent();

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(
			message => this.handleWebviewMessage(message),
			undefined,
			this.disposables
		);
		
		// Send initial context
		this.sendInitialContext();

		// Clean up when panel is disposed
		this.panel.onDidDispose(
			() => {
				this.panel = undefined;
			},
			null,
			this.disposables
		);
	}

	/**
	 * Handles messages sent from the React UI
	 */
	private async handleWebviewMessage(message: any): Promise<void> {
		try {
			switch (message.type) {
				case 'getConfig':
					await this.sendConfig();
					break;
				case 'sendAgentRequest':
					await this.handleAgentRequest(message.payload);
					break;
				case 'getContext':
					await this.sendCurrentContext();
					break;
				case 'refreshContext':
					await this.refreshContext();
					break;
				case 'processCodeSuggestions':
					await this.handleCodeSuggestions(message.payload);
					break;
				case 'error':
					console.error('Webview error:', message.payload);
					vscode.window.showErrorMessage(`Coding Agent Error: ${message.payload}`);
					break;
				default:
					console.warn('Unknown message type:', message.type);
			}
		} catch (error) {
			console.error('Error handling webview message:', error);
			this.panel?.webview.postMessage({
				type: 'error',
				payload: error instanceof Error ? error.message : 'Unknown error occurred'
			});
		}
	}

	/**
	 * Sends configuration to the webview
	 */
	private async sendConfig(): Promise<void> {
		const config = vscode.workspace.getConfiguration('gide-coding-agent');
		const agentEndpoint = config.get<string>('agentEndpoint') || process.env.GIDE_AGENT_ENDPOINT || '';
		const requestTimeout = config.get<number>('requestTimeout') || 30000;

		this.panel?.webview.postMessage({
			type: 'config',
			payload: {
				agentEndpoint,
				requestTimeout
			}
		});
	}

	/**
	 * Handles agent requests from the UI
	 */
	private async handleAgentRequest(payload: any): Promise<void> {
		const { AgentClient } = await import('./agent/AgentClient');
		
		try {
			const config = vscode.workspace.getConfiguration('gide-coding-agent');
			const agentEndpoint = config.get<string>('agentEndpoint') || process.env.GIDE_AGENT_ENDPOINT || '';
			const requestTimeout = config.get<number>('requestTimeout') || 30000;

			if (!agentEndpoint) {
				this.panel?.webview.postMessage({
					type: 'agentResponse',
					payload: {
						id: payload.id,
						response: 'Agent endpoint not configured',
						success: false,
						error: 'No agent endpoint configured'
					}
				});
				return;
			}

			const client = new AgentClient({
				endpoint: agentEndpoint,
				timeout: requestTimeout
			});

			// Collect current context based on mode
			const currentContext = await collectVSCodeContext();
			const relevantContext = selectRelevantContext(currentContext, payload.contextMode || 'file');
			
			const response = await client.sendRequest({
				id: payload.id,
				request: payload.request,
				context: relevantContext || payload.context
			});

			this.panel?.webview.postMessage({
				type: 'agentResponse',
				payload: response
			});

		} catch (error) {
			console.error('Agent request failed:', error);
			this.panel?.webview.postMessage({
				type: 'agentResponse',
				payload: {
					id: payload.id,
					response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		}
	}

	/**
	 * Generates the HTML content for the webview
	 */
	private getWebviewContent(): string {
		const stylesUri = this.panel?.webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css')
		);

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Gide Coding Agent</title>
			<link href="${stylesUri}" rel="stylesheet">
			<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
			<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
			<script src="https://unpkg.com/zustand@4.4.0/umd/index.js"></script>
			<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
		</head>
		<body>
			<div id="root"></div>
			<script type="text/babel">
				const { useState, useEffect, useCallback } = React;
				const vscode = acquireVsCodeApi();
				
				// Use Zustand from global
				const { create } = window.zustand;

				// Agent store using Zustand
				const useAgentStore = create((set, get) => ({
					// State
					config: null,
					conversations: [],
					currentRequest: '',
					isLoading: false,
					isConnected: false,
					connectionError: null,
					error: null,
					contextMode: 'file',
					vsCodeContext: null,
					
					// Actions
					setConfig: (config) => set({ config }),
					updateConfig: (updates) => set((state) => ({ 
						config: state.config ? { ...state.config, ...updates } : null 
					})),
					
					setCurrentRequest: (currentRequest) => set({ currentRequest }),
					addConversation: (conversation) => set((state) => ({
						conversations: [...state.conversations, conversation]
					})),
					clearConversations: () => set({ conversations: [] }),
					
					setLoading: (isLoading) => set({ isLoading }),
					setConnected: (isConnected, connectionError = null) => set({ 
						isConnected, 
						connectionError 
					}),
					setError: (error) => set({ error }),
					
					setContextMode: (contextMode) => set({ contextMode }),
					setVSCodeContext: (vsCodeContext) => set({ vsCodeContext }),
					
					reset: () => set({
						config: null,
						conversations: [],
						currentRequest: '',
						isLoading: false,
						isConnected: false,
						connectionError: null,
						error: null,
						contextMode: 'file',
						vsCodeContext: null
					})
				}));

				// Error Boundary Component
				class ErrorBoundary extends React.Component {
					constructor(props) {
						super(props);
						this.state = { hasError: false, error: null };
					}

					static getDerivedStateFromError(error) {
						return { hasError: true, error };
					}

					componentDidCatch(error, errorInfo) {
						console.error('React Error Boundary caught an error:', error, errorInfo);
						vscode.postMessage({
							type: 'error',
							payload: \`React Error: \${error.message}\`
						});
					}

					render() {
						if (this.state.hasError) {
							return (
								<div className="error-boundary">
									<div className="error-boundary-content">
										<h3>⚠️ Something went wrong</h3>
										<p>{this.state.error?.message || 'An unknown error occurred'}</p>
										<div className="error-actions">
											<button 
												onClick={() => this.setState({ hasError: false, error: null })}
												className="retry-button"
											>
												Try Again
											</button>
										</div>
									</div>
								</div>
							);
						}

						return this.props.children;
					}
				}

				// Context Mode Selector Component
				const ContextModeSelector = () => {
					const { contextMode, setContextMode, vsCodeContext } = useAgentStore();
					
					const contextModes = [
						{ value: 'none', label: 'No Context', description: 'No context will be sent' },
						{ value: 'file', label: 'Current File', description: 'File name and language' },
						{ value: 'selection', label: 'Selection', description: 'Selected text and position' },
						{ value: 'workspace', label: 'Workspace', description: 'Workspace information' }
					];
					
					const formatContext = (context) => {
						if (!context) return 'No context available';
						
						const parts = [];
						if (context.currentFile) parts.push(\`File: \${context.currentFile}\`);
						if (context.language) parts.push(\`Language: \${context.language}\`);
						if (context.selectedText) {
							const preview = context.selectedText.length > 30 
								? context.selectedText.substring(0, 30) + '...'
								: context.selectedText;
							parts.push(\`Selection: "\${preview}"\`);
						}
						if (context.workspaceRoot) parts.push(\`Workspace: \${context.workspaceRoot}\`);
						
						return parts.join(' | ') || 'No context available';
					};
					
					return (
						<div className="context-selector">
							<h4>Context Mode</h4>
							<select 
								value={contextMode} 
								onChange={(e) => setContextMode(e.target.value)}
								className="context-mode-select"
							>
								{contextModes.map(mode => (
									<option key={mode.value} value={mode.value}>
										{mode.label} - {mode.description}
									</option>
								))}
							</select>
							<div className="current-context">
								<small>{formatContext(vsCodeContext)}</small>
							</div>
						</div>
					);
				};

				// Code Suggestion Button Component
				const CodeSuggestionButton = ({ response }) => {
					const handleCodeSuggestions = () => {
						vscode.postMessage({
							type: 'processCodeSuggestions',
							payload: { response }
						});
					};
					
					// Check if response contains code blocks
					const hasCodeBlocks = response && (
						response.includes('\`\`\`') || 
						response.includes('\`') || 
						response.includes('function') ||
						response.includes('class ') ||
						response.includes('const ') ||
						response.includes('let ') ||
						response.includes('var ')
					);
					
					if (!hasCodeBlocks) return null;
					
					return (
						<button 
							onClick={handleCodeSuggestions}
							className="code-suggestion-btn"
							title="Extract and insert code suggestions"
						>
							📋 Code Actions
						</button>
					);
				};

				// Sanitization utility
				const sanitize = {
					html: (str) => {
						if (typeof str !== 'string') return '';
						const div = document.createElement('div');
						div.textContent = str;
						return div.innerHTML;
					},
					input: (str) => {
						if (typeof str !== 'string') return '';
						return str.replace(/[<>'"&]/g, char => {
							const chars = {
								'<': '&lt;',
								'>': '&gt;',
								'"': '&quot;',
								"'": '&#x27;',
								'&': '&amp;'
							};
							return chars[char] || char;
						});
					}
				};

				// Main Agent Panel Component
				const AgentPanel = () => {
					const store = useAgentStore();
					const {
						config, conversations, currentRequest, isLoading, isConnected, 
						connectionError, error, contextMode, vsCodeContext,
						setConfig, setCurrentRequest, addConversation, clearConversations,
						setLoading, setConnected, setError, setVSCodeContext
					} = store;

					useEffect(() => {
						// Request config on mount
						vscode.postMessage({ type: 'getConfig' });
						vscode.postMessage({ type: 'getContext' });

						// Listen for messages from extension
						const messageHandler = (event) => {
							const message = event.data;
							switch (message.type) {
								case 'config':
									setConfig(message.payload);
									break;
								case 'agentResponse':
									const newConversation = {
										id: message.payload.id,
										request: currentRequest,
										response: message.payload.response,
										success: message.payload.success,
										error: message.payload.error,
										timestamp: new Date().toLocaleTimeString(),
										metadata: message.payload.metadata,
										context: vsCodeContext
									};
									addConversation(newConversation);
									setLoading(false);
									if (message.payload.success) {
										setCurrentRequest('');
									}
									break;
								case 'contextChanged':
								case 'currentContext':
									setVSCodeContext(message.payload);
									break;
								case 'error':
									setError(message.payload);
									setLoading(false);
									break;
							}
						};

						window.addEventListener('message', messageHandler);
						return () => window.removeEventListener('message', messageHandler);
					}, []);

					const handleSubmit = (e) => {
						e.preventDefault();
						if (!currentRequest.trim() || isLoading) return;

						const sanitizedRequest = sanitize.input(currentRequest);
						setLoading(true);
						setError(null);

						vscode.postMessage({
							type: 'sendAgentRequest',
							payload: {
								id: Date.now().toString(),
								request: sanitizedRequest,
								contextMode: contextMode,
								context: {
									timestamp: new Date().toISOString()
								}
							}
						});
					};

					const handleInputChange = (e) => {
						setCurrentRequest(e.target.value);
					};

					const handleClearHistory = () => {
						if (window.confirm('Are you sure you want to clear all conversations?')) {
							clearConversations();
						}
					};

					const handleTestConnection = () => {
						setLoading(true);
						setError(null);
						// Simulate connection test
						setTimeout(() => {
							setLoading(false);
							setConnected(Math.random() > 0.5, Math.random() > 0.5 ? null : 'Connection test failed');
						}, 1000);
					};

					const handleRefreshContext = () => {
						vscode.postMessage({ type: 'refreshContext' });
					};

					if (!config) {
						return (
							<div className="loading-container">
								<div className="loading-spinner"></div>
								<p>Loading configuration...</p>
							</div>
						);
					}

					if (!config.agentEndpoint) {
						return (
							<div className="config-error">
								<h3>⚠️ Configuration Required</h3>
								<p>
									Please configure the agent endpoint in VSCode settings or set the 
									<code>GIDE_AGENT_ENDPOINT</code> environment variable.
								</p>
								<p>
									Go to: <strong>File → Preferences → Settings → Extensions → Gide Coding Agent</strong>
								</p>
							</div>
						);
					}

					return (
						<div className="agent-panel">
							<header className="agent-header">
								<h1>🤖 Gide Coding Agent</h1>
								<div className="agent-status">
									<span className="endpoint-info">
										Endpoint: {sanitize.html(config.agentEndpoint)}
									</span>
									<button 
										onClick={handleTestConnection}
										disabled={isLoading}
										className="test-connection-btn"
									>
										{isLoading ? 'Testing...' : 'Test Connection'}
									</button>
								</div>
							</header>

							{error && (
								<div className="error-message">
									<strong>Error:</strong> {sanitize.html(error)}
									<button 
										onClick={() => setError(null)} 
										className="clear-error-btn"
									>
										✕
									</button>
								</div>
							)}

							{connectionError && (
								<div className="connection-status disconnected">
									❌ {sanitize.html(connectionError)}
								</div>
							)}

							{isConnected && (
								<div className="connection-status connected">
									✅ Connected successfully
								</div>
							)}

							<ContextModeSelector />

							<form onSubmit={handleSubmit} className="request-form">
								<div className="input-group">
									<label htmlFor="request-input">Your Request:</label>
									<textarea
										id="request-input"
										value={currentRequest}
										onChange={handleInputChange}
										placeholder="Enter your coding request here... (e.g., 'Create a function to sort an array', 'Explain this code', 'Fix the bug in this function')"
										disabled={isLoading}
										rows={4}
									/>
								</div>

								<div className="form-actions">
									<button 
										type="submit" 
										disabled={!currentRequest.trim() || isLoading}
										className="send-btn"
									>
										{isLoading ? (
											<>
												<span className="loading-spinner small"></span>
												Sending...
											</>
										) : (
											'Send Request'
										)}
									</button>
									
									<button 
										type="button"
										onClick={handleRefreshContext}
										disabled={isLoading}
										className="refresh-context-btn"
									>
										🔄 Refresh Context
									</button>
									
									{conversations.length > 0 && (
										<button 
											type="button"
											onClick={handleClearHistory}
											disabled={isLoading}
											className="clear-btn"
										>
											Clear History
										</button>
									)}
								</div>
							</form>

							<div className="conversations">
								{conversations.length === 0 ? (
									<div className="no-conversations">
										<p>No conversations yet. Send your first request to get started!</p>
									</div>
								) : (
									<>
										<h3>Conversation History ({conversations.length})</h3>
										<div className="conversations-list">
											{conversations.map((conversation, index) => (
												<div key={conversation.id || index} className="conversation-entry">
													<div className="conversation-header">
														<span className="conversation-timestamp">
															{conversation.timestamp}
														</span>
														<span className={\`conversation-status \${conversation.success ? 'success' : 'error'}\`}>
															{conversation.success ? '✓' : '✗'}
														</span>
													</div>
													
													<div className="conversation-request">
														<h4>Request:</h4>
														<div className="conversation-content">
															{sanitize.html(conversation.request)}
														</div>
													</div>
													
													<div className="conversation-response">
														<h4>Response:</h4>
														<div className="conversation-content">
															{sanitize.html(conversation.response)}
														</div>
														
														<div className="conversation-actions">
															<CodeSuggestionButton response={conversation.response} />
														</div>
														
														{conversation.error && (
															<div className="conversation-error">
																Error: {sanitize.html(conversation.error)}
															</div>
														)}
														
														{conversation.metadata && (
															<div className="conversation-metadata">
																{conversation.metadata.model && (
																	<span>Model: {sanitize.html(conversation.metadata.model)}</span>
																)}
																{conversation.metadata.tokensUsed && (
																	<span>Tokens: {conversation.metadata.tokensUsed}</span>
																)}
																{conversation.metadata.processingTime && (
																	<span>Time: {conversation.metadata.processingTime}ms</span>
																)}
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									</>
								)}
							</div>
						</div>
					);
				};

				// Render the application
				ReactDOM.render(
					<ErrorBoundary>
						<AgentPanel />
					</ErrorBoundary>,
					document.getElementById('root')
				);
			</script>
		</body>
		</html>`;
	}

	/**
	 * Sends initial context to the webview
	 */
	private async sendInitialContext(): Promise<void> {
		const context = await collectVSCodeContext();
		this.panel?.webview.postMessage({
			type: 'contextChanged',
			payload: context
		});
	}
	
	/**
	 * Sends current context to the webview
	 */
	private async sendCurrentContext(): Promise<void> {
		const context = await collectVSCodeContext();
		this.panel?.webview.postMessage({
			type: 'currentContext',
			payload: context
		});
	}
	
	/**
	 * Refreshes context and notifies webview
	 */
	private async refreshContext(): Promise<void> {
		await this.contextWatcher.notifyContextChanged();
	}
	
	/**
	 * Handles code suggestion processing
	 */
	private async handleCodeSuggestions(payload: any): Promise<void> {
		try {
			if (payload.response) {
				await CodeSuggestionProvider.showInteractivePicker(payload.response);
			}
		} catch (error) {
			console.error('Error processing code suggestions:', error);
			vscode.window.showErrorMessage(`Error processing code suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Dispose of resources
	 */
	public dispose(): void {
		this.panel?.dispose();
		this.disposables.forEach(disposable => disposable.dispose());
	}
}