/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { WebviewHost } from './webviewHost';
import { CodeSuggestionProvider } from './actions/codeSuggestions';
import { checkConfigurationStatus, ENV_VARS } from './utils/config';

/**
 * Main extension activation function
 * Integrates with VSCode's extension lifecycle and remote coding agents system
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('Gide Coding Agent extension is now active!');

	// Check configuration status on startup
	const configStatus = checkConfigurationStatus();
	
	if (!configStatus.isValid) {
		const message = `Gide Coding Agent: Missing required environment variables: ${configStatus.missingVars.join(', ')}. ` +
			'Please configure these variables for the extension to work properly.';
		vscode.window.showWarningMessage(message, 'Show Setup Instructions').then(selection => {
			if (selection === 'Show Setup Instructions') {
				vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://github.com/GaryOcean428/gide/blob/main/extensions/gide-coding-agent/README.md#configuration'));
			}
		});
	}

	// Show warnings for missing optional configuration
	if (configStatus.warnings.length > 0) {
		console.warn('Gide Coding Agent configuration warnings:', configStatus.warnings);
	}

	const webviewHost = new WebviewHost(context);

	// Register the command to open the coding agent panel
	const openPanelCommand = vscode.commands.registerCommand('gide-coding-agent.openPanel', () => {
		webviewHost.showPanel();
	});
	
	// Register the command to insert code suggestions
	const insertCodeCommand = vscode.commands.registerCommand('gide-coding-agent.insertCodeSuggestion', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor found');
			return;
		}
		
		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);
		
		if (!selectedText.trim()) {
			vscode.window.showWarningMessage('Please select some text that contains code suggestions');
			return;
		}
		
		await CodeSuggestionProvider.showInteractivePicker(selectedText);
	});

	// Register the command to open health dashboard
	const healthDashboardCommand = vscode.commands.registerCommand('gide-coding-agent.openHealthDashboard', () => {
		webviewHost.showHealthDashboard();
	});

	context.subscriptions.push(openPanelCommand);
	context.subscriptions.push(insertCodeCommand);
	context.subscriptions.push(healthDashboardCommand);
	context.subscriptions.push(webviewHost);

	console.log('Gide Coding Agent extension activated successfully');
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
	console.log('Gide Coding Agent extension deactivated');
}