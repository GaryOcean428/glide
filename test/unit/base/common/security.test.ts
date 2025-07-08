/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SecurityUtils } from '../../../../src/vs/base/common/security.js';

suite('SecurityUtils', () => {
	suite('sanitizeHtml', () => {
		test('should sanitize HTML special characters', () => {
			const input = '<script>alert("xss")</script>';
			const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
			const result = SecurityUtils.sanitizeHtml(input);
			assert.strictEqual(result, expected);
		});

		test('should handle empty input', () => {
			const result = SecurityUtils.sanitizeHtml('');
			assert.strictEqual(result, '');
		});

		test('should sanitize all dangerous characters', () => {
			const input = '&<>"\'\\';
			const expected = '&amp;&lt;&gt;&quot;&#x27;&#x5C;';
			const result = SecurityUtils.sanitizeHtml(input);
			assert.strictEqual(result, expected);
		});
	});

	suite('validateUrl', () => {
		test('should allow safe URLs', () => {
			const safeUrls = [
				'https://example.com',
				'http://localhost:3000',
				'/relative/path',
				'./relative/path',
				'#anchor'
			];

			safeUrls.forEach(url => {
				assert.strictEqual(SecurityUtils.validateUrl(url), true, `URL should be safe: ${url}`);
			});
		});

		test('should reject dangerous URLs', () => {
			const dangerousUrls = [
				'javascript:alert("xss")',
				'data:text/html,<script>alert("xss")</script>',
				'vbscript:msgbox("xss")',
				'file:///etc/passwd',
				'javascript:void(0)'
			];

			dangerousUrls.forEach(url => {
				assert.strictEqual(SecurityUtils.validateUrl(url), false, `URL should be dangerous: ${url}`);
			});
		});

		test('should handle empty or null URLs', () => {
			assert.strictEqual(SecurityUtils.validateUrl(''), false);
			assert.strictEqual(SecurityUtils.validateUrl(null as any), false);
			assert.strictEqual(SecurityUtils.validateUrl(undefined as any), false);
		});
	});

	suite('validateFilePath', () => {
		test('should allow safe file paths', () => {
			const safePaths = [
				'file.txt',
				'folder/file.txt',
				'./file.txt',
				'src/vs/base/common/security.ts'
			];

			safePaths.forEach(path => {
				assert.strictEqual(SecurityUtils.validateFilePath(path), true, `Path should be safe: ${path}`);
			});
		});

		test('should reject directory traversal attempts', () => {
			const dangerousPaths = [
				'../../../etc/passwd',
				'..\\..\\windows\\system32',
				'/../../secret.txt',
				'file/../../../etc/passwd',
				'~/secret.txt'
			];

			dangerousPaths.forEach(path => {
				assert.strictEqual(SecurityUtils.validateFilePath(path), false, `Path should be dangerous: ${path}`);
			});
		});
	});

	suite('validateEmail', () => {
		test('should validate correct email addresses', () => {
			const validEmails = [
				'user@example.com',
				'test.email@domain.co.uk',
				'user+tag@example.org'
			];

			validEmails.forEach(email => {
				assert.strictEqual(SecurityUtils.validateEmail(email), true, `Email should be valid: ${email}`);
			});
		});

		test('should reject invalid email addresses', () => {
			const invalidEmails = [
				'invalid.email',
				'@example.com',
				'user@',
				'user name@example.com'
			];

			invalidEmails.forEach(email => {
				assert.strictEqual(SecurityUtils.validateEmail(email), false, `Email should be invalid: ${email}`);
			});
		});
	});

	suite('validatePassword', () => {
		test('should validate strong passwords', () => {
			const strongPassword = 'StrongP@ssw0rd123';
			const result = SecurityUtils.validatePassword(strongPassword);
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.strength, 'strong');
			assert.strictEqual(result.errors.length, 0);
		});

		test('should identify weak passwords', () => {
			const weakPassword = 'weak';
			const result = SecurityUtils.validatePassword(weakPassword);
			
			assert.strictEqual(result.isValid, false);
			assert.strictEqual(result.strength, 'weak');
			assert.ok(result.errors.length > 0);
		});

		test('should require all password criteria', () => {
			const testCases = [
				{ password: 'lowercase', missing: 'uppercase, number, special character' },
				{ password: 'UPPERCASE', missing: 'lowercase, number, special character' },
				{ password: 'NoNumbers!', missing: 'number' },
				{ password: 'NoSpecialChars123', missing: 'special character' }
			];

			testCases.forEach(({ password }) => {
				const result = SecurityUtils.validatePassword(password);
				assert.strictEqual(result.isValid, false, `Password should be invalid: ${password}`);
			});
		});
	});

	suite('validateJson', () => {
		test('should validate safe JSON', () => {
			const safeJson = '{"name": "test", "value": 123}';
			assert.strictEqual(SecurityUtils.validateJson(safeJson), true);
		});

		test('should reject dangerous JSON patterns', () => {
			const dangerousJsons = [
				'{"__proto__": {"polluted": true}}',
				'{"constructor": {"prototype": {"polluted": true}}}',
				'{"eval": "alert(\\"xss\\")"}',
				'invalid json'
			];

			dangerousJsons.forEach(json => {
				assert.strictEqual(SecurityUtils.validateJson(json), false, `JSON should be dangerous: ${json}`);
			});
		});
	});

	suite('createRateLimiter', () => {
		test('should allow requests within limit', () => {
			const rateLimiter = SecurityUtils.createRateLimiter(3, 1000); // 3 requests per second
			
			assert.strictEqual(rateLimiter('user1'), true);
			assert.strictEqual(rateLimiter('user1'), true);
			assert.strictEqual(rateLimiter('user1'), true);
		});

		test('should block requests exceeding limit', () => {
			const rateLimiter = SecurityUtils.createRateLimiter(2, 1000); // 2 requests per second
			
			assert.strictEqual(rateLimiter('user2'), true);
			assert.strictEqual(rateLimiter('user2'), true);
			assert.strictEqual(rateLimiter('user2'), false); // Should be blocked
		});

		test('should allow requests after window expires', async () => {
			const rateLimiter = SecurityUtils.createRateLimiter(1, 100); // 1 request per 100ms
			
			assert.strictEqual(rateLimiter('user3'), true);
			assert.strictEqual(rateLimiter('user3'), false); // Should be blocked
			
			// Wait for window to expire
			await new Promise(resolve => setTimeout(resolve, 150));
			
			assert.strictEqual(rateLimiter('user3'), true); // Should be allowed again
		});
	});
});