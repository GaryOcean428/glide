/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Enhanced Error Boundary Component with recovery options
 * Provides comprehensive error handling and recovery mechanisms for React components
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
	retryCount: number;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
	maxRetries?: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			retryCount: 0
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error('React Error Boundary caught an error:', error, errorInfo);
		
		this.setState({
			error,
			errorInfo
		});

		// Call custom error handler if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}

		// Post error to VS Code extension
		const vscode = (window as any).acquireVsCodeApi?.();
		if (vscode) {
			vscode.postMessage({
				type: 'error',
				payload: `React Error: ${error.message}`,
				details: {
					stack: error.stack,
					componentStack: errorInfo.componentStack
				}
			});
		}
	}

	handleRetry = (): void => {
		const { maxRetries = 3 } = this.props;
		
		if (this.state.retryCount < maxRetries) {
			this.setState(prevState => ({
				hasError: false,
				error: null,
				errorInfo: null,
				retryCount: prevState.retryCount + 1
			}));
		}
	};

	handleReset = (): void => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
			retryCount: 0
		});
	};

	handleReload = (): void => {
		window.location.reload();
	};

	render(): ReactNode {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const { maxRetries = 3 } = this.props;
			const canRetry = this.state.retryCount < maxRetries;

			return (
				<div className="error-boundary">
					<div className="error-boundary-content">
						<div className="error-boundary-header">
							<h3>⚠️ Something went wrong</h3>
							<p className="error-message">
								{this.state.error?.message || 'An unknown error occurred'}
							</p>
						</div>

						{/* Error details for development */}
						{process.env.NODE_ENV === 'development' && this.state.error && (
							<details className="error-details">
								<summary>Error Details</summary>
								<pre className="error-stack">
									{this.state.error.stack}
								</pre>
								{this.state.errorInfo && (
									<pre className="error-component-stack">
										{this.state.errorInfo.componentStack}
									</pre>
								)}
							</details>
						)}

						<div className="error-actions">
							{canRetry && (
								<button 
									onClick={this.handleRetry}
									className="retry-button primary"
								>
									Try Again ({maxRetries - this.state.retryCount} attempts left)
								</button>
							)}
							
							<button 
								onClick={this.handleReset}
								className="reset-button secondary"
							>
								Reset Component
							</button>
							
							<button 
								onClick={this.handleReload}
								className="reload-button secondary"
							>
								Reload Page
							</button>
						</div>

						{this.state.retryCount > 0 && (
							<div className="retry-info">
								<small>Retry attempt: {this.state.retryCount}/{maxRetries}</small>
							</div>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;