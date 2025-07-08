/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mark, getMarks } from './performance.js';

/**
 * Enhanced performance monitoring and optimization utilities
 */
export class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private metrics: Map<string, number[]> = new Map();
	private observers: PerformanceObserver[] = [];

	public static getInstance(): PerformanceMonitor {
		if (!this.instance) {
			this.instance = new PerformanceMonitor();
		}
		return this.instance;
	}

	/**
	 * Starts timing a specific operation
	 * @param label - The label for the operation
	 */
	public startTiming(label: string): void {
		mark(`${label}-start`);
	}

	/**
	 * Ends timing for a specific operation
	 * @param label - The label for the operation
	 * @returns The duration of the operation in milliseconds
	 */
	public endTiming(label: string): number {
		mark(`${label}-end`);
		
		const marks = getMarks();
		const startMark = marks.find(m => m.name === `${label}-start`);
		const endMark = marks.find(m => m.name === `${label}-end`);
		
		if (startMark && endMark) {
			const duration = endMark.startTime - startMark.startTime;
			
			if (!this.metrics.has(label)) {
				this.metrics.set(label, []);
			}
			this.metrics.get(label)!.push(duration);
			
			return duration;
		}
		
		return 0;
	}

	/**
	 * Times a function execution
	 * @param label - The label for the operation
	 * @param fn - The function to time
	 * @returns The result of the function
	 */
	public time<T>(label: string, fn: () => T): T {
		this.startTiming(label);
		try {
			return fn();
		} finally {
			this.endTiming(label);
		}
	}

	/**
	 * Times an async function execution
	 * @param label - The label for the operation
	 * @param fn - The async function to time
	 * @returns Promise that resolves to the result of the function
	 */
	public async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
		this.startTiming(label);
		try {
			return await fn();
		} finally {
			this.endTiming(label);
		}
	}

	/**
	 * Gets the average time for a specific operation
	 * @param label - The label for the operation
	 * @returns The average time in milliseconds
	 */
	public getAverageTime(label: string): number {
		const times = this.metrics.get(label) || [];
		if (times.length === 0) return 0;
		return times.reduce((sum, time) => sum + time, 0) / times.length;
	}

	/**
	 * Gets all metrics
	 * @returns Object containing all metrics
	 */
	public getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
		const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
		
		this.metrics.forEach((times, label) => {
			if (times.length > 0) {
				result[label] = {
					avg: this.getAverageTime(label),
					min: Math.min(...times),
					max: Math.max(...times),
					count: times.length
				};
			}
		});
		
		return result;
	}

	/**
	 * Clears all metrics
	 */
	public clearMetrics(): void {
		this.metrics.clear();
	}

	/**
	 * Observes performance entries
	 * @param entryTypes - Types of entries to observe
	 * @param callback - Callback function for handling entries
	 */
	public observe(entryTypes: string[], callback: (entries: PerformanceEntry[]) => void): void {
		if (typeof PerformanceObserver !== 'undefined') {
			const observer = new PerformanceObserver((list) => {
				callback(list.getEntries());
			});
			
			try {
				observer.observe({ entryTypes });
				this.observers.push(observer);
			} catch (e) {
				// PerformanceObserver might not be available in all environments
				console.warn('PerformanceObserver not available:', e);
			}
		}
	}

	/**
	 * Disposes all observers
	 */
	public dispose(): void {
		this.observers.forEach(observer => observer.disconnect());
		this.observers = [];
	}
}

/**
 * Memory monitoring utilities
 */
export class MemoryMonitor {
	private static instance: MemoryMonitor;
	private memoryUsage: Array<{ timestamp: number; usage: any }> = [];
	private maxEntries = 100;

	public static getInstance(): MemoryMonitor {
		if (!this.instance) {
			this.instance = new MemoryMonitor();
		}
		return this.instance;
	}

	/**
	 * Records current memory usage
	 */
	public recordMemoryUsage(): void {
		let usage: any = {};
		
		// Browser environment
		if (typeof performance !== 'undefined' && (performance as any).memory) {
			usage = {
				usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
				totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
				jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
			};
		}
		// Node.js environment
		else if (typeof process !== 'undefined' && process.memoryUsage) {
			const memUsage = process.memoryUsage();
			usage = {
				rss: memUsage.rss,
				heapTotal: memUsage.heapTotal,
				heapUsed: memUsage.heapUsed,
				external: memUsage.external
			};
		}
		
		if (Object.keys(usage).length > 0) {
			this.memoryUsage.push({
				timestamp: Date.now(),
				usage
			});
			
			// Keep only the last maxEntries
			if (this.memoryUsage.length > this.maxEntries) {
				this.memoryUsage.shift();
			}
		}
	}

