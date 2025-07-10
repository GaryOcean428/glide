/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * API key validation and provider management for Gide Coding Agent
 * Implements robust fallback logic and health monitoring for AI providers
 */

export interface APIKeyValidationResult {
	provider: string;
	isValid: boolean;
	key: string | null;
	error?: string;
	lastChecked?: Date;
}

export interface ProviderConfig {
	name: string;
	envKey: string;
	serverKey: string;
	endpoint?: string;
	testEndpoint?: string;
	isAvailable?: boolean;
	lastError?: string;
	lastChecked?: Date;
}

export interface APIHealthStatus {
	timestamp: string;
	environment: string;
	apiKeys: {
		total: number;
		valid: number;
		providers: APIKeyValidationResult[];
	};
	supabase?: {
		url: string;
		anonKey: string;
	};
}

export class APIError extends Error {
	constructor(
		public statusCode: number,
		public code: string,
		message: string,
		public provider?: string
	) {
		super(message);
		this.name = 'APIError';
	}
}

/**
 * Available AI providers with their configuration
 */
export const AI_PROVIDERS: ProviderConfig[] = [
	{
		name: 'openai',
		envKey: 'VITE_OPENAI_API_KEY',
		serverKey: 'OPENAI_API_KEY',
		endpoint: 'https://api.openai.com/v1',
		testEndpoint: 'https://api.openai.com/v1/models'
	},
	{
		name: 'anthropic',
		envKey: 'VITE_ANTHROPIC_API_KEY',
		serverKey: 'ANTHROPIC_API_KEY',
		endpoint: 'https://api.anthropic.com/v1',
		testEndpoint: 'https://api.anthropic.com/v1/models'
	},
	{
		name: 'perplexity',
		envKey: 'VITE_PERPLEXITY_API_KEY',
		serverKey: 'PERPLEXITY_API_KEY',
		endpoint: 'https://api.perplexity.ai'
	},
	{
		name: 'xai',
		envKey: 'VITE_XAI_API_KEY',
		serverKey: 'XAI_API_KEY',
		endpoint: 'https://api.x.ai/v1'
	},
	{
		name: 'groq',
		envKey: 'VITE_GROQ_API_KEY',
		serverKey: 'GROQ_API_KEY',
		endpoint: 'https://api.groq.com/openai/v1',
		testEndpoint: 'https://api.groq.com/openai/v1/models'
	},
	{
		name: 'gemini',
		envKey: 'VITE_GEMINI_API_KEY',
		serverKey: 'GEMINI_API_KEY',
		endpoint: 'https://generativelanguage.googleapis.com/v1'
	}
];

/**
 * API key validation patterns for different providers
 */
const API_KEY_PATTERNS: Record<string, RegExp> = {
	'openai': /^sk-[a-zA-Z0-9\-_]{20,}$/,
	'anthropic': /^sk-ant-api\d{2}-[a-zA-Z0-9\-_]{20,}$/,
	'perplexity': /^pplx-[a-zA-Z0-9]{32,}$/,
	'xai': /^xai-[a-zA-Z0-9]{32,}$/,
	'groq': /^gsk_[a-zA-Z0-9]{32,}$/,
	'gemini': /^[a-zA-Z0-9\-_]{32,}$/
};

/**
 * Validates API keys for all configured providers
 */
export function validateAPIKeys(): APIKeyValidationResult[] {
	return AI_PROVIDERS.map(provider => {
		// Check both client and server environment variables
		const clientKey = getClientEnvVar(provider.envKey);
		const serverKey = getServerEnvVar(provider.serverKey);
		const key = clientKey || serverKey;
		
		const isValid = validateSingleAPIKey(provider.name, key);
		
		return {
			provider: provider.name,
			isValid,
			key: isValid && key ? `${key.substring(0, 8)}...` : null,
			error: !isValid ? 'Missing or invalid API key' : undefined,
			lastChecked: new Date()
		};
	});
}

/**
 * Validates a single API key for a specific provider
 */
