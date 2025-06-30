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
import { validateAgentConfig, validateConversation, selectRelevantContext } from '../state/agentStore';

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
		toBeUndefined: () => {
			if (actual !== undefined) {
				throw new Error('Expected value to be undefined');
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
	expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
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

// Test code suggestion extraction (testing logic without VSCode dependencies)
test('extractCodeBlocks logic should work', () => {
	// Test the regex logic manually
	const response = 'Here is some code:\n```javascript\nfunction hello() {\n  console.log("Hello!");\n}\n```\nAnd that\'s it.';
	const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
	let match;
	const codeBlocks = [];
	
	while ((match = codeBlockRegex.exec(response)) !== null) {
		const language = match[1];
		const code = match[2].trim();
		if (code) {
			codeBlocks.push({
				code: sanitize.input(code),
				language: language ? sanitize.input(language) : undefined,
				description: `Code block ${language ? `(${language})` : ''}`,
				insertMode: 'insert'
			});
		}
	}
	
	expect(codeBlocks.length).toBe(1);
	expect(codeBlocks[0].language).toBe('javascript');
	expect(codeBlocks[0].code).toBe('function hello() { console.log(&quot;Hello!&quot;); }');
});

test('validateCodeSuggestion logic should work', () => {
	const validateCodeSuggestion = (suggestion: any) => {
		return (
			typeof suggestion === 'object' &&
			suggestion !== null &&
			typeof suggestion.code === 'string' &&
			suggestion.code.length > 0 &&
			(suggestion.language === undefined || typeof suggestion.language === 'string') &&
			(suggestion.description === undefined || typeof suggestion.description === 'string') &&
			(suggestion.insertMode === undefined || ['replace', 'insert', 'append'].includes(suggestion.insertMode))
		);
	};
	
	const validSuggestion = {
		code: 'console.log("test")',
		language: 'javascript',
		description: 'Test code'
	};
	expect(validateCodeSuggestion(validSuggestion)).toBe(true);
	
	const invalidSuggestion = {
		code: '',
		language: 'javascript'
	};
	expect(validateCodeSuggestion(invalidSuggestion)).toBe(false);
});

// Test agent store validation
test('validateAgentConfig should validate config objects', () => {
	const validConfig = {
		agentEndpoint: 'https://example.com/api',
		requestTimeout: 30000
	};
	expect(validateAgentConfig(validConfig)).toBe(true);
	
	const invalidConfig = {
		agentEndpoint: '',
		requestTimeout: -1
	};
	expect(validateAgentConfig(invalidConfig)).toBe(false);
});

test('validateConversation should validate conversation objects', () => {
	const validConversation = {
		id: '123',
		request: 'Hello',
		response: 'Hi there',
		success: true,
		timestamp: '10:30:45'
	};
	expect(validateConversation(validConversation)).toBe(true);
	
	const invalidConversation = {
		id: 123, // should be string
		request: 'Hello'
	};
	expect(validateConversation(invalidConversation)).toBe(false);
});

// Test context selection
test('selectRelevantContext should filter context based on mode', () => {
	const fullContext = {
		currentFile: 'test.js',
		selectedText: 'console.log("test")',
		workspaceRoot: 'my-project',
		language: 'javascript',
		lineNumber: 10,
		column: 5
	};
	
	const fileContext = selectRelevantContext(fullContext, 'file');
	expect(fileContext?.currentFile).toBe('test.js');
	expect(fileContext?.language).toBe('javascript');
	expect(fileContext?.selectedText).toBeUndefined();
	
	const noneContext = selectRelevantContext(fullContext, 'none');
	expect(noneContext).toBe(null);
});

test('validateContext logic should work', () => {
	const validateContext = (context: any) => {
		if (!context || typeof context !== 'object') return false;
		
		const validKeys = ['currentFile', 'selectedText', 'workspaceRoot', 'language', 'lineNumber', 'column'];
		
		for (const key in context) {
			if (!validKeys.includes(key)) return false;
			
			const value = context[key];
			if (value !== undefined && value !== null) {
				if (typeof value === 'string' && value.length > 10000) return false;
				if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) return false;
			}
		}
		
		return true;
	};
	
	const validContext = {
		currentFile: 'test.js',
		language: 'javascript',
		lineNumber: 10
	};
	expect(validateContext(validContext)).toBe(true);
	
	const invalidContext = {
		currentFile: 'test.js',
		invalidKey: 'value'
	};
	expect(validateContext(invalidContext)).toBe(false);
});

console.log('\nTests completed.');