	/**
	 * Gets memory usage statistics
	 * @returns Memory usage statistics
	 */
	public getMemoryStats(): {
		current: any;
		peak: any;
		average: any;
		trend: 'increasing' | 'decreasing' | 'stable';
	} | null {
		if (this.memoryUsage.length === 0) return null;
		
		const latest = this.memoryUsage[this.memoryUsage.length - 1];
		const usages = this.memoryUsage.map(entry => entry.usage);
		
		// Calculate peak usage
		const peak = usages.reduce((max, usage) => {
			const currentSize = usage.usedJSHeapSize || usage.heapUsed || 0;
			const maxSize = max.usedJSHeapSize || max.heapUsed || 0;
			return currentSize > maxSize ? usage : max;
		});
		
		// Calculate average
		const average: any = {};
		const keys = Object.keys(usages[0]);
		keys.forEach(key => {
			average[key] = usages.reduce((sum, usage) => sum + (usage[key] || 0), 0) / usages.length;
		});
		
		// Determine trend
		let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
		if (this.memoryUsage.length >= 10) {
			const recent = this.memoryUsage.slice(-10);
			const firstHalf = recent.slice(0, 5);
			const secondHalf = recent.slice(-5);
			
			const firstAvg = firstHalf.reduce((sum, entry) => {
				const size = entry.usage.usedJSHeapSize || entry.usage.heapUsed || 0;
				return sum + size;
			}, 0) / 5;
			
			const secondAvg = secondHalf.reduce((sum, entry) => {
				const size = entry.usage.usedJSHeapSize || entry.usage.heapUsed || 0;
				return sum + size;
			}, 0) / 5;
			
			if (secondAvg > firstAvg * 1.05) trend = 'increasing';
			else if (secondAvg < firstAvg * 0.95) trend = 'decreasing';
		}
		
		return {
			current: latest.usage,
			peak,
			average,
			trend
		};
	}

	/**
	 * Starts periodic memory monitoring
	 * @param interval - Monitoring interval in milliseconds
	 */
	public startMonitoring(interval: number = 5000): void {
		setInterval(() => {
			this.recordMemoryUsage();
		}, interval);
	}
}

/**
 * Cache implementation with performance optimization
 */
export class PerformanceCache<K, V> {
	private cache = new Map<K, { value: V; timestamp: number; hits: number }>();
	private maxSize: number;
	private ttl: number;

	constructor(maxSize: number = 1000, ttl: number = 300000) { // 5 minutes default TTL
		this.maxSize = maxSize;
		this.ttl = ttl;
	}

	/**
	 * Gets a value from the cache
	 * @param key - The cache key
	 * @returns The cached value or undefined
	 */
	public get(key: K): V | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;
		
		// Check if expired
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return undefined;
		}
		
		// Update hits and move to end (LRU)
		entry.hits++;
		this.cache.delete(key);
		this.cache.set(key, entry);
		
		return entry.value;
	}

	/**
	 * Sets a value in the cache
	 * @param key - The cache key
	 * @param value - The value to cache
	 */
	public set(key: K, value: V): void {
		// Remove expired entries
		this.cleanup();
		
		// If at max size, remove least recently used
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}
		
		this.cache.set(key, {
			value,
			timestamp: Date.now(),
			hits: 0
		});
	}

	/**
	 * Checks if a key exists in the cache
	 * @param key - The cache key
	 * @returns True if key exists and not expired
	 */
	public has(key: K): boolean {
		return this.get(key) !== undefined;
	}

	/**
	 * Deletes a key from the cache
	 * @param key - The cache key
	 */
	public delete(key: K): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clears all cache entries
	 */
	public clear(): void {
		this.cache.clear();
	}

	/**
	 * Gets cache statistics
	 * @returns Cache statistics
	 */
	public getStats(): {
		size: number;
		hitRate: number;
		totalHits: number;
		averageAge: number;
	} {
		const now = Date.now();
		let totalHits = 0;
		let totalAge = 0;
		
		for (const entry of this.cache.values()) {
			totalHits += entry.hits;
			totalAge += now - entry.timestamp;
		}
		
		return {
			size: this.cache.size,
			hitRate: totalHits / Math.max(this.cache.size, 1),
			totalHits,
			averageAge: totalAge / Math.max(this.cache.size, 1)
		};
	}

	/**
	 * Removes expired entries from the cache
	 */
	private cleanup(): void {
		const now = Date.now();
		const expiredKeys: K[] = [];
		
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.ttl) {
				expiredKeys.push(key);
			}
		}
		
		expiredKeys.forEach(key => this.cache.delete(key));
	}
}

