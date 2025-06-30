/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Basic tests for the Gide Coding Agent extension
 * Simple Node.js-based tests without external frameworks
 */

import { AgentClient } from '../agent/AgentClient';
import { sanitize } from '../utils/sanitize';

// Simple test framework
function test(name: string, fn: () => void | Promise<void>) {
	try {
		const result = fn();
		if (result instanceof Promise) {
			result.then(() => {
				console.log(`✓ ${name}`);
			}).catch((error) => {
				console.error(`✗ ${name}: ${error.message}`);
			});
		} else {
			console.log(`✓ ${name}`);
		}
	} catch (error) {
		console.error(`✗ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

function expect(actual: any) {
	return {
		toBe: (expected: any) => {
			if (actual !== expected) {
				throw new Error(`Expected ${expected}, got ${actual}`);
			}
		},
		toThrow: (expectedMessage?: string) => {
			try {
				if (typeof actual === 'function') {
					actual();
				}
				throw new Error('Expected function to throw, but it did not');
			} catch (error) {
				if (expectedMessage && error instanceof Error && !error.message.includes(expectedMessage)) {
					throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
				}
			}
		},
		toBeDefined: () => {
			if (actual === undefined) {
				throw new Error('Expected value to be defined');
			}
		},
		toBeLessThanOrEqual: (expected: number) => {
			if (typeof actual !== 'number' || actual > expected) {
				throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
			}
		},
		toEndWith: (suffix: string) => {
			if (typeof actual !== 'string' || !actual.endsWith(suffix)) {
				throw new Error(`Expected "${actual}" to end with "${suffix}"`);
			}
		}
	};
}

// Run tests
console.log('Running Gide Coding Agent tests...\n');

test('AgentClient should validate configuration', () => {
	expect(() => {
		new AgentClient({
			endpoint: 'invalid-url',
			timeout: 30000
		});
	}).toThrow('Invalid agent endpoint URL');
});

test('AgentClient should accept valid configuration', () => {
	const client = new AgentClient({
		endpoint: 'https://example.com/api',
		timeout: 30000
	});
	
	expect(client).toBeDefined();
	expect(client.getConfig().endpoint).toBe('https://example.com/api');
});

test('sanitize.html should encode HTML entities', () => {
	const input = '<script>alert("xss")</script>';
	const result = sanitize.html(input);
	expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
});

test('sanitize.input should encode dangerous characters', () => {
	const input = 'Hello <world> & "friends"';
	const result = sanitize.input(input);
	expect(result).toBe('Hello &lt;world&gt; &amp; &quot;friends&quot;');
});

test('sanitize.url should validate URLs', () => {
	expect(sanitize.url('https://example.com')).toBe('https://example.com');
	expect(sanitize.url('javascript:alert(1)')).toBe('');
	expect(sanitize.url('data:text/html,<script>alert(1)</script>')).toBe('');
});

test('sanitize.truncate should limit text length', () => {
	const longText = 'a'.repeat(1500);
	const result = sanitize.truncate(longText, 1000);
	expect(result.length).toBeLessThanOrEqual(1004); // 1000 + '...'
	expect(result).toEndWith('...');
});

console.log('\nTests completed.');