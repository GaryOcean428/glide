/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Test suite for sanitization utilities
 * Comprehensive tests for security and data validation
 */

import { sanitize } from '../../utils/sanitize';

describe('Sanitization Utilities', () => {
	describe('sanitize.html', () => {
		it('should escape HTML entities', () => {
			const input = '<script>alert("xss")</script>';
			const result = sanitize.html(input);
			expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
		});

		it('should handle empty and null inputs', () => {
			expect(sanitize.html('')).toBe('');
			expect(sanitize.html(null as any)).toBe('');
			expect(sanitize.html(undefined as any)).toBe('');
		});

		it('should preserve safe content', () => {
			const input = 'Hello World! This is safe content.';
			expect(sanitize.html(input)).toBe(input);
		});
	});

	describe('sanitize.input', () => {
		it('should sanitize user input safely', () => {
			const input = '<script>alert("test")</script>';
			const result = sanitize.input(input);
			expect(result).not.toContain('<script>');
			expect(result).toContain('&lt;script&gt;');
		});

		it('should handle special characters', () => {
			const input = 'Test & "quotes" and \'apostrophes\'';
			const result = sanitize.input(input);
			expect(result).toContain('&amp;');
			expect(result).toContain('&quot;');
			expect(result).toContain('&#x27;');
		});
	});

	describe('sanitize.url', () => {
		it('should block dangerous protocols', () => {
			expect(sanitize.url('javascript:alert(1)')).toBe('');
			expect(sanitize.url('data:text/html,<script>alert(1)</script>')).toBe('');
			expect(sanitize.url('vbscript:msgbox(1)')).toBe('');
		});

		it('should allow safe URLs', () => {
			const httpUrl = 'http://example.com';
			const httpsUrl = 'https://example.com';
			
			expect(sanitize.url(httpUrl)).toBe(httpUrl);
			expect(sanitize.url(httpsUrl)).toBe(httpsUrl);
		});

		it('should handle relative URLs', () => {
			const relativeUrl = '/path/to/resource';
			expect(sanitize.url(relativeUrl)).toBe(relativeUrl);
		});
	});

	describe('sanitize.code', () => {
		it('should preserve code formatting while escaping HTML', () => {
			const code = 'function test() {\n  return "<div>Hello</div>";\n}';
			const result = sanitize.code(code);
			expect(result).toContain('&lt;div&gt;');
			expect(result).toContain('&quot;');
			expect(result).toContain('\n'); // Preserve newlines
		});
	});

	describe('sanitize.json', () => {
		it('should recursively sanitize object properties', () => {
			const input = {
				name: '<script>alert("xss")</script>',
				nested: {
					value: 'safe value',
					dangerous: '<img src=x onerror=alert(1)>'
				}
			};
			
			const result = sanitize.json(input);
			expect(result.name).toContain('&lt;script&gt;');
			expect(result.nested.dangerous).toContain('&lt;img');
			expect(result.nested.value).toBe('safe value');
		});

		it('should handle arrays', () => {
			const input = ['<script>', 'safe', '<iframe>'];
			const result = sanitize.json(input);
			expect(result[0]).toContain('&lt;script&gt;');
			expect(result[1]).toBe('safe');
			expect(result[2]).toContain('&lt;iframe&gt;');
		});
	});
});

describe('Validation Utilities', () => {
	describe('email validation', () => {
		it('should validate correct email addresses', () => {
			expect(sanitize.validate('user@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)).toBe(true);
			expect(sanitize.validate('test.email+tag@domain.co.uk', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)).toBe(true);
		});

		it('should reject invalid email addresses', () => {
			const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			expect(sanitize.validate('invalid-email', emailPattern)).toBe(false);
			expect(sanitize.validate('user@', emailPattern)).toBe(false);
			expect(sanitize.validate('@domain.com', emailPattern)).toBe(false);
			expect(sanitize.validate('', emailPattern)).toBe(false);
		});
	});

	describe('pattern validation', () => {
		it('should validate against regex patterns', () => {
			const alphanumeric = /^[a-zA-Z0-9]+$/;
			expect(sanitize.validate('abc123', alphanumeric)).toBe(true);
			expect(sanitize.validate('test@#$', alphanumeric)).toBe(false);
		});
	});
});

// Mock data for testing
export const mockConversation = {
	id: '1',
	request: 'Create a function to sort an array',
	response: 'Here is a sorting function:\n\n```javascript\nfunction sortArray(arr) {\n  return arr.sort((a, b) => a - b);\n}\n```',
	success: true,
	timestamp: '12:00:00 PM',
	metadata: {
		model: 'gpt-4',
		tokensUsed: 150,
		processingTime: 1200
	}
};

export const mockVSCodeContext = {
	currentFile: '/path/to/file.js',
	language: 'javascript',
	workspaceRoot: '/path/to/workspace',
	selectedText: 'console.log("test");',
	lineNumber: 10,
	column: 5
};

export const mockAgentConfig = {
	agentEndpoint: 'https://api.example.com/agent',
	requestTimeout: 30000
};