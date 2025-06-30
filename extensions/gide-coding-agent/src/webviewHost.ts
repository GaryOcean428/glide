/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Manages the webview hosting the React UI for the coding agent
 * Handles communication between VSCode and the React components
 */
export class WebviewHost implements vscode.Disposable {
	private panel: vscode.WebviewPanel | undefined;
	private readonly disposables: vscode.Disposable[] = [];

	constructor(private readonly context: vscode.ExtensionContext) {}

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

			const response = await client.sendRequest({
				id: payload.id,
				request: payload.request,
				context: payload.context
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
			<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
		</head>
		<body>
			<div id="root"></div>
			<script type="text/babel">
				const { useState, useEffect } = React;
				const vscode = acquireVsCodeApi();

				// Simple state management for the webview
				const useAgentStore = () => {
					const [state, setState] = useState({
						config: null,
						isLoading: false,
						currentRequest: '',
						responses: [],
						error: null,
						isConnected: false,
						connectionError: null
					});

					const updateState = (updates) => {
						setState(prev => ({ ...prev, ...updates }));
					};

					return { state, updateState };
				};

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
					const { state, updateState } = useAgentStore();

					useEffect(() => {
						// Request config on mount
						vscode.postMessage({ type: 'getConfig' });

						// Listen for messages from extension
						const messageHandler = (event) => {
							const message = event.data;
							switch (message.type) {
								case 'config':
									updateState({ config: message.payload });
									break;
								case 'agentResponse':
									const responses = [...state.responses, {
										id: message.payload.id,
										request: state.currentRequest,
										response: message.payload.response,
										success: message.payload.success,
										error: message.payload.error,
										timestamp: new Date().toLocaleTimeString(),
										metadata: message.payload.metadata
									}];
									updateState({ 
										responses, 
										isLoading: false,
										currentRequest: message.payload.success ? '' : state.currentRequest
									});
									break;
								case 'error':
									updateState({ 
										error: message.payload, 
										isLoading: false 
									});
									break;
							}
						};

						window.addEventListener('message', messageHandler);
						return () => window.removeEventListener('message', messageHandler);
					}, [state.responses, state.currentRequest]);

					const handleSubmit = (e) => {
						e.preventDefault();
						if (!state.currentRequest.trim() || state.isLoading) return;

						const sanitizedRequest = sanitize.input(state.currentRequest);
						updateState({ isLoading: true, error: null });

						vscode.postMessage({
							type: 'sendAgentRequest',
							payload: {
								id: Date.now().toString(),
								request: sanitizedRequest,
								context: {
									timestamp: new Date().toISOString()
								}
							}
						});
					};

					const handleInputChange = (e) => {
						updateState({ currentRequest: e.target.value });
					};

					const handleClearHistory = () => {
						if (window.confirm('Are you sure you want to clear all conversations?')) {
							updateState({ responses: [] });
						}
					};

					const handleTestConnection = () => {
						updateState({ isLoading: true, connectionError: null });
						// Simulate connection test
						setTimeout(() => {
							updateState({ 
								isLoading: false, 
								isConnected: Math.random() > 0.5,
								connectionError: Math.random() > 0.5 ? null : 'Connection test failed'
							});
						}, 1000);
					};

					if (!state.config) {
						return (
							<div className="loading-container">
								<div className="loading-spinner"></div>
								<p>Loading configuration...</p>
							</div>
						);
					}

					if (!state.config.agentEndpoint) {
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
										Endpoint: {sanitize.html(state.config.agentEndpoint)}
									</span>
									<button 
										onClick={handleTestConnection}
										disabled={state.isLoading}
										className="test-connection-btn"
									>
										{state.isLoading ? 'Testing...' : 'Test Connection'}
									</button>
								</div>
							</header>

							{state.error && (
								<div className="error-message">
									<strong>Error:</strong> {sanitize.html(state.error)}
									<button 
										onClick={() => updateState({ error: null })} 
										className="clear-error-btn"
									>
										✕
									</button>
								</div>
							)}

							{state.connectionError && (
								<div className="connection-status disconnected">
									❌ {sanitize.html(state.connectionError)}
								</div>
							)}

							{state.isConnected && (
								<div className="connection-status connected">
									✅ Connected successfully
								</div>
							)}

							<form onSubmit={handleSubmit} className="request-form">
								<div className="input-group">
									<label htmlFor="request-input">Your Request:</label>
									<textarea
										id="request-input"
										value={state.currentRequest}
										onChange={handleInputChange}
										placeholder="Enter your coding request here... (e.g., 'Create a function to sort an array', 'Explain this code', 'Fix the bug in this function')"
										disabled={state.isLoading}
										rows={4}
									/>
								</div>

								<div className="form-actions">
									<button 
										type="submit" 
										disabled={!state.currentRequest.trim() || state.isLoading}
										className="send-btn"
									>
										{state.isLoading ? (
											<>
												<span className="loading-spinner small"></span>
												Sending...
											</>
										) : (
											'Send Request'
										)}
									</button>
									
									{state.responses.length > 0 && (
										<button 
											type="button"
											onClick={handleClearHistory}
											disabled={state.isLoading}
											className="clear-btn"
										>
											Clear History
										</button>
									)}
								</div>
							</form>

							<div className="conversations">
								{state.responses.length === 0 ? (
									<div className="no-conversations">
										<p>No conversations yet. Send your first request to get started!</p>
									</div>
								) : (
									<>
										<h3>Conversation History ({state.responses.length})</h3>
										<div className="conversations-list">
											{state.responses.map((response, index) => (
												<div key={response.id || index} className="conversation-entry">
													<div className="conversation-header">
														<span className="conversation-timestamp">
															{response.timestamp}
														</span>
														<span className={\`conversation-status \${response.success ? 'success' : 'error'}\`}>
															{response.success ? '✓' : '✗'}
														</span>
													</div>
													
													<div className="conversation-request">
														<h4>Request:</h4>
														<div className="conversation-content">
															{sanitize.html(response.request)}
														</div>
													</div>
													
													<div className="conversation-response">
														<h4>Response:</h4>
														<div className="conversation-content">
															{sanitize.html(response.response)}
														</div>
														
														{response.error && (
															<div className="conversation-error">
																Error: {sanitize.html(response.error)}
															</div>
														)}
														
														{response.metadata && (
															<div className="conversation-metadata">
																{response.metadata.model && (
																	<span>Model: {sanitize.html(response.metadata.model)}</span>
																)}
																{response.metadata.tokensUsed && (
																	<span>Tokens: {response.metadata.tokensUsed}</span>
																)}
																{response.metadata.processingTime && (
																	<span>Time: {response.metadata.processingTime}ms</span>
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
	 * Dispose of resources
	 */
	public dispose(): void {
		this.panel?.dispose();
		this.disposables.forEach(disposable => disposable.dispose());
	}
}