/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Enhanced error handling and logging utilities
 */

/**
 * Base application error class with enhanced information
 */
export class ApplicationError extends Error {
	public readonly timestamp: Date;
	public readonly context?: any;

	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 500,
		public readonly isOperational: boolean = true,
		context?: any
	) {
		super(message);
		this.name = this.constructor.name || 'ApplicationError';
		this.timestamp = new Date();
		this.context = context;
		
		// Ensure proper prototype chain
		if (Object.setPrototypeOf) {
			Object.setPrototypeOf(this, ApplicationError.prototype);
		} else {
			(this as any).__proto__ = ApplicationError.prototype;
		}
		
		// Capture stack trace if available
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Converts error to JSON for logging
	 */
	public toJSON(): object {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			statusCode: this.statusCode,
			isOperational: this.isOperational,
			timestamp: this.timestamp.toISOString(),
			stack: this.stack,
			context: this.context
		};
	}
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends ApplicationError {
	constructor(message: string, public readonly field?: string, context?: any) {
		super(message, 'VALIDATION_ERROR', 400, true, context);
		this.name = 'ValidationError';
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

/**
 * Authentication error
 */
export class AuthenticationError extends ApplicationError {
	constructor(message: string = 'Authentication failed', context?: any) {
		super(message, 'AUTHENTICATION_ERROR', 401, true, context);
		this.name = 'AuthenticationError';
		Object.setPrototypeOf(this, AuthenticationError.prototype);
	}
}

/**
 * Authorization error
 */
export class AuthorizationError extends ApplicationError {
	constructor(message: string = 'Access denied', context?: any) {
		super(message, 'AUTHORIZATION_ERROR', 403, true, context);
		this.name = 'AuthorizationError';
		Object.setPrototypeOf(this, AuthorizationError.prototype);
	}
}

/**
 * Not found error
 */
export class NotFoundError extends ApplicationError {
	constructor(message: string = 'Resource not found', context?: any) {
		super(message, 'NOT_FOUND_ERROR', 404, true, context);
		this.name = 'NotFoundError';
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApplicationError {
	constructor(message: string = 'Rate limit exceeded', context?: any) {
		super(message, 'RATE_LIMIT_ERROR', 429, true, context);
		this.name = 'RateLimitError';
		Object.setPrototypeOf(this, RateLimitError.prototype);
	}
}

/**
 * Log levels for structured logging
 */
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	FATAL = 4
}

/**
 * Log entry interface
 */
export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	service: string;
	meta?: any;
	error?: any;
	userId?: string;
	requestId?: string;
	sessionId?: string;
}

/**
 * Logger interface
 */
export interface ILogger {
	debug(message: string, meta?: any): void;
	info(message: string, meta?: any): void;
	warn(message: string, meta?: any): void;
	error(message: string, error?: Error, meta?: any): void;
	fatal(message: string, error?: Error, meta?: any): void;
}

/**
 * Enhanced logger with structured logging
 */
export class Logger implements ILogger {
	private static instance: Logger;
	private logLevel: LogLevel = LogLevel.INFO;
	private context: any = {};

	constructor(
		private service: string = 'gide',
		logLevel: LogLevel = LogLevel.INFO
	) {
		this.logLevel = logLevel;
	}

	public static getInstance(service?: string): Logger {
		if (!this.instance) {
			this.instance = new Logger(service);
		}
		return this.instance;
	}

	/**
	 * Sets the log level
	 */
	public setLogLevel(level: LogLevel): void {
		this.logLevel = level;
	}

	/**
	 * Sets context information for all log entries
	 */
	public setContext(context: any): void {
		this.context = { ...this.context, ...context };
	}

	/**
	 * Clears the context
	 */
	public clearContext(): void {
		this.context = {};
	}

	/**
	 * Creates a child logger with additional context
	 */
	public child(additionalContext: any): Logger {
		const childLogger = new Logger(this.service, this.logLevel);
		childLogger.setContext({ ...this.context, ...additionalContext });
		return childLogger;
	}

	private formatMessage(level: LogLevel, message: string, meta?: any, error?: Error): string {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: LogLevel[level],
			message,
			service: this.service,
			...this.context
		};

		if (meta) {
			entry.meta = meta;
		}

		if (error) {
			entry.error = {
				name: error.name,
				message: error.message,
				stack: error.stack,
				...(error instanceof ApplicationError ? error.toJSON() : {})
			};
		}

		return JSON.stringify(entry);
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.logLevel;
	}

	public debug(message: string, meta?: any): void {
		if (this.shouldLog(LogLevel.DEBUG)) {
			this.output(this.formatMessage(LogLevel.DEBUG, message, meta));
		}
	}

	public info(message: string, meta?: any): void {
		if (this.shouldLog(LogLevel.INFO)) {
			this.output(this.formatMessage(LogLevel.INFO, message, meta));
		}
	}

	public warn(message: string, meta?: any): void {
		if (this.shouldLog(LogLevel.WARN)) {
			this.output(this.formatMessage(LogLevel.WARN, message, meta));
		}
	}

	public error(message: string, error?: Error, meta?: any): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			this.output(this.formatMessage(LogLevel.ERROR, message, meta, error));
		}
	}

	public fatal(message: string, error?: Error, meta?: any): void {
		if (this.shouldLog(LogLevel.FATAL)) {
			this.output(this.formatMessage(LogLevel.FATAL, message, meta, error));
		}
	}

	/**
	 * Output method that can be overridden for different environments
	 * @param message - Formatted log message
	 */
	private output(message: string): void {
		if (typeof process !== 'undefined' && process.stderr) {
			process.stderr.write(message + '\n');
		} else {
			// Fallback for browser environments
			console.log(message);
		}
	}
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
	private static logger = Logger.getInstance('error-handler');

	/**
	 * Handles async errors and returns a tuple [result, error]
	 */
	public static async handleAsync<T>(
		promise: Promise<T>
	): Promise<[T | null, Error | null]> {
		try {
			const result = await promise;
			return [result, null];
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error('Async operation failed', err);
			return [null, err];
		}
	}

	/**
	 * Wraps a function with error handling
	 */
	public static withErrorHandling<T extends (...args: any[]) => any>(
		fn: T,
		fallback?: (...args: Parameters<T>) => ReturnType<T>
	): T {
		return ((...args: Parameters<T>) => {
			try {
				return fn(...args);
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));
				this.logger.error('Function execution failed', err, { args });
				
				if (fallback) {
					return fallback(...args);
				}
				
				throw err;
			}
		}) as T;
	}

	/**
	 * Wraps an async function with error handling
	 */
	public static withAsyncErrorHandling<T extends (...args: any[]) => Promise<any>>(
		fn: T,
		fallback?: (...args: Parameters<T>) => ReturnType<T>
	): T {
		return (async (...args: Parameters<T>) => {
			try {
				return await fn(...args);
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));
				this.logger.error('Async function execution failed', err, { args });
				
				if (fallback) {
					return await fallback(...args);
				}
				
				throw err;
			}
		}) as T;
	}

	/**
	 * Handles unhandled promise rejections
	 */
	public static setupGlobalErrorHandling(): void {
		// Handle unhandled promise rejections
		if (typeof process !== 'undefined') {
			process.on('unhandledRejection', (reason, promise) => {
				this.logger.error('Unhandled Promise Rejection', 
					reason instanceof Error ? reason : new Error(String(reason)),
					{ promise }
				);
			});

			process.on('uncaughtException', (error) => {
				this.logger.fatal('Uncaught Exception', error);
				// Don't exit the process in production, just log
				// process.exit(1);
			});
		}

		// Handle unhandled errors in browser
		if (typeof window !== 'undefined') {
			window.addEventListener('error', (event) => {
				this.logger.error('Uncaught Error', event.error, {
					filename: event.filename,
					lineno: event.lineno,
					colno: event.colno
				});
			});

			window.addEventListener('unhandledrejection', (event) => {
				this.logger.error('Unhandled Promise Rejection',
					event.reason instanceof Error ? event.reason : new Error(String(event.reason))
				);
			});
		}
	}

	/**
	 * Creates a retry wrapper for functions
	 */
	public static withRetry<T extends (...args: any[]) => any>(
		fn: T,
		maxRetries: number = 3,
		delay: number = 1000,
		backoff: boolean = true
	): T {
		return (async (...args: Parameters<T>) => {
			let lastError: Error;
			
			for (let attempt = 0; attempt <= maxRetries; attempt++) {
				try {
					return await fn(...args);
				} catch (error) {
					lastError = error instanceof Error ? error : new Error(String(error));
					
					if (attempt === maxRetries) {
						this.logger.error(`Function failed after ${maxRetries + 1} attempts`, lastError, { args });
						throw lastError;
					}
					
					const currentDelay = backoff ? delay * Math.pow(2, attempt) : delay;
					this.logger.warn(`Function failed, retrying in ${currentDelay}ms`, lastError, { 
						attempt: attempt + 1, 
						maxRetries: maxRetries + 1 
					});
					
					await new Promise(resolve => setTimeout(resolve, currentDelay));
				}
			}
			
			throw lastError!;
		}) as T;
	}

	/**
	 * Circuit breaker pattern implementation
	 */
	public static createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
		fn: T,
		failureThreshold: number = 5,
		recoveryTimeout: number = 60000
	): T {
		let failureCount = 0;
		let lastFailureTime = 0;
		let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

		return (async (...args: Parameters<T>) => {
			const now = Date.now();

			// Check if we should attempt recovery
			if (state === 'OPEN' && now - lastFailureTime > recoveryTimeout) {
				state = 'HALF_OPEN';
				failureCount = 0;
			}

			// Reject immediately if circuit is open
			if (state === 'OPEN') {
				throw new ApplicationError(
					'Circuit breaker is OPEN',
					'CIRCUIT_BREAKER_OPEN',
					503
				);
			}

			try {
				const result = await fn(...args);
				
				// Success - reset circuit breaker
				if (state === 'HALF_OPEN') {
					state = 'CLOSED';
				}
				failureCount = 0;
				
				return result;
			} catch (error) {
				failureCount++;
				lastFailureTime = now;

				// Open circuit if threshold reached
				if (failureCount >= failureThreshold) {
					state = 'OPEN';
					this.logger.warn('Circuit breaker opened', undefined, {
						failureCount,
						failureThreshold,
						state
					});
				}

				throw error;
			}
		}) as T;
	}
}

