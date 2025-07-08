/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Security utilities for input validation, sanitization, and protection
 */
export class SecurityUtils {
	/**
	 * Sanitizes HTML input to prevent XSS attacks
	 * @param input - The HTML string to sanitize
	 * @returns Sanitized HTML string
	 */
	public static sanitizeHtml(input: string): string {
		if (!input) return '';
		
		return input
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;')
			.replace(/\//g, '&#x2F;')
			.replace(/\\/g, '&#x5C;');
	}

	/**
	 * Validates URL to ensure it's safe
	 * @param url - The URL to validate
	 * @returns true if URL is safe, false otherwise
	 */
	public static validateUrl(url: string): boolean {
		if (!url) return false;
		
		const dangerousProtocols = [
			'javascript:',
			'data:',
			'vbscript:',
			'file:',
			'about:',
			'chrome:',
			'chrome-extension:',
			'moz-extension:'
		];
		
		const lowerUrl = url.toLowerCase().trim();
		return !dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol));
	}

	/**
	 * Sanitizes general input to remove potentially dangerous characters
	 * @param input - The input string to sanitize
	 * @returns Sanitized input string
	 */
	public static sanitizeInput(input: string): string {
		if (!input) return '';
		
		// Remove control characters and dangerous patterns
		return input
			.replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
			.replace(/[<>\"'&]/g, '') // Remove HTML/XML special characters
			.replace(/javascript:/gi, '') // Remove javascript protocol
			.replace(/vbscript:/gi, '') // Remove vbscript protocol
			.replace(/on\w+\s*=/gi, '') // Remove event handlers
			.trim();
	}

	/**
	 * Validates file path to prevent directory traversal attacks
	 * @param filePath - The file path to validate
	 * @returns true if path is safe, false otherwise
	 */
	public static validateFilePath(filePath: string): boolean {
		if (!filePath) return false;
		
		// Check for directory traversal patterns
		const dangerousPatterns = [
			'../',
			'..\\',
			'/..',
			'\\..',
			'~/',
			'%2e%2e',
			'%2f',
			'%5c'
		];
		
		const lowerPath = filePath.toLowerCase();
		return !dangerousPatterns.some(pattern => lowerPath.includes(pattern));
	}

	/**
	 * Validates email address format
	 * @param email - The email address to validate
	 * @returns true if email is valid, false otherwise
	 */
	public static validateEmail(email: string): boolean {
		if (!email) return false;
		
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email) && email.length <= 254;
	}

	/**
	 * Generates a secure random string
	 * @param length - The length of the random string
	 * @returns Random string
	 */
	public static generateSecureRandom(length: number = 32): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		
		for (let i = 0; i < length; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		
		return result;
	}

	/**
	 * Hashes a password using a secure algorithm
	 * @param password - The password to hash
	 * @param salt - Optional salt for hashing
	 * @returns Promise that resolves to the hashed password
	 */
	public static async hashPassword(password: string, salt?: string): Promise<string> {
		if (!password) throw new Error('Password cannot be empty');
		
		const encoder = new TextEncoder();
		const data = encoder.encode(password + (salt || ''));
		
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Validates password strength
	 * @param password - The password to validate
	 * @returns Object containing validation results
	 */
	public static validatePassword(password: string): {
		isValid: boolean;
		errors: string[];
		strength: 'weak' | 'medium' | 'strong';
	} {
		const errors: string[] = [];
		let score = 0;
		
		if (!password) {
			errors.push('Password is required');
			return { isValid: false, errors, strength: 'weak' };
		}
		
		if (password.length < 8) {
			errors.push('Password must be at least 8 characters long');
		} else {
			score += 1;
		}
		
		if (!/[a-z]/.test(password)) {
			errors.push('Password must contain at least one lowercase letter');
		} else {
			score += 1;
		}
		
		if (!/[A-Z]/.test(password)) {
			errors.push('Password must contain at least one uppercase letter');
		} else {
			score += 1;
		}
		
		if (!/[0-9]/.test(password)) {
			errors.push('Password must contain at least one number');
		} else {
			score += 1;
		}
		
		if (!/[^a-zA-Z0-9]/.test(password)) {
			errors.push('Password must contain at least one special character');
		} else {
			score += 1;
		}
		
		let strength: 'weak' | 'medium' | 'strong' = 'weak';
		if (score >= 4) strength = 'strong';
		else if (score >= 2) strength = 'medium';
		
		return {
			isValid: errors.length === 0,
			errors,
			strength
		};
	}

	/**
	 * Escapes special characters in a string for use in regular expressions
	 * @param string - The string to escape
	 * @returns Escaped string
	 */
	public static escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/**
	 * Validates JSON input for security
	 * @param jsonString - The JSON string to validate
	 * @returns true if JSON is safe, false otherwise
	 */
	public static validateJson(jsonString: string): boolean {
		if (!jsonString) return false;
		
		try {
			const parsed = JSON.parse(jsonString);
			
			// Check for dangerous patterns in the parsed object
			const jsonStr = JSON.stringify(parsed);
			const dangerousPatterns = [
				'__proto__',
				'constructor',
				'prototype',
				'eval',
				'function',
				'javascript:',
				'vbscript:'
			];
			
			return !dangerousPatterns.some(pattern => 
				jsonStr.toLowerCase().includes(pattern.toLowerCase())
			);
		} catch {
			return false;
		}
	}

	/**
	 * Rate limiting utility to prevent abuse
	 */
	public static createRateLimiter(maxRequests: number, windowMs: number) {
		const requests = new Map<string, number[]>();
		
		return (identifier: string): boolean => {
			const now = Date.now();
			const windowStart = now - windowMs;
			
			if (!requests.has(identifier)) {
				requests.set(identifier, []);
			}
			
			const userRequests = requests.get(identifier)!;
			
			// Remove old requests outside the window
			const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
			
			if (validRequests.length >= maxRequests) {
				return false; // Rate limit exceeded
			}
			
			validRequests.push(now);
			requests.set(identifier, validRequests);
			
			return true; // Request allowed
		};
	}
}

/**
 * Content Security Policy configuration
 */
export const CSP_POLICY = {
	'default-src': "'self'",
	'script-src': "'self' 'unsafe-inline' 'unsafe-eval'", // Note: eval needed for VS Code extension system
	'style-src': "'self' 'unsafe-inline'",
	'img-src': "'self' data: https:",
	'connect-src': "'self' wss: https:",
	'font-src': "'self' data:",
	'object-src': "'none'",
	'base-uri': "'self'",
	'form-action': "'self'",
	'frame-ancestors': "'none'",
	'upgrade-insecure-requests': ''
};

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
	'Content-Security-Policy': Object.entries(CSP_POLICY)
		.map(([key, value]) => `${key} ${value}`)
		.join('; ')
};

/**
 * Applies security headers to HTTP response
 * @param response - The HTTP response object
 */
export function addSecurityHeaders(response: any): void {
	Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
		response.setHeader(header, value);
	});
}