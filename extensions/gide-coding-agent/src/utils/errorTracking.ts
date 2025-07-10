/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Error tracking and monitoring utilities for Gide Coding Agent
 */

export interface ErrorContext {
	message?: string;
	userId?: string;
	sessionId?: string;
	url?: string;
	userAgent?: string;
	timestamp?: string;
	environment?: string;
	extensionVersion?: string;
}

export interface TrackedError {
	timestamp: string;
	provider?: string;
	error: {
		code?: string;
		status?: number;
		message: string;
		stack?: string;
	};
	context: ErrorContext;
	id: string;
}

/**
 * In-memory error storage for the current session
 */
class ErrorStore {
	private errors: TrackedError[] = [];
	private maxErrors = 100; // Keep last 100 errors

	add(error: TrackedError): void {
		this.errors.unshift(error);
		if (this.errors.length > this.maxErrors) {
			this.errors = this.errors.slice(0, this.maxErrors);
		}
	}

	getAll(): TrackedError[] {
		return [...this.errors];
	}

	getByProvider(provider: string): TrackedError[] {
		return this.errors.filter(e => e.provider === provider);
	}

	getRecent(minutes: number = 10): TrackedError[] {
		const cutoff = Date.now() - (minutes * 60 * 1000);
		return this.errors.filter(e => new Date(e.timestamp).getTime() > cutoff);
	}

	clear(): void {
		this.errors = [];
	}

	getStats(): {
		total: number;
		byProvider: Record<string, number>;
		recentCount: number;
	} {
		const byProvider: Record<string, number> = {};
		
		for (const error of this.errors) {
			if (error.provider) {
				byProvider[error.provider] = (byProvider[error.provider] || 0) + 1;
			}
		}

		return {
			total: this.errors.length,
			byProvider,
			recentCount: this.getRecent(5).length
		};
	}
}

const errorStore = new ErrorStore();

/**
 * Tracks an API error with context information
 */
export function trackAPIError(provider: string, error: any, context: Partial<ErrorContext> = {}): string {
	const errorId = generateErrorId();
	
	const trackedError: TrackedError = {
		id: errorId,
		timestamp: new Date().toISOString(),
		provider,
		error: {
			code: error.code,
			status: error.statusCode || error.status,
			message: error.message || String(error),
			stack: error.stack
		},
		context: {
			timestamp: new Date().toISOString(),
			environment: getEnvironment(),
			extensionVersion: getExtensionVersion(),
			...context
		}
	};

	// Store the error
	errorStore.add(trackedError);

	// Log to console for immediate debugging
	console.error('[GIDE_API_ERROR]', {
		id: errorId,
		provider,
		message: trackedError.error.message,
		context: trackedError.context
	});

	// Could send to external logging service here if configured
	// await sendToLoggingService(trackedError);

	return errorId;
}

/**
 * Tracks a general error (non-API)
 */
export function trackError(error: any, context: Partial<ErrorContext> = {}): string {
	return trackAPIError('general', error, context);
}

/**
 * Gets error statistics
 */
export function getErrorStats() {
	return errorStore.getStats();
}

/**
 * Gets all tracked errors
 */
export function getAllErrors(): TrackedError[] {
	return errorStore.getAll();
}

/**
 * Gets errors for a specific provider
 */
export function getProviderErrors(provider: string): TrackedError[] {
	return errorStore.getByProvider(provider);
}

/**
 * Gets recent errors within specified minutes
 */
export function getRecentErrors(minutes: number = 10): TrackedError[] {
	return errorStore.getRecent(minutes);
}

/**
 * Clears all stored errors
 */
export function clearErrors(): void {
	errorStore.clear();
}

/**
 * Generates a unique error ID
 */
function generateErrorId(): string {
	return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gets the current environment
 */
function getEnvironment(): string {
	return process.env.NODE_ENV || 'production';
}

/**
 * Gets the extension version
 */
function getExtensionVersion(): string {
	// In a real VSCode extension, you'd get this from the package.json
	return '1.0.0';
}

/**
 * Creates an error summary for health monitoring
 */
export function createErrorSummary(): {
	totalErrors: number;
	recentErrors: number;
	providerErrors: Record<string, number>;
	topErrors: Array<{ message: string; count: number; lastSeen: string }>;
} {
	const allErrors = errorStore.getAll();
	const recentErrors = errorStore.getRecent(10);
	const stats = errorStore.getStats();

	// Group errors by message to find common issues
	const errorCounts: Record<string, { count: number; lastSeen: string }> = {};
	
	for (const error of allErrors) {
		const key = error.error.message;
		if (!errorCounts[key]) {
			errorCounts[key] = { count: 0, lastSeen: error.timestamp };
		}
		errorCounts[key].count++;
		if (new Date(error.timestamp) > new Date(errorCounts[key].lastSeen)) {
			errorCounts[key].lastSeen = error.timestamp;
		}
	}

	// Get top 5 most common errors
	const topErrors = Object.entries(errorCounts)
		.sort(([, a], [, b]) => b.count - a.count)
		.slice(0, 5)
		.map(([message, data]) => ({
			message,
			count: data.count,
			lastSeen: data.lastSeen
		}));

	return {
		totalErrors: allErrors.length,
		recentErrors: recentErrors.length,
		providerErrors: stats.byProvider,
		topErrors
	};
}

/**
 * Logs error summary to console
 */
export function logErrorSummary(): void {
	const summary = createErrorSummary();
	
	console.log('[GIDE_ERROR_SUMMARY]', {
		timestamp: new Date().toISOString(),
		...summary
	});
}

/**
 * Health check that includes error information
 */
export function getErrorHealthStatus(): {
	status: 'healthy' | 'warning' | 'critical';
	recentErrorCount: number;
	totalErrorCount: number;
	details: string;
} {
	const recentErrors = errorStore.getRecent(5);
	const totalErrors = errorStore.getAll().length;

	let status: 'healthy' | 'warning' | 'critical' = 'healthy';
	let details = 'No recent errors';

	if (recentErrors.length > 0) {
		if (recentErrors.length >= 5) {
			status = 'critical';
			details = `${recentErrors.length} errors in the last 5 minutes`;
		} else if (recentErrors.length >= 2) {
			status = 'warning';
			details = `${recentErrors.length} errors in the last 5 minutes`;
		} else {
			details = `${recentErrors.length} error in the last 5 minutes`;
		}
	}

	return {
		status,
		recentErrorCount: recentErrors.length,
		totalErrorCount: totalErrors,
		details
	};
}