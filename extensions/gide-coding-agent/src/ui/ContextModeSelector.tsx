/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Performance-optimized Context Mode Selector Component
 * Allows users to select different context modes for agent requests
 */

import React, { useMemo, useCallback } from 'react';
import { VSCodeContext } from '../state/agentStore';

interface ContextMode {
	value: string;
	label: string;
	description: string;
	icon: string;
}

interface ContextModeSelectorProps {
	contextMode: string;
	setContextMode: (mode: string) => void;
	vsCodeContext: VSCodeContext | null;
	disabled?: boolean;
}

/**
 * Memoized context modes configuration
 */
const contextModes: ContextMode[] = [
	{ value: 'none', label: 'No Context', description: 'No context will be sent', icon: '🚫' },
	{ value: 'file', label: 'Current File', description: 'File name and language', icon: '📄' },
	{ value: 'selection', label: 'Selection', description: 'Selected text and position', icon: '✂️' },
	{ value: 'workspace', label: 'Workspace', description: 'Workspace information', icon: '📁' }
];

/**
 * Format context information for display
 */
const formatContext = (context: VSCodeContext | null): string => {
	if (!context) return 'No context available';
	
	const parts: string[] = [];
	if (context.currentFile) parts.push(`File: ${context.currentFile}`);
	if (context.language) parts.push(`Language: ${context.language}`);
	if (context.selectedText) {
		const preview = context.selectedText.length > 30 
			? context.selectedText.substring(0, 30) + '...'
			: context.selectedText;
		parts.push(`Selection: "${preview}"`);
	}
	if (context.workspaceRoot) parts.push(`Workspace: ${context.workspaceRoot}`);
	
	return parts.join(' | ') || 'No context available';
};

/**
 * Context Mode Selector Component with performance optimizations
 */
export const ContextModeSelector: React.FC<ContextModeSelectorProps> = React.memo(({
	contextMode,
	setContextMode,
	vsCodeContext,
	disabled = false
}) => {
	// Memoize the formatted context string to prevent unnecessary recalculations
	const formattedContext = useMemo(() => formatContext(vsCodeContext), [vsCodeContext]);
	
	// Memoize the change handler to prevent unnecessary re-renders
	const handleContextModeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setContextMode(event.target.value);
	}, [setContextMode]);

	// Memoize the current mode details
	const currentModeDetails = useMemo(() => {
		return contextModes.find(mode => mode.value === contextMode);
	}, [contextMode]);

	return (
		<div className="context-selector">
			<div className="context-selector-header">
				<h4>
					{currentModeDetails?.icon} Context Mode
				</h4>
				<span className="context-mode-badge">
					{currentModeDetails?.label}
				</span>
			</div>
			
			<select 
				value={contextMode} 
				onChange={handleContextModeChange}
				disabled={disabled}
				className="context-mode-select"
				aria-label="Select context mode for agent requests"
			>
				{contextModes.map(mode => (
					<option key={mode.value} value={mode.value}>
						{mode.icon} {mode.label} - {mode.description}
					</option>
				))}
			</select>
			
			<div className="current-context" aria-live="polite">
				<div className="current-context-header">
					<span className="current-context-label">Current Context:</span>
				</div>
				<div className="current-context-content">
					<small>{formattedContext}</small>
				</div>
			</div>
			
			{/* Context mode help text */}
			{currentModeDetails && (
				<div className="context-mode-help">
					<small>
						<strong>{currentModeDetails.label}:</strong> {currentModeDetails.description}
					</small>
				</div>
			)}
		</div>
	);
});

ContextModeSelector.displayName = 'ContextModeSelector';

export default ContextModeSelector;