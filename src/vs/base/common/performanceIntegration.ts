/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PerformanceMonitor } from './performanceUtils.js';
import { StructuredLogger, LogLevel } from './structuredLogging.js';

/**
 * Performance integration utilities for systematic performance monitoring
 */
export class PerformanceIntegration {
	private static instance: PerformanceIntegration;
	private monitor: PerformanceMonitor;
	private logger: StructuredLogger;
	private performanceThresholds: Map<string, number> = new Map();
	private criticalPaths: Set<string> = new Set();

	constructor() {
		this.monitor = PerformanceMonitor.getInstance();
		this.logger = new StructuredLogger({ minLevel: LogLevel.DEBUG });
		this.initializeDefaultThresholds();
	}

	public static getInstance(): PerformanceIntegration {
		if (!this.instance) {
			this.instance = new PerformanceIntegration();
		}
		return this.instance;
	}

	/**
	 * Initialize default performance thresholds for common operations
	 */
	private initializeDefaultThresholds(): void {
		this.performanceThresholds.set('DOM_RENDER', 16); // 60fps target
		this.performanceThresholds.set('FILE_LOAD', 100);
		this.performanceThresholds.set('API_CALL', 200);
		this.performanceThresholds.set('SEARCH_OPERATION', 50);
		this.performanceThresholds.set('SYNTAX_HIGHLIGHTING', 10);
		this.performanceThresholds.set('AUTOCOMPLETE', 20);
		this.performanceThresholds.set('EDITOR_TYPING', 5);
		this.performanceThresholds.set('THEME_CHANGE', 100);
		this.performanceThresholds.set('EXTENSION_LOAD', 500);
		this.performanceThresholds.set('WORKSPACE_OPEN', 1000);
	}

	/**
	 * Add a critical path that should be monitored for performance
	 * @param path - The critical path identifier
	 * @param threshold - Optional performance threshold in milliseconds
	 */
	public addCriticalPath(path: string, threshold?: number): void {
		this.criticalPaths.add(path);
		if (threshold) {
			this.performanceThresholds.set(path, threshold);
		}
	}

	/**
	 * Monitor DOM rendering performance
	 * @param operation - The operation being performed
	 * @param element - The DOM element being rendered
	 * @param callback - The rendering callback
	 */
	public async monitorDOMRender<T>(operation: string, element: HTMLElement, callback: () => T): Promise<T> {
		const label = `DOM_RENDER_${operation}`;
		
		// Use requestAnimationFrame for accurate rendering timing
		return new Promise<T>((resolve) => {
			requestAnimationFrame(() => {
				this.monitor.startTiming(label);
				
				try {
					const result = callback();
					
					// Wait for next frame to ensure rendering is complete
					requestAnimationFrame(() => {
						const duration = this.monitor.endTiming(label);
						this.checkPerformanceThreshold(label, duration);
						resolve(result);
					});
				} catch (error) {
					this.monitor.endTiming(label);
					this.logger.error(`DOM render failed for ${operation}`, { error, operation });
					throw error;
				}
			});
		});
	}

	/**
	 * Monitor file I/O operations
	 * @param operation - The file operation being performed
	 * @param filePath - The file path being accessed
	 * @param callback - The file operation callback
	 */
	public async monitorFileOperation<T>(operation: string, filePath: string, callback: () => Promise<T>): Promise<T> {
		const label = `FILE_${operation.toUpperCase()}`;
		
		this.monitor.startTiming(label);
		
		try {
			const result = await callback();
			const duration = this.monitor.endTiming(label);
			
			this.checkPerformanceThreshold(label, duration);
			
			if (duration > 500) {
				this.logger.warn(`Slow file operation detected`, {
					operation,
					filePath,
					duration,
					threshold: this.performanceThresholds.get('FILE_LOAD')
				});
			}
			
			return result;
		} catch (error) {
			this.monitor.endTiming(label);
			this.logger.error(`File operation failed`, { operation, filePath, error });
			throw error;
		}
	}

