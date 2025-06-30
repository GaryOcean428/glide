/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Configuration for the Gide Coding Agent extension
 */
export interface ExtensionConfig {
	agentEndpoint: string;
	requestTimeout: number;
	apiKey?: string;
	modelProvider?: string;
	modelName?: string;
}

/**
 * Environment variable names used by the extension
 */
export const ENV_VARS = {
	AGENT_ENDPOINT: 'GIDE_AGENT_ENDPOINT',
	API_KEY: 'GIDE_API_KEY',
	MODEL_PROVIDER: 'GIDE_MODEL_PROVIDER',
	MODEL_NAME: 'GIDE_MODEL_NAME',
	REQUEST_TIMEOUT: 'GIDE_REQUEST_TIMEOUT'
} as const;

/**
 * Required environment variables for the extension to function
 */
export const REQUIRED_ENV_VARS = [
	ENV_VARS.AGENT_ENDPOINT
] as const;

/**
 * Gets the extension configuration, combining VSCode settings and environment variables
 * Environment variables take precedence over VSCode settings for security
 */
export function getExtensionConfig(): ExtensionConfig {
	const config = vscode.workspace.getConfiguration('gide-coding-agent');
	
	// Get configuration values with environment variable precedence
	const agentEndpoint = process.env[ENV_VARS.AGENT_ENDPOINT] || 
		config.get<string>('agentEndpoint') || '';
	
	const requestTimeout = parseInt(process.env[ENV_VARS.REQUEST_TIMEOUT] || '', 10) ||
		config.get<number>('requestTimeout') || 30000;
	
	const apiKey = process.env[ENV_VARS.API_KEY] ||
		config.get<string>('apiKey') || undefined;
	
	const modelProvider = process.env[ENV_VARS.MODEL_PROVIDER] ||
		config.get<string>('modelProvider') || undefined;
	
	const modelName = process.env[ENV_VARS.MODEL_NAME] ||
		config.get<string>('modelName') || undefined;

	return {
		agentEndpoint,
		requestTimeout,
		apiKey,
		modelProvider,
		modelName
	};
}

/**
 * Validates that all required configuration is present
 * @throws Error if required configuration is missing
 */
export function validateConfiguration(config: ExtensionConfig): void {
	const missingVars: string[] = [];

	if (!config.agentEndpoint) {
		missingVars.push(ENV_VARS.AGENT_ENDPOINT);
	}

	if (missingVars.length > 0) {
		const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}. ` +
			'Please set these environment variables or configure them in VSCode settings. ' +
			'See the extension README for setup instructions.';
		throw new Error(errorMessage);
	}

	// Validate endpoint URL format
	if (config.agentEndpoint) {
		try {
			new URL(config.agentEndpoint);
		} catch {
			throw new Error(`Invalid agent endpoint URL: ${config.agentEndpoint}`);
		}
	}

	// Validate timeout
	if (config.requestTimeout <= 0) {
		throw new Error('Request timeout must be a positive number');
	}
}

/**
 * Gets a safe configuration object for logging/display (excludes sensitive data)
 */
export function getSafeConfig(config: ExtensionConfig): Omit<ExtensionConfig, 'apiKey'> {
	return {
		agentEndpoint: config.agentEndpoint,
		requestTimeout: config.requestTimeout,
		modelProvider: config.modelProvider,
		modelName: config.modelName
	};
}

/**
 * Checks if the configuration is properly set up
 * Returns an object with status and any error messages
 */
export function checkConfigurationStatus(): { 
	isValid: boolean; 
	missingVars: string[]; 
	warnings: string[] 
} {
	const missingVars: string[] = [];
	const warnings: string[] = [];

	// Check required environment variables
	for (const envVar of REQUIRED_ENV_VARS) {
		if (!process.env[envVar]) {
			missingVars.push(envVar);
		}
	}

	// Check optional but recommended variables
	if (!process.env[ENV_VARS.API_KEY]) {
		warnings.push(`${ENV_VARS.API_KEY} not set - some agent features may not work`);
	}

	if (!process.env[ENV_VARS.MODEL_PROVIDER]) {
		warnings.push(`${ENV_VARS.MODEL_PROVIDER} not set - using default model provider`);
	}

	return {
		isValid: missingVars.length === 0,
		missingVars,
		warnings
	};
}