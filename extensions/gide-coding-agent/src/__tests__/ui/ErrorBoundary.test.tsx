/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Test suite for ErrorBoundary component
 * Tests error handling, recovery mechanisms, and UI behavior
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../ui/ErrorBoundary';

// Mock VS Code API
const mockVscode = {
	postMessage: jest.fn()
};
(global as any).window = {
	...global.window,
	acquireVsCodeApi: () => mockVscode
};

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
	if (shouldThrow) {
		throw new Error('Test error message');
	}
	return <div>No error</div>;
};

describe('ErrorBoundary', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Suppress console.error for cleaner test output
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		(console.error as jest.Mock).mockRestore();
	});

	it('should render children when no error occurs', () => {
		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={false} />
			</ErrorBoundary>
		);

		expect(screen.getByText('No error')).toBeInTheDocument();
	});

	it('should render error UI when error occurs', () => {
		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
		expect(screen.getByText('Test error message')).toBeInTheDocument();
	});

	it('should display retry button with correct attempts left', () => {
		render(
			<ErrorBoundary maxRetries={3}>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		const retryButton = screen.getByText(/Try Again.*3 attempts left/);
		expect(retryButton).toBeInTheDocument();
	});

	it('should handle retry functionality', () => {
		const { rerender } = render(
			<ErrorBoundary maxRetries={2}>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		const retryButton = screen.getByText(/Try Again.*2 attempts left/);
		fireEvent.click(retryButton);

		// After retry, should show updated attempts
		expect(screen.getByText(/Try Again.*1 attempts left/)).toBeInTheDocument();
	});

	it('should handle reset functionality', () => {
		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		const resetButton = screen.getByText('Reset Component');
		fireEvent.click(resetButton);

		// Should attempt to reset the error state
		expect(resetButton).toBeInTheDocument();
	});

	it('should handle reload functionality', () => {
		// Mock window.location.reload
		const mockReload = jest.fn();
		Object.defineProperty(window, 'location', {
			value: { reload: mockReload },
			writable: true
		});

		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		const reloadButton = screen.getByText('Reload Page');
		fireEvent.click(reloadButton);

		expect(mockReload).toHaveBeenCalled();
	});

	it('should call custom error handler when provided', () => {
		const mockErrorHandler = jest.fn();

		render(
			<ErrorBoundary onError={mockErrorHandler}>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(mockErrorHandler).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({
				componentStack: expect.any(String)
			})
		);
	});

	it('should post error message to VS Code extension', () => {
		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(mockVscode.postMessage).toHaveBeenCalledWith({
			type: 'error',
			payload: 'React Error: Test error message',
			details: {
				stack: expect.any(String),
				componentStack: expect.any(String)
			}
		});
	});

	it('should render custom fallback when provided', () => {
		const customFallback = <div>Custom error fallback</div>;

		render(
			<ErrorBoundary fallback={customFallback}>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
		expect(screen.queryByText('⚠️ Something went wrong')).not.toBeInTheDocument();
	});

	it('should disable retry button when max retries reached', () => {
		const { rerender } = render(
			<ErrorBoundary maxRetries={1}>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		const retryButton = screen.getByText(/Try Again.*1 attempts left/);
		fireEvent.click(retryButton);

		// After clicking retry once, should not show retry button anymore
		expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();
	});

	it('should track retry count correctly', () => {
		render(
			<ErrorBoundary maxRetries={3}>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		// Click retry multiple times
		fireEvent.click(screen.getByText(/Try Again.*3 attempts left/));
		fireEvent.click(screen.getByText(/Try Again.*2 attempts left/));
		fireEvent.click(screen.getByText(/Try Again.*1 attempts left/));

		// Should show retry info
		expect(screen.getByText('Retry attempt: 3/3')).toBeInTheDocument();
	});

	it('should show error details in development mode', () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';

		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(screen.getByText('Error Details')).toBeInTheDocument();

		process.env.NODE_ENV = originalEnv;
	});

	it('should hide error details in production mode', () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';

		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(screen.queryByText('Error Details')).not.toBeInTheDocument();

		process.env.NODE_ENV = originalEnv;
	});
});