	/**
	 * Monitor API calls and network operations
	 * @param endpoint - The API endpoint being called
	 * @param method - The HTTP method
	 * @param callback - The API call callback
	 */
	public async monitorApiCall<T>(endpoint: string, method: string, callback: () => Promise<T>): Promise<T> {
		const label = `API_${method.toUpperCase()}_${endpoint}`;
		
		this.monitor.startTiming(label);
		
		try {
			const result = await callback();
			const duration = this.monitor.endTiming(label);
			
			this.checkPerformanceThreshold('API_CALL', duration);
			
			if (duration > 1000) {
				this.logger.warn(`Slow API call detected`, {
					endpoint,
					method,
					duration,
					threshold: this.performanceThresholds.get('API_CALL')
				});
			}
			
			return result;
		} catch (error) {
			this.monitor.endTiming(label);
			this.logger.error(`API call failed`, { endpoint, method, error });
			throw error;
		}
	}

	/**
	 * Monitor search operations
	 * @param query - The search query
	 * @param scope - The search scope
	 * @param callback - The search callback
	 */
	public async monitorSearch<T>(query: string, scope: string, callback: () => Promise<T>): Promise<T> {
		const label = `SEARCH_${scope.toUpperCase()}`;
		
		this.monitor.startTiming(label);
		
		try {
			const result = await callback();
			const duration = this.monitor.endTiming(label);
			
			this.checkPerformanceThreshold('SEARCH_OPERATION', duration);
			
			if (duration > 200) {
				this.logger.warn(`Slow search operation detected`, {
					query: query.length > 100 ? query.substring(0, 100) + '...' : query,
					scope,
					duration,
					threshold: this.performanceThresholds.get('SEARCH_OPERATION')
				});
			}
			
			return result;
		} catch (error) {
			this.monitor.endTiming(label);
			this.logger.error(`Search operation failed`, { query, scope, error });
			throw error;
		}
	}

	/**
	 * Monitor editor operations like typing, autocomplete, etc.
	 * @param operation - The editor operation
	 * @param context - Additional context information
	 * @param callback - The operation callback
	 */
	public async monitorEditorOperation<T>(operation: string, context: any, callback: () => T): Promise<T> {
		const label = `EDITOR_${operation.toUpperCase()}`;
		
		this.monitor.startTiming(label);
		
		try {
			const result = callback();
			const duration = this.monitor.endTiming(label);
			
			// Editor operations should be very fast
			const threshold = this.performanceThresholds.get(`EDITOR_${operation.toUpperCase()}`) || 10;
			this.checkPerformanceThreshold(label, duration, threshold);
			
			if (duration > threshold) {
				this.logger.warn(`Slow editor operation detected`, {
					operation,
					context,
					duration,
					threshold
				});
			}
			
			return result;
		} catch (error) {
			this.monitor.endTiming(label);
			this.logger.error(`Editor operation failed`, { operation, context, error });
			throw error;
		}
	}

	/**
	 * Monitor extension loading performance
	 * @param extensionId - The extension identifier
	 * @param callback - The extension loading callback
	 */
	public async monitorExtensionLoad<T>(extensionId: string, callback: () => Promise<T>): Promise<T> {
		const label = `EXTENSION_LOAD_${extensionId}`;
		
		this.monitor.startTiming(label);
		
		try {
			const result = await callback();
			const duration = this.monitor.endTiming(label);
			
			this.checkPerformanceThreshold('EXTENSION_LOAD', duration);
			
			if (duration > 1000) {
				this.logger.warn(`Slow extension loading detected`, {
					extensionId,
					duration,
					threshold: this.performanceThresholds.get('EXTENSION_LOAD')
				});
			}
			
			return result;
		} catch (error) {
			this.monitor.endTiming(label);
			this.logger.error(`Extension loading failed`, { extensionId, error });
			throw error;
		}
	}

