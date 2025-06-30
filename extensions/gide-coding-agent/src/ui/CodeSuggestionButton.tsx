/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Enhanced Code Suggestion Button Component
 * Provides intelligent code extraction and insertion capabilities
 */

import React, { useMemo, useCallback } from 'react';

interface CodeSuggestionButtonProps {
	response: string;
	onCodeSuggestions?: (response: string) => void;
	disabled?: boolean;
}

/**
 * Patterns for detecting code blocks in responses
 */
const codePatterns = {
	// Markdown code blocks
	markdownBlocks: /```[\s\S]*?```/g,
	// Inline code
	inlineCode: /`[^`\n]+`/g,
	// Function declarations
	functions: /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/g,
	// Class declarations
	classes: /class\s+\w+[\s\S]*?{[\s\S]*?}/g,
	// Variable declarations
	variables: /(?:const|let|var)\s+\w+[\s\S]*?[;\n]/g,
	// Arrow functions
	arrowFunctions: /\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*?}/g,
	// Common keywords
	keywords: /\b(?:function|class|const|let|var|if|for|while|return|import|export)\b/g
};

/**
 * Analyze response for code content
 */
const analyzeCodeContent = (response: string) => {
	if (!response || typeof response !== 'string') {
		return { hasCode: false, codeBlocks: [], confidence: 0 };
	}

	const codeBlocks: string[] = [];
	let totalMatches = 0;

	// Check for different types of code patterns
	Object.entries(codePatterns).forEach(([patternName, pattern]) => {
		const matches = response.match(pattern);
		if (matches) {
			totalMatches += matches.length;
			if (patternName === 'markdownBlocks') {
				codeBlocks.push(...matches);
			}
		}
	});

	// Calculate confidence based on number of matches and response length
	const confidence = Math.min(totalMatches / (response.length / 100), 1);
	const hasCode = confidence > 0.1 || codeBlocks.length > 0;

	return { hasCode, codeBlocks, confidence, totalMatches };
};

/**
 * Performance-optimized Code Suggestion Button Component
 */
export const CodeSuggestionButton: React.FC<CodeSuggestionButtonProps> = React.memo(({
	response,
	onCodeSuggestions,
	disabled = false
}) => {
	// Memoize code analysis to prevent unnecessary recalculations
	const codeAnalysis = useMemo(() => analyzeCodeContent(response), [response]);

	// Memoize the click handler
	const handleCodeSuggestions = useCallback(() => {
		if (onCodeSuggestions) {
			onCodeSuggestions(response);
		} else {
			// Fallback to VS Code messaging
			const vscode = (window as any).acquireVsCodeApi?.();
			if (vscode) {
				vscode.postMessage({
					type: 'processCodeSuggestions',
					payload: { response }
				});
			}
		}
	}, [response, onCodeSuggestions]);

	// Don't render if no code detected
	if (!codeAnalysis.hasCode) {
		return null;
	}

	const { codeBlocks, confidence, totalMatches } = codeAnalysis;

	return (
		<div className="code-suggestion-container">
			<button 
				onClick={handleCodeSuggestions}
				disabled={disabled}
				className="code-suggestion-btn"
				title={`Extract and insert code suggestions (${totalMatches} code patterns detected)`}
				aria-label={`Code suggestions available with ${Math.round(confidence * 100)}% confidence`}
			>
				<span className="code-suggestion-icon">📋</span>
				<span className="code-suggestion-text">Code Actions</span>
				{codeBlocks.length > 0 && (
					<span className="code-suggestion-count">
						{codeBlocks.length}
					</span>
				)}
			</button>
			
			{/* Confidence indicator */}
			{confidence > 0.5 && (
				<div className="code-confidence-indicator">
					<div 
						className="code-confidence-bar" 
						style={{ width: `${confidence * 100}%` }}
						title={`${Math.round(confidence * 100)}% confidence`}
					/>
				</div>
			)}
			
			{/* Code blocks preview */}
			{codeBlocks.length > 0 && (
				<div className="code-blocks-preview">
					<small>
						{codeBlocks.length} code block{codeBlocks.length > 1 ? 's' : ''} detected
					</small>
				</div>
			)}
		</div>
	);
});

CodeSuggestionButton.displayName = 'CodeSuggestionButton';

export default CodeSuggestionButton;