/**
 * Validation utilities
 */
export class ValidationUtils {
	/**
	 * Validates required fields
	 */
	public static validateRequired(value: any, fieldName: string): void {
		if (value === null || value === undefined || value === '') {
			throw new ValidationError(`${fieldName} is required`, fieldName);
		}
	}

	/**
	 * Validates string length
	 */
	public static validateLength(
		value: string,
		fieldName: string,
		min?: number,
		max?: number
	): void {
		if (min !== undefined && value.length < min) {
			throw new ValidationError(
				`${fieldName} must be at least ${min} characters`,
				fieldName
			);
		}
		
		if (max !== undefined && value.length > max) {
			throw new ValidationError(
				`${fieldName} must be at most ${max} characters`,
				fieldName
			);
		}
	}

	/**
	 * Validates using a regular expression
	 */
	public static validatePattern(
		value: string,
		pattern: RegExp,
		fieldName: string,
		message?: string
	): void {
		if (!pattern.test(value)) {
			throw new ValidationError(
				message || `${fieldName} has invalid format`,
				fieldName
			);
		}
	}

	/**
	 * Validates that a value is one of the allowed values
	 */
	public static validateEnum<T>(
		value: T,
		allowedValues: T[],
		fieldName: string
	): void {
		if (!allowedValues.includes(value)) {
			throw new ValidationError(
				`${fieldName} must be one of: ${allowedValues.join(', ')}`,
				fieldName
			);
		}
	}

	/**
	 * Validates object schema
	 */
	public static validateObject(
		obj: any,
		schema: Record<string, (value: any) => void>
	): void {
		for (const [field, validator] of Object.entries(schema)) {
			try {
				validator(obj[field]);
			} catch (error) {
				if (error instanceof ValidationError) {
					throw error;
				}
				throw new ValidationError(`Validation failed for ${field}`, field);
			}
		}
	}
}