	/**
	 * Monitor memory usage during operations
	 * @param operation - The operation being performed
	 * @param callback - The operation callback
	 */
	public async monitorMemoryUsage<T>(operation: string, callback: () => Promise<T>): Promise<T> {
		const initialMemory = this.getMemoryUsage();
		
		try {
			const result = await callback();
			const finalMemory = this.getMemoryUsage();
			const memoryDelta = finalMemory - initialMemory;
			
			this.logger.debug(`Memory usage for ${operation}`, {
				operation,
				initialMemory,
				finalMemory,
				memoryDelta,
				memoryDeltaMB: Math.round(memoryDelta / 1024 / 1024 * 100) / 100
			});
			
			// Log warning if memory usage increased significantly
			if (memoryDelta > 50 * 1024 * 1024) { // 50MB threshold
				this.logger.warn(`High memory usage detected`, {
					operation,
					memoryDeltaMB: Math.round(memoryDelta / 1024 / 1024 * 100) / 100
				});
			}
			
			return result;
		} catch (error) {
			this.logger.error(`Operation failed during memory monitoring`, { operation, error });
			throw error;
		}
	}

	/**
	 * Get current memory usage
	 */
	private getMemoryUsage(): number {
		if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
			return (performance as any).memory.usedJSHeapSize;
		}
		return 0;
	}

	/**
	 * Check if operation exceeded performance threshold
	 * @param operation - The operation name
	 * @param duration - The operation duration
	 * @param customThreshold - Optional custom threshold
	 */
	private checkPerformanceThreshold(operation: string, duration: number, customThreshold?: number): void {
		const threshold = customThreshold || this.performanceThresholds.get(operation);
		
		if (threshold && duration > threshold) {
			this.logger.warn(`Performance threshold exceeded`, {
				operation,
				duration,
				threshold,
				overageMs: duration - threshold,
				overagePercent: Math.round((duration - threshold) / threshold * 100)
			});
		}
	}

	/**
	 * Get performance summary for all monitored operations
	 */
	public getPerformanceSummary(): any {
		const metrics = this.monitor.getAllMetrics();
		const summary: any = {
			timestamp: new Date().toISOString(),
			criticalPaths: Array.from(this.criticalPaths),
			thresholds: Object.fromEntries(this.performanceThresholds),
			operations: {}
		};
		
		for (const [operation, times] of Object.entries(metrics)) {
			const average = times.reduce((sum, time) => sum + time, 0) / times.length;
			const max = Math.max(...times);
			const min = Math.min(...times);
			const threshold = this.performanceThresholds.get(operation);
			
			summary.operations[operation] = {
				count: times.length,
				average: Math.round(average * 100) / 100,
				max: Math.round(max * 100) / 100,
				min: Math.round(min * 100) / 100,
				threshold,
				exceedsThreshold: threshold ? average > threshold : false
			};
		}
		
		return summary;
	}

	/**
	 * Reset all performance metrics
	 */
	public resetMetrics(): void {
		this.monitor.clearMetrics();
		this.logger.info('Performance metrics reset');
	}

	/**
	 * Set performance threshold for an operation
	 * @param operation - The operation name
	 * @param threshold - The threshold in milliseconds
	 */
	public setPerformanceThreshold(operation: string, threshold: number): void {
		this.performanceThresholds.set(operation, threshold);
		this.logger.debug(`Performance threshold set for ${operation}`, { threshold });
	}

	/**
	 * Enable performance monitoring for the entire application
	 */
	public enableGlobalPerformanceMonitoring(): void {
		// Monitor long tasks
		if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
			const observer = new PerformanceObserver((list) => {
				const longTasks = list.getEntries().filter(entry => entry.duration > 50);
				
				for (const task of longTasks) {
					this.logger.warn('Long task detected', {
						name: task.name,
						duration: task.duration,
						startTime: task.startTime
					});
				}
			});
			
			observer.observe({ entryTypes: ['longtask'] });
		}
		
		// Monitor memory periodically
		if (typeof window !== 'undefined') {
			setInterval(() => {
				const memoryUsage = this.getMemoryUsage();
				if (memoryUsage > 0) {
					this.logger.debug('Memory usage check', {
						memoryUsageMB: Math.round(memoryUsage / 1024 / 1024 * 100) / 100
					});
				}
			}, 30000); // Check every 30 seconds
		}
		
		this.logger.info('Global performance monitoring enabled');
	}
}