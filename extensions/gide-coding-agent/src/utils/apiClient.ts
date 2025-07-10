/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	APIError,
	getAvailableProviders,
	isProviderAvailable,
	markProviderUnavailable,
	validateAPIKeys,
	AI_PROVIDERS,
	ProviderConfig
} from './apiValidation';
import { trackAPIError } from './errorTracking';

/**
 * Chat options for API requests
 */
export interface ChatOptions {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	timeout?: number;
	retryAttempts?: number;
}

/**
 * Chat response from AI providers
 */
export interface ChatResponse {
	content: string;
	provider: string;
	model?: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * Enhanced API client with provider fallback and error handling
 */
export class APIClient {
	private readonly defaultTimeout = 30000;
	private readonly defaultRetryAttempts = 2;

	/**
	 * Chat with AI providers using automatic fallback
	 */
	async chatWithProviders(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
		const keyValidation = validateAPIKeys();
		const availableProviders = keyValidation
			.filter(p => p.isValid && isProviderAvailable(p.provider))
			.map(p => p.provider);

		if (availableProviders.length === 0) {
			throw new APIError(503, 'NO_VALID_API_KEYS', 'No valid API keys configured or all providers are temporarily unavailable');
		}

		const errors: Record<string, Error> = {};
		
		// Try each available provider
		for (const providerName of availableProviders) {
			try {
				console.log(`Attempting to use provider: ${providerName}`);
				const result = await this.chatWithProvider(providerName, message, options);
				console.log(`Successfully got response from provider: ${providerName}`);
				return result;
			} catch (error) {
				errors[providerName] = error as Error;
				console.warn(`Provider ${providerName} failed:`, (error as Error).message);
				
				// Track the error for monitoring
				trackAPIError(providerName, error, { message: message.substring(0, 100) });
				
				// If 401, mark provider as temporarily unavailable
				if ((error as APIError).statusCode === 401) {
					markProviderUnavailable(providerName, '5min');
				}
			}
		}

		// All providers failed
		const errorDetails = Object.entries(errors)
			.map(([provider, error]) => `${provider}: ${error.message}`)
			.join('; ');
			
		throw new APIError(
			503, 
			'ALL_PROVIDERS_FAILED', 
			`All available providers failed: ${errorDetails}`
		);
	}

	/**
	 * Chat with a specific provider
	 */
	async chatWithProvider(providerName: string, message: string, options: ChatOptions = {}): Promise<ChatResponse> {
		const provider = AI_PROVIDERS.find(p => p.name === providerName);
		if (!provider) {
			throw new APIError(400, 'UNKNOWN_PROVIDER', `Provider ${providerName} is not supported`);
		}

		const apiKey = this.getAPIKey(provider);
		if (!apiKey) {
			throw new APIError(401, 'MISSING_API_KEY', `API key not configured for ${providerName}`);
		}

		const timeout = options.timeout || this.defaultTimeout;
		const retryAttempts = options.retryAttempts || this.defaultRetryAttempts;

		// Attempt the request with retries
		for (let attempt = 1; attempt <= retryAttempts; attempt++) {
			try {
				const response = await this.makeAPIRequest(provider, apiKey, message, options, timeout);
				return response;
			} catch (error) {
				// If this is the last attempt or a non-retryable error, throw it
				if (attempt === retryAttempts || !this.isRetryableError(error as Error)) {
					throw error;
				}
				
				// Wait before retrying (exponential backoff)
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
				await new Promise(resolve => setTimeout(resolve, delay));
				console.log(`Retrying ${providerName} request (attempt ${attempt + 1}/${retryAttempts})`);
			}
		}

		throw new APIError(503, 'MAX_RETRIES_EXCEEDED', `Failed after ${retryAttempts} attempts`);
	}

	/**
	 * Make the actual API request to a provider
	 */
	private async makeAPIRequest(
		provider: ProviderConfig,
		apiKey: string,
		message: string,
		options: ChatOptions,
		timeout: number
	): Promise<ChatResponse> {
		const { endpoint } = provider;
		
		if (!endpoint) {
			throw new APIError(500, 'NO_ENDPOINT', `No endpoint configured for ${provider.name}`);
		}

		// Build request based on provider
		const { url, headers, body } = this.buildProviderRequest(provider, apiKey, message, options);

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			const response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new APIError(
					response.status,
					'API_ERROR',
					`API request failed: ${response.status} ${response.statusText} - ${errorText}`,
					provider.name
				);
			}

			const data = await response.json();
			return this.parseProviderResponse(provider, data);

		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}
			
			if (error.name === 'AbortError') {
				throw new APIError(408, 'TIMEOUT', `Request timed out after ${timeout}ms`, provider.name);
			}
			
