/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { WebviewHost } from './webviewHost';

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

	context.subscriptions.push(openPanelCommand);
	context.subscriptions.push(webviewHost);

	console.log('Gide Coding Agent extension activated successfully');
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
	console.log('Gide Coding Agent extension deactivated');
}