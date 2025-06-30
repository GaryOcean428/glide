/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Comprehensive sanitization utilities for user input and agent output
 * Prevents XSS, injection attacks, and other security vulnerabilities
 */

/**
 * HTML entity mappings for sanitization
 */
const HTML_ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#x27;',
	'/': '&#x2F;'
};

/**
 * Sanitizes HTML content by encoding dangerous characters
 */
export function sanitizeHtml(input: string): string {
	if (typeof input !== 'string') {
		return '';
	}

	return input.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitizes user input for safe processing
 * Removes control characters and encodes HTML entities
 */
export function sanitizeInput(input: string): string {
	if (typeof input !== 'string') {
		return '';
	}

	return input
		// Remove control characters (except newlines and tabs)
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
		// Encode HTML entities
		.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char)
		// Normalize whitespace
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Sanitizes URLs to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
	if (typeof url !== 'string') {
		return '';
	}

	const trimmedUrl = url.trim().toLowerCase();
	
	// Block dangerous protocols
	const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
	if (dangerousProtocols.some(protocol => trimmedUrl.startsWith(protocol))) {
		return '';
	}

	// Only allow http, https, and relative URLs
	if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('/')) {
		return url.trim();
	}

	// If no protocol, assume relative
	if (!trimmedUrl.includes('://')) {
		return url.trim();
	}

	return '';
}

/**
 * Sanitizes file paths to prevent directory traversal
 */
export function sanitizeFilePath(path: string): string {
	if (typeof path !== 'string') {
		return '';
	}

	return path
		// Remove null bytes
		.replace(/\0/g, '')
		// Normalize path separators
		.replace(/\\/g, '/')
		// Remove relative path components
		.replace(/\.\.+/g, '')
		// Remove leading/trailing whitespace and slashes
		.replace(/^[\/\s]+|[\/\s]+$/g, '')
		// Encode dangerous characters
		.replace(/[<>:"|?*]/g, '_');
}

/**
 * Sanitizes JSON data recursively
 */
export function sanitizeJson(data: any, maxDepth: number = 10): any {
	if (maxDepth <= 0) {
		return '[Max depth reached]';
	}

	if (data === null || data === undefined) {
		return data;
	}

	if (typeof data === 'string') {
		return sanitizeInput(data);
	}

	if (typeof data === 'number' || typeof data === 'boolean') {
		return data;
	}

	if (Array.isArray(data)) {
		return data.map(item => sanitizeJson(item, maxDepth - 1));
	}

	if (typeof data === 'object') {
		const sanitized: Record<string, any> = {};
		for (const [key, value] of Object.entries(data)) {
			const sanitizedKey = sanitizeInput(key);
			if (sanitizedKey) {
				sanitized[sanitizedKey] = sanitizeJson(value, maxDepth - 1);
			}
		}
		return sanitized;
	}

	return String(data);
}

/**
 * Validates and sanitizes configuration objects
 */
export function sanitizeConfig(config: Record<string, any>): Record<string, any> {
	const sanitized: Record<string, any> = {};

	for (const [key, value] of Object.entries(config)) {
		const sanitizedKey = sanitizeInput(key);
		if (!sanitizedKey) continue;

		if (typeof value === 'string') {
			// Special handling for URLs
			if (key.toLowerCase().includes('endpoint') || key.toLowerCase().includes('url')) {
				sanitized[sanitizedKey] = sanitizeUrl(value);
			} else if (key.toLowerCase().includes('path')) {
				sanitized[sanitizedKey] = sanitizeFilePath(value);
			} else {
				sanitized[sanitizedKey] = sanitizeInput(value);
			}
		} else if (typeof value === 'number') {
			// Ensure numbers are finite and within reasonable bounds
			if (Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER) {
				sanitized[sanitizedKey] = value;
			}
		} else if (typeof value === 'boolean') {
			sanitized[sanitizedKey] = value;
		} else if (value && typeof value === 'object') {
			sanitized[sanitizedKey] = sanitizeConfig(value);
		}
	}

	return sanitized;
}

/**
 * Truncates text to a maximum length while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number = 1000): string {
	if (typeof text !== 'string') {
		return '';
	}

	if (text.length <= maxLength) {
		return text;
	}

	// Find the last space before the limit
	const truncated = text.substring(0, maxLength);
	const lastSpace = truncated.lastIndexOf(' ');
	
	if (lastSpace > maxLength * 0.8) {
		return truncated.substring(0, lastSpace) + '...';
	}

	return truncated + '...';
}

/**
 * Validates that a string contains only allowed characters
 */
export function validateAllowedChars(input: string, allowedPattern: RegExp = /^[a-zA-Z0-9\s\-_.@]+$/): boolean {
	if (typeof input !== 'string') {
		return false;
	}

	return allowedPattern.test(input);
}

/**
 * Sanitizes and validates email addresses
 */
export function sanitizeEmail(email: string): string {
	if (typeof email !== 'string') {
		return '';
	}

	const sanitized = email.trim().toLowerCase();
	
	// Basic email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(sanitized)) {
		return '';
	}

	return sanitized;
}

/**
 * Complete sanitization suite for agent interactions
 */
export const sanitize = {
	html: sanitizeHtml,
	input: sanitizeInput,
	url: sanitizeUrl,
	filePath: sanitizeFilePath,
	json: sanitizeJson,
	config: sanitizeConfig,
	truncate: truncateText,
	email: sanitizeEmail,
	validate: validateAllowedChars
};

/**
 * Default export for convenience
 */
export default sanitize;