			throw new APIError(500, 'NETWORK_ERROR', `Network error: ${error.message}`, provider.name);
		}
	}

	/**
	 * Build provider-specific request
	 */
	private buildProviderRequest(provider: ProviderConfig, apiKey: string, message: string, options: ChatOptions) {
		const baseHeaders: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		let url: string;
		let headers: Record<string, string>;
		let body: any;

		switch (provider.name) {
			case 'openai':
			case 'groq':
				url = `${provider.endpoint}/chat/completions`;
				headers = {
					...baseHeaders,
					'Authorization': `Bearer ${apiKey}`
				};
				body = {
					model: options.model || (provider.name === 'openai' ? 'gpt-4' : 'llama-3.1-70b-versatile'),
					messages: [{ role: 'user', content: message }],
					temperature: options.temperature || 0.7,
					max_tokens: options.maxTokens || 2000
				};
				break;

			case 'anthropic':
				url = `${provider.endpoint}/messages`;
				headers = {
					...baseHeaders,
					'X-API-Key': apiKey,
					'Anthropic-Version': '2023-06-01'
				};
				body = {
					model: options.model || 'claude-3-sonnet-20240229',
					max_tokens: options.maxTokens || 2000,
					messages: [{ role: 'user', content: message }],
					temperature: options.temperature || 0.7
				};
				break;

			case 'perplexity':
				url = `${provider.endpoint}/chat/completions`;
				headers = {
					...baseHeaders,
					'Authorization': `Bearer ${apiKey}`
				};
				body = {
					model: options.model || 'llama-3.1-sonar-large-128k-online',
					messages: [{ role: 'user', content: message }],
					temperature: options.temperature || 0.7,
					max_tokens: options.maxTokens || 2000
				};
				break;

			case 'xai':
				url = `${provider.endpoint}/chat/completions`;
				headers = {
					...baseHeaders,
					'Authorization': `Bearer ${apiKey}`
				};
				body = {
					model: options.model || 'grok-beta',
					messages: [{ role: 'user', content: message }],
					temperature: options.temperature || 0.7,
					max_tokens: options.maxTokens || 2000
				};
				break;

			case 'gemini':
				url = `${provider.endpoint}/models/${options.model || 'gemini-pro'}:generateContent?key=${apiKey}`;
				headers = baseHeaders;
				body = {
					contents: [{ parts: [{ text: message }] }],
					generationConfig: {
						temperature: options.temperature || 0.7,
						maxOutputTokens: options.maxTokens || 2000
					}
				};
				break;

			default:
				throw new APIError(400, 'UNSUPPORTED_PROVIDER', `Provider ${provider.name} is not implemented`);
		}

		return { url, headers, body };
	}

	/**
	 * Parse provider-specific response
	 */
	private parseProviderResponse(provider: ProviderConfig, data: any): ChatResponse {
		let content: string;
		let usage: any;

		switch (provider.name) {
			case 'openai':
			case 'groq':
			case 'perplexity':
			case 'xai':
				content = data.choices?.[0]?.message?.content || '';
				usage = data.usage;
				break;

			case 'anthropic':
				content = data.content?.[0]?.text || '';
				usage = data.usage;
				break;

			case 'gemini':
				content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
				usage = data.usageMetadata;
				break;

			default:
				content = data.content || data.text || '';
				usage = data.usage;
		}

		if (!content) {
			throw new APIError(500, 'EMPTY_RESPONSE', `Empty response from ${provider.name}`);
		}

		return {
			content,
			provider: provider.name,
			model: data.model,
			usage: usage ? {
				promptTokens: usage.prompt_tokens || usage.promptTokenCount || 0,
				completionTokens: usage.completion_tokens || usage.candidatesTokenCount || 0,
				totalTokens: usage.total_tokens || usage.totalTokenCount || 0
			} : undefined
		};
	}

	/**
	 * Get API key for a provider
	 */
	private getAPIKey(provider: ProviderConfig): string | undefined {
		return process.env[provider.serverKey] || process.env[provider.envKey];
	}

	/**
	 * Check if an error is retryable
	 */
	private isRetryableError(error: Error): boolean {
		if (error instanceof APIError) {
			// Don't retry on client errors (4xx) except for rate limits
			if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
				return false;
			}
		}
		
		return true;
	}

	/**
	 * Get health status of all providers
	 */
	async getProvidersHealth(): Promise<Record<string, { available: boolean; lastError?: string }>> {
		const results: Record<string, { available: boolean; lastError?: string }> = {};
		
		for (const provider of AI_PROVIDERS) {
			const apiKey = this.getAPIKey(provider);
			const available = !!apiKey && isProviderAvailable(provider.name);
			
			results[provider.name] = {
				available,
				lastError: !available ? 'API key missing or provider temporarily unavailable' : undefined
			};
		}
		
		return results;
	}
}