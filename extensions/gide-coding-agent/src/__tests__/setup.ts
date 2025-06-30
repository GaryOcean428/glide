/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Jest test setup configuration
 * Configures testing environment and global mocks
 */

import '@testing-library/jest-dom';

// Mock VS Code API
const mockVscode = {
	postMessage: jest.fn(),
	getState: jest.fn(),
	setState: jest.fn()
};

// Mock window.acquireVsCodeApi
Object.defineProperty(global, 'window', {
	value: {
		...global.window,
		acquireVsCodeApi: () => mockVscode
	},
	writable: true
});

// Mock console methods to reduce noise in tests
global.console = {
	...console,
	// Uncomment to suppress logs during tests
	// log: jest.fn(),
	// error: jest.fn(),
	// warn: jest.fn(),
	// info: jest.fn(),
};

// Setup global test utilities
declare global {
	namespace jest {
		interface Matchers<R> {
			toBeInTheDocument(): R;
		}
	}
}

// Clean up after each test
afterEach(() => {
	jest.clearAllMocks();
});