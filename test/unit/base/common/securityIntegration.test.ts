/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SecurityIntegration } from '../../../src/vs/base/common/securityIntegration.js';
import { StructuredLogger, LogLevel } from '../../../src/vs/base/common/structuredLogging.js';
import { strict as assert } from 'assert';

suite('SecurityIntegration', () => {
	let mockElement: HTMLElement;
	let logger: StructuredLogger;

	setup(() => {
		// Create a mock HTML element for testing
		mockElement = {
			innerHTML: '',
			tagName: 'DIV'
		} as HTMLElement;
		
		// Initialize logger for testing
		logger = new StructuredLogger({ 
			enableConsoleOutput: false,
			minLevel: LogLevel.DEBUG
		});
	});

	teardown(() => {
		logger.clearLogs();
	});

	suite('setInnerHtml', () => {
		test('should sanitize malicious script tags', () => {
			const maliciousContent = '<script>alert("xss")</script>Hello World';
			SecurityIntegration.setInnerHtml(mockElement, maliciousContent);
			
			// Should not contain script tags
			assert.ok(!mockElement.innerHTML.includes('<script>'));
			assert.ok(!mockElement.innerHTML.includes('alert'));
			assert.ok(mockElement.innerHTML.includes('Hello World'));
		});

		test('should allow basic HTML when enabled', () => {
			const basicHtml = '<b>Bold</b> and <i>italic</i> text';
			SecurityIntegration.setInnerHtml(mockElement, basicHtml, true);
			
			// Should contain sanitized HTML
			assert.ok(mockElement.innerHTML.includes('Bold'));
			assert.ok(mockElement.innerHTML.includes('italic'));
		});

		test('should strip all HTML when basic HTML is disabled', () => {
			const basicHtml = '<b>Bold</b> and <i>italic</i> text';
			SecurityIntegration.setInnerHtml(mockElement, basicHtml, false);
			
			// Should not contain HTML tags
			assert.ok(!mockElement.innerHTML.includes('<b>'));
			assert.ok(!mockElement.innerHTML.includes('<i>'));
			assert.ok(mockElement.innerHTML.includes('Bold'));
			assert.ok(mockElement.innerHTML.includes('italic'));
		});

		test('should throw error for null element', () => {
			assert.throws(() => {
				SecurityIntegration.setInnerHtml(null as any, 'content');
			}, /Element is required/);
		});
	});

	suite('validateAndSanitizeUrl', () => {
		test('should reject javascript: URLs', () => {
			const result = SecurityIntegration.validateAndSanitizeUrl('javascript:alert("xss")');
			assert.strictEqual(result, null);
		});

		test('should reject data: URLs', () => {
			const result = SecurityIntegration.validateAndSanitizeUrl('data:text/html,<script>alert("xss")</script>');
			assert.strictEqual(result, null);
		});

		test('should accept valid HTTPS URLs', () => {
			const validUrl = 'https://example.com/path';
			const result = SecurityIntegration.validateAndSanitizeUrl(validUrl);
			assert.strictEqual(result, validUrl);
		});

		test('should validate against allowed domains', () => {
			const url = 'https://example.com/path';
			const allowedDomains = ['example.com', 'trusted.com'];
			const result = SecurityIntegration.validateAndSanitizeUrl(url, allowedDomains);
			assert.strictEqual(result, url);
		});

		test('should reject URLs from disallowed domains', () => {
			const url = 'https://malicious.com/path';
			const allowedDomains = ['example.com', 'trusted.com'];
			const result = SecurityIntegration.validateAndSanitizeUrl(url, allowedDomains);
			assert.strictEqual(result, null);
		});

		test('should handle malformed URLs gracefully', () => {
			const result = SecurityIntegration.validateAndSanitizeUrl('not-a-url');
			assert.strictEqual(result, null);
		});
	});

	suite('validateSecureFilePath', () => {
		test('should reject paths with directory traversal', () => {
			const maliciousPath = '../../../etc/passwd';
			const result = SecurityIntegration.validateSecureFilePath(maliciousPath);
			assert.strictEqual(result, false);
		});

		test('should reject paths with backslash traversal', () => {
			const maliciousPath = '..\\..\\windows\\system32\\config\\sam';
			const result = SecurityIntegration.validateSecureFilePath(maliciousPath);
			assert.strictEqual(result, false);
		});

		test('should accept safe relative paths', () => {
			const safePath = 'documents/file.txt';
			const result = SecurityIntegration.validateSecureFilePath(safePath);
			assert.strictEqual(result, true);
		});

		test('should validate file extensions when specified', () => {
			const allowedExtensions = ['txt', 'md', 'json'];
			
			assert.strictEqual(
				SecurityIntegration.validateSecureFilePath('file.txt', allowedExtensions),
				true
			);
			assert.strictEqual(
				SecurityIntegration.validateSecureFilePath('file.exe', allowedExtensions),
				false
			);
		});

		test('should handle files without extensions', () => {
			const allowedExtensions = ['txt', 'md'];
			const result = SecurityIntegration.validateSecureFilePath('README', allowedExtensions);
			assert.strictEqual(result, false);
		});
	});

	suite('sanitizeUserInput', () => {
		test('should remove script tags from user input', () => {
			const maliciousInput = '<script>alert("xss")</script>Hello';
			const result = SecurityIntegration.sanitizeUserInput(maliciousInput);
			
			assert.ok(!result.includes('<script>'));
			assert.ok(!result.includes('alert'));
			assert.ok(result.includes('Hello'));
		});

		test('should enforce maximum length limits', () => {
			const longInput = 'a'.repeat(2000);
			const result = SecurityIntegration.sanitizeUserInput(longInput, 100);
			
			assert.strictEqual(result.length, 100);
		});

		test('should handle empty and null inputs', () => {
			assert.strictEqual(SecurityIntegration.sanitizeUserInput(''), '');
			assert.strictEqual(SecurityIntegration.sanitizeUserInput(null as any), '');
		});

		test('should remove event handlers from input', () => {
			const maliciousInput = '<div onclick="alert(1)">Content</div>';
			const result = SecurityIntegration.sanitizeUserInput(maliciousInput);
			
			assert.ok(!result.includes('onclick'));
			assert.ok(!result.includes('alert'));
		});
	});

	suite('validateSecureConfig', () => {
		test('should validate configuration against allowed keys', () => {
			const config = {
				name: 'Test',
				description: 'A test configuration',
				maliciousScript: '<script>alert("xss")</script>',
				enabled: true,
				count: 42
			};
			
			const allowedKeys = ['name', 'description', 'enabled', 'count'];
			const result = SecurityIntegration.validateSecureConfig(config, allowedKeys);
			
			assert.strictEqual(result.name, 'Test');
			assert.strictEqual(result.description, 'A test configuration');
			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.count, 42);
			assert.ok(!('maliciousScript' in result));
		});

		test('should sanitize string values in configuration', () => {
			const config = {
				name: '<script>alert("xss")</script>TestName',
				description: 'Clean description'
			};
			
			const allowedKeys = ['name', 'description'];
			const result = SecurityIntegration.validateSecureConfig(config, allowedKeys);
			
			assert.ok(!result.name.includes('<script>'));
			assert.ok(result.name.includes('TestName'));
			assert.strictEqual(result.description, 'Clean description');
		});

		test('should handle array values in configuration', () => {
			const config = {
				tags: ['tag1', '<script>alert("xss")</script>', 'tag2'],
				values: [1, 2, 3]
			};
			
			const allowedKeys = ['tags', 'values'];
			const result = SecurityIntegration.validateSecureConfig(config, allowedKeys);
			
			assert.strictEqual(result.tags.length, 3);
			assert.ok(!result.tags[1].includes('<script>'));
			assert.deepStrictEqual(result.values, [1, 2, 3]);
		});

		test('should throw error for invalid configuration objects', () => {
			assert.throws(() => {
				SecurityIntegration.validateSecureConfig(null, ['key']);
			}, /Invalid configuration object/);
			
			assert.throws(() => {
				SecurityIntegration.validateSecureConfig('not an object', ['key']);
			}, /Invalid configuration object/);
		});
	});

	suite('createSecureElement', () => {
		test('should create element with sanitized content', () => {
			const element = SecurityIntegration.createSecureElement('div', '<script>alert("xss")</script>Hello');
			
			assert.strictEqual(element.tagName.toLowerCase(), 'div');
			assert.ok(!element.innerHTML.includes('<script>'));
			assert.ok(element.innerHTML.includes('Hello'));
		});

		test('should allow basic HTML when specified', () => {
			const element = SecurityIntegration.createSecureElement('span', '<b>Bold</b> text', true);
			
			assert.strictEqual(element.tagName.toLowerCase(), 'span');
			assert.ok(element.innerHTML.includes('Bold'));
		});
	});

	suite('Integration with StructuredLogger', () => {
		test('should log security violations', () => {
			logger.warn('Security violation detected', { 
				type: 'XSS_ATTEMPT',
				input: '<script>alert("xss")</script>',
				source: 'user_input'
			});
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].level, LogLevel.WARN);
			assert.ok(logs[0].message.includes('Security violation'));
		});
	});
});