/**
 * Performance utility functions
 */
export class PerformanceUtils {
	/**
	 * Debounces a function call
	 * @param func - The function to debounce
	 * @param delay - The delay in milliseconds
	 * @returns Debounced function
	 */
	public static debounce<T extends (...args: any[]) => void>(
		func: T,
		delay: number
	): T {
		let timeoutId: any;
		return ((...args: Parameters<T>) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func(...args), delay);
		}) as T;
	}

	/**
	 * Throttles a function call
	 * @param func - The function to throttle
	 * @param delay - The delay in milliseconds
	 * @returns Throttled function
	 */
	public static throttle<T extends (...args: any[]) => void>(
		func: T,
		delay: number
	): T {
		let inThrottle: boolean;
		return ((...args: Parameters<T>) => {
			if (!inThrottle) {
				func(...args);
				inThrottle = true;
				setTimeout(() => inThrottle = false, delay);
			}
		}) as T;
	}

	/**
	 * Creates a memoized version of a function
	 * @param func - The function to memoize
	 * @param keyFunc - Function to generate cache keys
	 * @returns Memoized function
	 */
	public static memoize<T extends (...args: any[]) => any>(
		func: T,
		keyFunc?: (...args: Parameters<T>) => string
	): T {
		const cache = new Map<string, ReturnType<T>>();
		
		return ((...args: Parameters<T>) => {
			const key = keyFunc ? keyFunc(...args) : JSON.stringify(args);
			
			if (cache.has(key)) {
				return cache.get(key);
			}
			
			const result = func(...args);
			cache.set(key, result);
			return result;
		}) as T;
	}

	/**
	 * Batches function calls for performance
	 * @param func - The function to batch
	 * @param delay - The delay in milliseconds
	 * @returns Batched function
	 */
	public static batch<T>(
		func: (items: T[]) => void,
		delay: number = 100
	): (item: T) => void {
		let items: T[] = [];
		let timeoutId: any;
		
		return (item: T) => {
			items.push(item);
			
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				if (items.length > 0) {
					func([...items]);
					items = [];
				}
			}, delay);
		};
	}

	/**
	 * Measures frame rate
	 * @param callback - Callback with FPS measurement
	 * @param duration - Duration to measure in milliseconds
	 */
	public static measureFPS(callback: (fps: number) => void, duration: number = 1000): void {
		if (typeof requestAnimationFrame === 'undefined') {
			callback(0);
			return;
		}
		
		let frames = 0;
		let startTime = performance.now();
		
		function frame() {
			frames++;
			const now = performance.now();
			
			if (now - startTime >= duration) {
				const fps = Math.round((frames * 1000) / (now - startTime));
				callback(fps);
			} else {
				requestAnimationFrame(frame);
			}
		}
		
		requestAnimationFrame(frame);
	}
}

/**
 * Virtual scrolling implementation for large lists
 */
export class VirtualScroller {
	private itemHeight: number;
	private containerHeight: number;
	private scrollTop: number = 0;
	private totalItems: number = 0;
	private buffer: number = 5;

	constructor(itemHeight: number, containerHeight: number) {
		this.itemHeight = itemHeight;
		this.containerHeight = containerHeight;
	}

	/**
	 * Updates the scroll position
	 * @param scrollTop - The new scroll position
	 */
	public updateScrollTop(scrollTop: number): void {
		this.scrollTop = scrollTop;
	}

	/**
	 * Updates the total number of items
	 * @param totalItems - The total number of items
	 */
	public updateTotalItems(totalItems: number): void {
		this.totalItems = totalItems;
	}

	/**
	 * Gets the visible range of items
	 * @returns The start and end indices of visible items
	 */
	public getVisibleRange(): { start: number; end: number } {
		const visibleItems = Math.ceil(this.containerHeight / this.itemHeight);
		const start = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.buffer);
		const end = Math.min(this.totalItems, start + visibleItems + this.buffer * 2);
		
		return { start, end };
	}

	/**
	 * Gets the total height of all items
	 * @returns The total height in pixels
	 */
	public getTotalHeight(): number {
		return this.totalItems * this.itemHeight;
	}

	/**
	 * Gets the offset for the visible items
	 * @returns The offset in pixels
	 */
	public getOffset(): number {
		const { start } = this.getVisibleRange();
		return start * this.itemHeight;
	}
}