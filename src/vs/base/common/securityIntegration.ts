/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SecurityUtils } from './security.js';
import { ApplicationError } from './errorHandling.js';

/**
 * Security integration utilities for systematic security improvements
 */
export class SecurityIntegration {
	/**
	 * Securely sets innerHTML with sanitization
	 * @param element - The HTML element to set innerHTML on
	 * @param content - The content to set
	 * @param allowBasicHtml - Whether to allow basic HTML tags
	 */
	public static setInnerHtml(element: HTMLElement, content: string, allowBasicHtml: boolean = false): void {
		if (!element) {
			throw new ApplicationError('Element is required for secure innerHTML operation', 'INVALID_ELEMENT', 400);
		}

		let sanitizedContent: string;
		if (allowBasicHtml) {
			// Allow basic HTML tags like <b>, <i>, <strong>, <em>, <p>, <br>
			sanitizedContent = SecurityUtils.sanitizeHtml(content);
		} else {
			// Strip all HTML
			sanitizedContent = SecurityUtils.sanitizeInput(content);
		}

		element.innerHTML = sanitizedContent;
	}

	/**
	 * Securely creates a DOM element with sanitized content
	 * @param tagName - The tag name to create
	 * @param content - The content to set
	 * @param allowBasicHtml - Whether to allow basic HTML tags
	 * @returns The created and sanitized element
	 */
	public static createSecureElement(tagName: string, content: string, allowBasicHtml: boolean = false): HTMLElement {
		const element = document.createElement(tagName);
		this.setInnerHtml(element, content, allowBasicHtml);
		return element;
	}

	/**
	 * Validates and sanitizes a URL before use
	 * @param url - The URL to validate
	 * @param allowedDomains - Optional list of allowed domains
	 * @returns Sanitized URL or null if invalid
	 */
	public static validateAndSanitizeUrl(url: string, allowedDomains?: string[]): string | null {
		if (!SecurityUtils.validateUrl(url)) {
			return null;
		}

		if (allowedDomains && allowedDomains.length > 0) {
			try {
				const urlObj = new URL(url);
				const domain = urlObj.hostname.toLowerCase();
				if (!allowedDomains.some(allowed => domain === allowed || domain.endsWith('.' + allowed))) {
					return null;
				}
			} catch {
				return null;
			}
		}

		return url;
	}

	/**
	 * Securely loads external content with validation
	 * @param url - The URL to load from
	 * @param allowedDomains - Optional list of allowed domains
	 * @returns Promise that resolves to the content or rejects if invalid
	 */
	public static async loadSecureContent(url: string, allowedDomains?: string[]): Promise<string> {
		const sanitizedUrl = this.validateAndSanitizeUrl(url, allowedDomains);
		if (!sanitizedUrl) {
			throw new ApplicationError(`Invalid or unsafe URL: ${url}`, 'UNSAFE_URL', 400);
		}

		try {
			const response = await fetch(sanitizedUrl);
			if (!response.ok) {
				throw new ApplicationError(`Failed to load content from ${sanitizedUrl}`, 'LOAD_FAILED', response.status);
			}
			return await response.text();
		} catch (error) {
			if (error instanceof ApplicationError) {
				throw error;
			}
			throw new ApplicationError(`Network error loading content from ${sanitizedUrl}`, 'NETWORK_ERROR', 500, true, error);
		}
	}

	/**
	 * Creates a secure script element with CSP compliance
	 * @param src - The source URL of the script
	 * @param allowedDomains - Optional list of allowed domains
	 * @returns The created script element
	 */
	public static createSecureScript(src: string, allowedDomains?: string[]): HTMLScriptElement {
		const sanitizedSrc = this.validateAndSanitizeUrl(src, allowedDomains);
		if (!sanitizedSrc) {
			throw new ApplicationError(`Invalid or unsafe script URL: ${src}`, 'UNSAFE_SCRIPT_URL', 400);
		}

		const script = document.createElement('script');
		script.src = sanitizedSrc;
		script.type = 'text/javascript';
		
		// Add security attributes
		script.setAttribute('crossorigin', 'anonymous');
		script.setAttribute('integrity', ''); // Should be populated with actual hash
		
		return script;
	}

	/**
	 * Validates file path for security
	 * @param filePath - The file path to validate
	 * @param allowedExtensions - Optional list of allowed file extensions
	 * @returns true if path is secure, false otherwise
	 */
	public static validateSecureFilePath(filePath: string, allowedExtensions?: string[]): boolean {
		if (!SecurityUtils.validateFilePath(filePath)) {
			return false;
		}

		if (allowedExtensions && allowedExtensions.length > 0) {
			const extension = filePath.split('.').pop()?.toLowerCase();
			if (!extension || !allowedExtensions.includes(extension)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Sanitizes user input for storage or display
	 * @param input - The input to sanitize
	 * @param maxLength - Maximum allowed length
	 * @returns Sanitized input
	 */
	public static sanitizeUserInput(input: string, maxLength: number = 1000): string {
		if (!input) return '';
		
		let sanitized = SecurityUtils.sanitizeInput(input);
		
		// Trim to max length
		if (sanitized.length > maxLength) {
			sanitized = sanitized.substring(0, maxLength);
		}
		
		return sanitized;
	}

	/**
	 * Creates a secure configuration object with validation
	 * @param config - The configuration object to validate
	 * @param allowedKeys - List of allowed configuration keys
	 * @returns Validated configuration object
	 */
	public static validateSecureConfig(config: any, allowedKeys: string[]): any {
		if (!config || typeof config !== 'object') {
			throw new ApplicationError('Invalid configuration object', 'INVALID_CONFIG', 400);
		}

		const validatedConfig: any = {};
		
		for (const key of allowedKeys) {
			if (key in config) {
				const value = config[key];
				
				// Sanitize string values
				if (typeof value === 'string') {
					validatedConfig[key] = this.sanitizeUserInput(value);
				} else if (typeof value === 'boolean' || typeof value === 'number') {
					validatedConfig[key] = value;
				} else if (Array.isArray(value)) {
					validatedConfig[key] = value.map(item => 
						typeof item === 'string' ? this.sanitizeUserInput(item) : item
					);
				} else {
					// For complex objects, recursively validate if needed
					validatedConfig[key] = value;
				}
			}
		}

		return validatedConfig;
	}
}