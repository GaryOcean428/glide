/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Zustand-based state management for the Gide Coding Agent
 * Provides centralized, predictable state management for conversation history,
 * agent status, configuration, and UI state
 */

export interface AgentConfig {
	agentEndpoint: string;
	requestTimeout: number;
}

export interface ConversationEntry {
	id: string;
	request: string;
	response: string;
	success: boolean;
	error?: string;
	timestamp: string;
	metadata?: {
		model?: string;
		tokensUsed?: number;
		processingTime?: number;
	};
	context?: VSCodeContext;
}

export interface VSCodeContext {
	currentFile?: string;
	selectedText?: string;
	workspaceRoot?: string;
	language?: string;
	lineNumber?: number;
	column?: number;
}

export interface AgentState {
	// Configuration
	config: AgentConfig | null;
	
	// Conversation state
	conversations: ConversationEntry[];
	currentRequest: string;
	
	// Agent status
	isLoading: boolean;
	isConnected: boolean;
	connectionError: string | null;
	
	// UI state
	error: string | null;
	contextMode: 'none' | 'file' | 'selection' | 'workspace';
	
	// Current VSCode context
	vsCodeContext: VSCodeContext | null;
}

export interface AgentActions {
	// Configuration actions
	setConfig: (config: AgentConfig) => void;
	updateConfig: (updates: Partial<AgentConfig>) => void;
	
	// Conversation actions
	setCurrentRequest: (request: string) => void;
	addConversation: (conversation: ConversationEntry) => void;
	clearConversations: () => void;
	
	// Status actions
	setLoading: (loading: boolean) => void;
	setConnected: (connected: boolean, error?: string) => void;
	setError: (error: string | null) => void;
	
	// Context actions
	setContextMode: (mode: AgentState['contextMode']) => void;
	setVSCodeContext: (context: VSCodeContext) => void;
	
	// Utility actions
	reset: () => void;
}

export type AgentStore = AgentState & AgentActions;

// Initial state
const initialState: AgentState = {
	config: null,
	conversations: [],
	currentRequest: '',
	isLoading: false,
	isConnected: false,
	connectionError: null,
	error: null,
	contextMode: 'file',
	vsCodeContext: null
};

/**
 * Create agent store factory
 * This will be instantiated in the webview with Zustand
 */
export const createAgentStore = () => {
	// This is a factory function that will be used in the webview
	// where Zustand is available via CDN
	return {
		...initialState,
		
		// Configuration actions
		setConfig: (config: AgentConfig) => ({ config }),
		updateConfig: (updates: Partial<AgentConfig>) => (state: AgentState) => ({
			config: state.config ? { ...state.config, ...updates } : null
		}),
		
		// Conversation actions
		setCurrentRequest: (currentRequest: string) => ({ currentRequest }),
		addConversation: (conversation: ConversationEntry) => (state: AgentState) => ({
			conversations: [...state.conversations, conversation]
		}),
		clearConversations: () => ({ conversations: [] }),
		
		// Status actions
		setLoading: (isLoading: boolean) => ({ isLoading }),
		setConnected: (isConnected: boolean, connectionError?: string) => ({
			isConnected,
			connectionError: connectionError || null
		}),
		setError: (error: string | null) => ({ error }),
		
		// Context actions
		setContextMode: (contextMode: AgentState['contextMode']) => ({ contextMode }),
		setVSCodeContext: (vsCodeContext: VSCodeContext) => ({ vsCodeContext }),
		
		// Utility actions
		reset: () => initialState
	};
};

/**
 * Context selector utility for getting relevant context based on mode
 */
export const selectRelevantContext = (
	vsCodeContext: VSCodeContext | null,
	contextMode: AgentState['contextMode']
): VSCodeContext | null => {
	if (!vsCodeContext) return null;
	
	switch (contextMode) {
		case 'none':
			return null;
		case 'file':
			return {
				currentFile: vsCodeContext.currentFile,
				language: vsCodeContext.language,
				workspaceRoot: vsCodeContext.workspaceRoot
			};
		case 'selection':
			return {
				currentFile: vsCodeContext.currentFile,
				selectedText: vsCodeContext.selectedText,
				language: vsCodeContext.language,
				lineNumber: vsCodeContext.lineNumber,
				column: vsCodeContext.column,
				workspaceRoot: vsCodeContext.workspaceRoot
			};
		case 'workspace':
			return {
				workspaceRoot: vsCodeContext.workspaceRoot
			};
		default:
			return vsCodeContext;
	}
};

/**
 * Store validation utilities
 */
export const validateAgentConfig = (config: any): config is AgentConfig => {
	return (
		typeof config === 'object' &&
		config !== null &&
		typeof config.agentEndpoint === 'string' &&
		typeof config.requestTimeout === 'number' &&
		config.requestTimeout > 0
	);
};

export const validateConversation = (conversation: any): conversation is ConversationEntry => {
	return (
		typeof conversation === 'object' &&
		conversation !== null &&
		typeof conversation.id === 'string' &&
		typeof conversation.request === 'string' &&
		typeof conversation.response === 'string' &&
		typeof conversation.success === 'boolean' &&
		typeof conversation.timestamp === 'string'
	);
};