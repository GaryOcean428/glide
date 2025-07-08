/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Structured logging system to replace console.log usage with proper logging
 */

export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3,
	TRACE = 4
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	context?: any;
	source?: string;
	metadata?: any;
}

export interface LoggerOptions {
	minLevel?: LogLevel;
	includeTimestamp?: boolean;
	includeSource?: boolean;
	formatJson?: boolean;
	enableConsoleOutput?: boolean;
}

/**
 * Structured logger with multiple output targets and formatting options
 */
export class StructuredLogger {
	private static instance: StructuredLogger;
	private options: LoggerOptions;
	private logs: LogEntry[] = [];
	private maxLogEntries: number = 1000;

	constructor(options: LoggerOptions = {}) {
		this.options = {
			minLevel: LogLevel.INFO,
			includeTimestamp: true,
			includeSource: true,
			formatJson: false,
			enableConsoleOutput: true,
			...options
		};
	}

	public static getInstance(options?: LoggerOptions): StructuredLogger {
		if (!this.instance) {
			this.instance = new StructuredLogger(options);
		}
		return this.instance;
	}

	/**
	 * Log an error message
	 * @param message - The error message
	 * @param context - Additional context
	 * @param source - Source of the log entry
	 */
	public error(message: string, context?: any, source?: string): void {
		this.log(LogLevel.ERROR, message, context, source);
	}

	/**
	 * Log a warning message
	 * @param message - The warning message
	 * @param context - Additional context
	 * @param source - Source of the log entry
	 */
	public warn(message: string, context?: any, source?: string): void {
		this.log(LogLevel.WARN, message, context, source);
	}

	/**
	 * Log an info message
	 * @param message - The info message
	 * @param context - Additional context
	 * @param source - Source of the log entry
	 */
	public info(message: string, context?: any, source?: string): void {
		this.log(LogLevel.INFO, message, context, source);
	}

	/**
	 * Log a debug message
	 * @param message - The debug message
	 * @param context - Additional context
	 * @param source - Source of the log entry
	 */
	public debug(message: string, context?: any, source?: string): void {
		this.log(LogLevel.DEBUG, message, context, source);
	}

	/**
	 * Log a trace message
	 * @param message - The trace message
	 * @param context - Additional context
	 * @param source - Source of the log entry
	 */
	public trace(message: string, context?: any, source?: string): void {
		this.log(LogLevel.TRACE, message, context, source);
	}

	/**
	 * Log a message with specified level
	 * @param level - The log level
	 * @param message - The message
	 * @param context - Additional context
	 * @param source - Source of the log entry
	 */
	public log(level: LogLevel, message: string, context?: any, source?: string): void {
		if (level > this.options.minLevel!) {
			return;
		}

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			context,
			source: source || this.getCallerInfo(),
			metadata: {
				userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
				url: typeof window !== 'undefined' ? window.location.href : 'N/A'
			}
		};

		this.addEntry(entry);
		
		if (this.options.enableConsoleOutput) {
			this.outputToConsole(entry);
		}
	}

	/**
	 * Add a log entry to the internal store
	 * @param entry - The log entry to add
	 */
	private addEntry(entry: LogEntry): void {
		this.logs.push(entry);
		
		// Keep only the most recent entries to prevent memory issues
		if (this.logs.length > this.maxLogEntries) {
			this.logs = this.logs.slice(-this.maxLogEntries);
		}
	}

	/**
	 * Output log entry to console
	 * @param entry - The log entry to output
	 */
	private outputToConsole(entry: LogEntry): void {
		const formatted = this.formatLogEntry(entry);
		
		switch (entry.level) {
			case LogLevel.ERROR:
				console.error(formatted);
				break;
			case LogLevel.WARN:
				console.warn(formatted);
				break;
			case LogLevel.INFO:
				console.info(formatted);
				break;
			case LogLevel.DEBUG:
			case LogLevel.TRACE:
				console.log(formatted);
				break;
		}
	}

	/**
	 * Format a log entry for output
	 * @param entry - The log entry to format
	 * @returns Formatted log entry
	 */
	private formatLogEntry(entry: LogEntry): string {
		if (this.options.formatJson) {
			return JSON.stringify(entry);
		}

		const parts: string[] = [];
		
		if (this.options.includeTimestamp) {
			parts.push(`[${entry.timestamp}]`);
		}
		
		parts.push(`[${LogLevel[entry.level]}]`);
		
		if (this.options.includeSource && entry.source) {
			parts.push(`[${entry.source}]`);
		}
		
		parts.push(entry.message);
		
		if (entry.context) {
			parts.push(JSON.stringify(entry.context));
		}

		return parts.join(' ');
	}

	/**
	 * Get caller information for source tracking
	 * @returns Caller information
	 */
	private getCallerInfo(): string {
		const stack = new Error().stack;
		if (!stack) return 'unknown';
		
		const lines = stack.split('\n');
		// Skip the first few lines (this function, log function, etc.)
		const callerLine = lines[4] || lines[3] || lines[2];
		
		if (callerLine) {
			const match = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/);
			if (match) {
				return `${match[1]}:${match[3]}`;
			}
		}
		
		return 'unknown';
	}

	/**
	 * Get all log entries
	 * @returns Array of log entries
	 */
	public getLogs(): LogEntry[] {
		return [...this.logs];
	}

	/**
	 * Get logs filtered by level
	 * @param level - The minimum log level to include
	 * @returns Filtered array of log entries
	 */
	public getLogsByLevel(level: LogLevel): LogEntry[] {
		return this.logs.filter(entry => entry.level <= level);
	}

	/**
	 * Clear all log entries
	 */
	public clearLogs(): void {
		this.logs = [];
	}

	/**
	 * Export logs as JSON
	 * @returns JSON string of all log entries
	 */
	public exportLogs(): string {
		return JSON.stringify(this.logs, null, 2);
	}

	/**
	 * Set the minimum log level
	 * @param level - The minimum log level
	 */
	public setMinLevel(level: LogLevel): void {
		this.options.minLevel = level;
	}

	/**
	 * Enable or disable console output
	 * @param enabled - Whether to enable console output
	 */
	public setConsoleOutput(enabled: boolean): void {
		this.options.enableConsoleOutput = enabled;
	}
}

/**
 * Global logger instance
 */
export const logger = StructuredLogger.getInstance();

/**
 * Convenience functions for common logging patterns
 */
export const logError = (message: string, context?: any, source?: string) => logger.error(message, context, source);
export const logWarn = (message: string, context?: any, source?: string) => logger.warn(message, context, source);
export const logInfo = (message: string, context?: any, source?: string) => logger.info(message, context, source);
export const logDebug = (message: string, context?: any, source?: string) => logger.debug(message, context, source);
export const logTrace = (message: string, context?: any, source?: string) => logger.trace(message, context, source);

/**
 * Performance logging decorator
 * @param target - Target object
 * @param propertyKey - Property key
 * @param descriptor - Property descriptor
 */
export function logPerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	const originalMethod = descriptor.value;
	
	descriptor.value = async function (...args: any[]) {
		const start = Date.now();
		const source = `${target.constructor.name}.${propertyKey}`;
		
		try {
			const result = await originalMethod.apply(this, args);
			const duration = Date.now() - start;
			
			logger.debug(`Method ${source} completed in ${duration}ms`, { args, duration }, source);
			return result;
		} catch (error) {
			const duration = Date.now() - start;
			logger.error(`Method ${source} failed after ${duration}ms`, { args, error, duration }, source);
			throw error;
		}
	};
	
	return descriptor;
}