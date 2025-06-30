/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Enhanced Main Agent Panel Component with performance optimizations
 * Provides the primary interface for interacting with the coding agent
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AgentConfig, ConversationEntry, VSCodeContext, AgentStore } from '../state/agentStore';
import { sanitize } from '../utils/sanitize';
import ContextModeSelector from './ContextModeSelector';
import CodeSuggestionButton from './CodeSuggestionButton';

interface AgentPanelProps {
	store: AgentStore;
}

/**
 * Loading component with spinner
 */
const LoadingSpinner: React.FC<{ message?: string }> = React.memo(({ message = 'Loading...' }) => (
	<div className="loading-container">
		<div className="loading-spinner" aria-label="Loading" />
		<p>{message}</p>
	</div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Configuration error component
 */
const ConfigurationError: React.FC = React.memo(() => (
	<div className="config-error">
		<h3>⚠️ Configuration Required</h3>
		<p>
			Please configure the agent endpoint in VSCode settings or set the 
			<code>GIDE_AGENT_ENDPOINT</code> environment variable.
		</p>
		<div className="config-help">
			<p>
				<strong>To configure:</strong>
			</p>
			<ol>
				<li>Go to: <strong>File → Preferences → Settings</strong></li>
				<li>Search for: <strong>Gide Coding Agent</strong></li>
				<li>Set the <strong>Agent Endpoint</strong> URL</li>
			</ol>
		</div>
	</div>
));

ConfigurationError.displayName = 'ConfigurationError';

/**
 * Connection status indicator component
 */
const ConnectionStatus: React.FC<{
	isConnected: boolean;
	connectionError: string | null;
	onTestConnection: () => void;
	isLoading: boolean;
}> = React.memo(({ isConnected, connectionError, onTestConnection, isLoading }) => (
	<div className="connection-status-container">
		{connectionError && (
			<div className="connection-status disconnected">
				❌ {sanitize.html(connectionError)}
			</div>
		)}
		
		{isConnected && !connectionError && (
			<div className="connection-status connected">
				✅ Connected successfully
			</div>
		)}
		
		<button 
			onClick={onTestConnection}
			disabled={isLoading}
			className="test-connection-btn"
			aria-label="Test connection to agent endpoint"
		>
			{isLoading ? 'Testing...' : 'Test Connection'}
		</button>
	</div>
));

ConnectionStatus.displayName = 'ConnectionStatus';

/**
 * Conversation entry component
 */
const ConversationItem: React.FC<{
	conversation: ConversationEntry;
	index: number;
}> = React.memo(({ conversation, index }) => (
	<div className="conversation-entry" role="article" aria-label={`Conversation ${index + 1}`}>
		<div className="conversation-header">
			<span className="conversation-timestamp">
				{conversation.timestamp}
			</span>
			<span className={`conversation-status ${conversation.success ? 'success' : 'error'}`}>
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
				<pre className="response-text">
					{sanitize.markdown(conversation.response)}
				</pre>
			</div>
			
			<div className="conversation-actions">
				<CodeSuggestionButton response={conversation.response} />
			</div>
			
			{conversation.error && (
				<div className="conversation-error" role="alert">
					<strong>Error:</strong> {sanitize.html(conversation.error)}
				</div>
			)}
			
			{conversation.metadata && (
				<div className="conversation-metadata">
					{conversation.metadata.model && (
						<span className="metadata-item">
							Model: {sanitize.html(conversation.metadata.model)}
						</span>
					)}
					{conversation.metadata.tokensUsed && (
						<span className="metadata-item">
							Tokens: {conversation.metadata.tokensUsed}
						</span>
					)}
					{conversation.metadata.processingTime && (
						<span className="metadata-item">
							Time: {conversation.metadata.processingTime}ms
						</span>
					)}
				</div>
			)}
		</div>
	</div>
));

ConversationItem.displayName = 'ConversationItem';

/**
 * Main Agent Panel Component with comprehensive enhancements
 */
export const AgentPanel: React.FC<AgentPanelProps> = ({ store }) => {
	const {
		config, conversations, currentRequest, isLoading, isConnected, 
		connectionError, error, contextMode, vsCodeContext,
		setConfig, setCurrentRequest, addConversation, clearConversations,
		setLoading, setConnected, setError, setVSCodeContext
	} = store;

	// Local state for UI enhancements
	const [requestHistory, setRequestHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	// Memoize the VS Code API instance
	const vscode = useMemo(() => (window as any).acquireVsCodeApi?.(), []);

	// Memoized handlers to prevent unnecessary re-renders
	const handleSubmit = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		if (!currentRequest.trim() || isLoading) return;

		const sanitizedRequest = sanitize.input(currentRequest);
		setLoading(true);
		setError(null);

		// Add to request history
		setRequestHistory(prev => {
			const newHistory = [sanitizedRequest, ...prev.slice(0, 9)]; // Keep last 10
			return newHistory;
		});
		setHistoryIndex(-1);

		if (vscode) {
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
		}
	}, [currentRequest, isLoading, contextMode, setLoading, setError, vscode]);

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setCurrentRequest(e.target.value);
		setHistoryIndex(-1);
	}, [setCurrentRequest]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Handle keyboard shortcuts
		if (e.ctrlKey || e.metaKey) {
			if (e.key === 'Enter') {
				e.preventDefault();
				handleSubmit(e as any);
				return;
			}
		}

		// Handle history navigation
		if (e.key === 'ArrowUp' && requestHistory.length > 0) {
			e.preventDefault();
			const newIndex = Math.min(historyIndex + 1, requestHistory.length - 1);
			setHistoryIndex(newIndex);
			setCurrentRequest(requestHistory[newIndex] || '');
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (historyIndex > 0) {
				const newIndex = historyIndex - 1;
				setHistoryIndex(newIndex);
				setCurrentRequest(requestHistory[newIndex] || '');
			} else if (historyIndex === 0) {
				setHistoryIndex(-1);
				setCurrentRequest('');
			}
		}
	}, [handleSubmit, requestHistory, historyIndex, setCurrentRequest]);

	const handleClearHistory = useCallback(() => {
		if (window.confirm('Are you sure you want to clear all conversations?')) {
			clearConversations();
		}
	}, [clearConversations]);

	const handleTestConnection = useCallback(() => {
		setLoading(true);
		setError(null);
		
		// Simulate connection test with timeout
		const testTimeout = setTimeout(() => {
			setLoading(false);
			const success = Math.random() > 0.3; // 70% success rate for demo
			setConnected(success, success ? null : 'Connection test failed - please check your endpoint configuration');
		}, 1500);

		return () => clearTimeout(testTimeout);
	}, [setLoading, setError, setConnected]);

	const handleRefreshContext = useCallback(() => {
		if (vscode) {
			vscode.postMessage({ type: 'refreshContext' });
		}
	}, [vscode]);

	// Message handler for VS Code communication
	useEffect(() => {
		const messageHandler = (event: MessageEvent) => {
			const message = event.data;
			try {
				switch (message.type) {
					case 'config':
						setConfig(message.payload as AgentConfig);
						break;
					case 'agentResponse':
						const newConversation: ConversationEntry = {
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
						setVSCodeContext(sanitize.json(message.payload));
						break;
					case 'error':
						setError(sanitize.input(message.payload));
						setLoading(false);
						break;
				}
			} catch (err) {
				console.error('Error handling message:', err);
				setError('Error processing message from extension');
			}
		};

		window.addEventListener('message', messageHandler);
		return () => window.removeEventListener('message', messageHandler);
	}, [currentRequest, vsCodeContext, setConfig, addConversation, setLoading, setCurrentRequest, setVSCodeContext, setError]);

	// Initial setup
	useEffect(() => {
		if (vscode) {
			vscode.postMessage({ type: 'getConfig' });
			vscode.postMessage({ type: 'getContext' });
		}
	}, [vscode]);

	// Render loading state
	if (!config) {
		return <LoadingSpinner message="Loading configuration..." />;
	}

	// Render configuration error
	if (!config.agentEndpoint) {
		return <ConfigurationError />;
	}

	return (
		<div className="agent-panel">
			<header className="agent-header">
				<h1>🤖 Gide Coding Agent</h1>
				<div className="agent-status">
					<span className="endpoint-info">
						Endpoint: {sanitize.html(config.agentEndpoint)}
					</span>
					<ConnectionStatus
						isConnected={isConnected}
						connectionError={connectionError}
						onTestConnection={handleTestConnection}
						isLoading={isLoading}
					/>
				</div>
			</header>

			{error && (
				<div className="error-message" role="alert">
					<strong>Error:</strong> {sanitize.html(error)}
					<button 
						onClick={() => setError(null)} 
						className="clear-error-btn"
						aria-label="Clear error message"
					>
						✕
					</button>
				</div>
			)}

			<ContextModeSelector
				contextMode={contextMode}
				setContextMode={store.setContextMode}
				vsCodeContext={vsCodeContext}
				disabled={isLoading}
			/>

			<form onSubmit={handleSubmit} className="request-form">
				<div className="input-group">
					<label htmlFor="request-input">Your Request:</label>
					<textarea
						id="request-input"
						value={currentRequest}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						placeholder="Enter your coding request here... (Ctrl+Enter to send, ↑↓ for history)"
						disabled={isLoading}
						rows={4}
						aria-describedby="request-help"
					/>
					<small id="request-help" className="input-help">
						Use Ctrl+Enter to send, arrow keys to navigate request history
					</small>
				</div>

				<div className="form-actions">
					<button 
						type="submit" 
						disabled={!currentRequest.trim() || isLoading}
						className="send-btn primary"
					>
						{isLoading ? (
							<>
								<span className="loading-spinner small" />
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
						className="refresh-context-btn secondary"
					>
						🔄 Refresh Context
					</button>
					
					{conversations.length > 0 && (
						<button 
							type="button"
							onClick={handleClearHistory}
							disabled={isLoading}
							className="clear-btn secondary"
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
						<div className="quick-tips">
							<h4>Quick Tips:</h4>
							<ul>
								<li>Try: "Create a function to sort an array"</li>
								<li>Try: "Explain this code" (with code selected)</li>
								<li>Try: "Fix the bug in this function"</li>
							</ul>
						</div>
					</div>
				) : (
					<>
						<h3>Conversation History ({conversations.length})</h3>
						<div className="conversations-list">
							{conversations.map((conversation, index) => (
								<ConversationItem
									key={conversation.id || index}
									conversation={conversation}
									index={index}
								/>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default AgentPanel;