export function validateSingleAPIKey(provider: string, apiKey?: string): boolean {
	if (!apiKey || apiKey.length < 10 || apiKey.includes('undefined')) {
		return false;
	}

	const pattern = API_KEY_PATTERNS[provider.toLowerCase()];
	return pattern ? pattern.test(apiKey) : true;
}

/**
 * Gets available (valid) providers
 */
export function getAvailableProviders(): ProviderConfig[] {
	const validationResults = validateAPIKeys();
	
	return AI_PROVIDERS.filter(provider => {
		const validation = validationResults.find(v => v.provider === provider.name);
		return validation?.isValid;
	});
}

/**
 * Creates comprehensive API health check
 */
export function createAPIHealthCheck(): APIHealthStatus {
	const keyValidation = validateAPIKeys();
	const validProviders = keyValidation.filter(p => p.isValid);
	
	return {
		timestamp: new Date().toISOString(),
		environment: getEnvironment(),
		apiKeys: {
			total: keyValidation.length,
			valid: validProviders.length,
			providers: keyValidation
		},
		supabase: {
			url: getClientEnvVar('VITE_SUPABASE_URL') ? 'configured' : 'missing',
			anonKey: getClientEnvVar('VITE_SUPABASE_ANON_KEY') ? 'configured' : 'missing'
		}
	};
}

/**
 * Marks a provider as temporarily unavailable
 */
const unavailableProviders = new Map<string, Date>();

export function markProviderUnavailable(provider: string, duration: string = '5min'): void {
	const durationMs = parseDuration(duration);
	const unavailableUntil = new Date(Date.now() + durationMs);
	unavailableProviders.set(provider, unavailableUntil);
}

/**
 * Checks if a provider is currently available
 */
export function isProviderAvailable(provider: string): boolean {
	const unavailableUntil = unavailableProviders.get(provider);
	if (!unavailableUntil) {
		return true;
	}
	
	if (Date.now() > unavailableUntil.getTime()) {
		unavailableProviders.delete(provider);
		return true;
	}
	
	return false;
}

/**
 * Gets the environment (client-side approximation)
 */
function getEnvironment(): string {
	// In a VSCode extension context, we can check for development indicators
	return process.env.NODE_ENV || 'production';
}

/**
 * Safe environment variable access for client-side
 */
function getClientEnvVar(key: string): string | undefined {
	// In VSCode extension context, we have access to process.env
	return process.env[key];
}

/**
 * Safe environment variable access for server-side
 */
function getServerEnvVar(key: string): string | undefined {
	return process.env[key];
}

/**
 * Parses duration strings like "5min", "1h", etc.
 */
function parseDuration(duration: string): number {
	const matches = duration.match(/^(\d+)(min|h|s)$/);
	if (!matches) {
		return 5 * 60 * 1000; // Default 5 minutes
	}
	
	const value = parseInt(matches[1], 10);
	const unit = matches[2];
	
	switch (unit) {
		case 's': return value * 1000;
		case 'min': return value * 60 * 1000;
		case 'h': return value * 60 * 60 * 1000;
		default: return 5 * 60 * 1000;
	}
}

/**
 * Tests API key with live call to provider (use sparingly)
 */
export async function testAPIKeyLive(provider: string, apiKey: string): Promise<boolean> {
	const providerConfig = AI_PROVIDERS.find(p => p.name === provider);
	if (!providerConfig?.testEndpoint) {
		return false;
	}

	try {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// Add provider-specific headers
		switch (provider) {
			case 'openai':
			case 'groq':
				headers['Authorization'] = `Bearer ${apiKey}`;
				break;
			case 'anthropic':
				headers['X-API-Key'] = apiKey;
				headers['Anthropic-Version'] = '2023-06-01';
				break;
			default:
				headers['Authorization'] = `Bearer ${apiKey}`;
		}

		const response = await fetch(providerConfig.testEndpoint, {
			method: 'GET',
			headers,
			signal: AbortSignal.timeout(5000)
		});
		
		return response.status === 200;
	} catch (error) {
		console.warn(`API key test failed for ${provider}:`, error);
		return false;
	}
}