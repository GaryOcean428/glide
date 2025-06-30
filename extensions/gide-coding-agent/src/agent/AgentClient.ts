/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Represents a request to the coding agent
 */
export interface AgentRequest {
	id: string;
	request: string;
	context?: {
		currentFile?: string;
		selectedText?: string;
		workspaceRoot?: string;
	};
}

/**
 * Represents a response from the coding agent
 */
export interface AgentResponse {
	id: string;
	response: string;
	success: boolean;
	error?: string;
	metadata?: {
		model?: string;
		tokensUsed?: number;
		processingTime?: number;
	};
}

/**
 * Configuration for the AgentClient
 */
export interface AgentClientConfig {
	endpoint: string;
	timeout: number;
	apiKey?: string;
	modelProvider?: string;
	modelName?: string;
}

/**
 * Client for communicating with the Railway-hosted coding agent
 * Provides secure, sanitized, and extensible API abstraction
 */
export class AgentClient {
	private config: AgentClientConfig;

	constructor(config: AgentClientConfig) {
		this.config = { ...config };
		this.validateConfig();
	}

	/**
	 * Validates the client configuration
	 */
	private validateConfig(): void {
		if (!this.config.endpoint) {
			throw new Error('Agent endpoint is required');
		}

		try {
			new URL(this.config.endpoint);
		} catch {
			throw new Error('Invalid agent endpoint URL');
		}

		if (this.config.timeout <= 0) {
			throw new Error('Timeout must be positive');
		}
	}

	/**
	 * Updates the client configuration
	 */
	public updateConfig(newConfig: Partial<AgentClientConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.validateConfig();
	}

	/**
	 * Sends a request to the coding agent
	 */
	public async sendRequest(request: AgentRequest): Promise<AgentResponse> {
		try {
			// Sanitize the request
			const sanitizedRequest = this.sanitizeRequest(request);
			
			// Prepare the HTTP request
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

			const response = await fetch(this.config.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
					...(this.config.modelProvider && { 'X-Model-Provider': this.config.modelProvider }),
					...(this.config.modelName && { 'X-Model-Name': this.config.modelName })
				},
				body: JSON.stringify({
					id: sanitizedRequest.id,
					request: sanitizedRequest.request,
					context: sanitizedRequest.context || {},
					model: this.config.modelName,
					provider: this.config.modelProvider
				}),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			return this.sanitizeResponse(data);

		} catch (error) {
			console.error('Agent request failed:', error);
			
			// Handle different error types
			if (error instanceof TypeError && error.message.includes('fetch')) {
				return {
					id: request.id,
					response: 'Network error: Unable to connect to the coding agent',
					success: false,
					error: 'Network connection failed'
				};
			}

			if (error instanceof Error && error.name === 'AbortError') {
				return {
					id: request.id,
					response: 'Request timeout: The coding agent took too long to respond',
					success: false,
					error: 'Request timeout'
				};
			}

			return {
				id: request.id,
				response: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Sanitizes the input request to prevent security issues
	 */
	private sanitizeRequest(request: AgentRequest): AgentRequest {
		return {
			id: this.sanitizeString(request.id),
			request: this.sanitizeString(request.request),
			context: request.context ? {
				currentFile: request.context.currentFile ? this.sanitizeString(request.context.currentFile) : undefined,
				selectedText: request.context.selectedText ? this.sanitizeString(request.context.selectedText) : undefined,
				workspaceRoot: request.context.workspaceRoot ? this.sanitizeString(request.context.workspaceRoot) : undefined
			} : undefined
		};
	}

	/**
	 * Sanitizes the response from the agent
	 */
	private sanitizeResponse(data: any): AgentResponse {
		// Ensure we have a valid response structure
		const response: AgentResponse = {
			id: this.sanitizeString(data.id || ''),
			response: this.sanitizeString(data.response || ''),
			success: Boolean(data.success),
			error: data.error ? this.sanitizeString(data.error) : undefined,
			metadata: data.metadata ? {
				model: data.metadata.model ? this.sanitizeString(data.metadata.model) : undefined,
				tokensUsed: typeof data.metadata.tokensUsed === 'number' ? data.metadata.tokensUsed : undefined,
				processingTime: typeof data.metadata.processingTime === 'number' ? data.metadata.processingTime : undefined
			} : undefined
		};

		return response;
	}

	/**
	 * Sanitizes a string to prevent XSS and other security issues
	 */
	private sanitizeString(str: string): string {
		if (typeof str !== 'string') {
			return '';
		}

		// Remove or encode potentially dangerous characters
		return str
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;')
			.replace(/&/g, '&amp;')
			.trim();
	}

	/**
	 * Tests the connection to the agent endpoint
	 */
	public async testConnection(): Promise<{ success: boolean; message: string }> {
		try {
			const testRequest: AgentRequest = {
				id: 'connection-test',
				request: 'ping'
			};

			const response = await this.sendRequest(testRequest);
			
			if (response.success) {
				return {
					success: true,
					message: 'Successfully connected to the coding agent'
				};
			} else {
				return {
					success: false,
					message: response.error || 'Connection test failed'
				};
			}
		} catch (error) {
			return {
				success: false,
				message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Gets the current configuration (excluding sensitive data)
	 */
	public getConfig(): Omit<AgentClientConfig, 'apiKey'> {
		return {
			endpoint: this.config.endpoint,
			timeout: this.config.timeout,
			modelProvider: this.config.modelProvider,
			modelName: this.config.modelName
		};
	}
}