/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { WebviewHost } from './webviewHost';
import { CodeSuggestionProvider } from './actions/codeSuggestions';

/**
 * Main extension activation function
 * Integrates with VSCode's extension lifecycle and remote coding agents system
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('Gide Coding Agent extension is now active!');

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

	context.subscriptions.push(openPanelCommand);
	context.subscriptions.push(insertCodeCommand);
	context.subscriptions.push(webviewHost);

	console.log('Gide Coding Agent extension activated successfully');
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
	console.log('Gide Coding Agent extension deactivated');
}