/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import { VSCodeContext } from '../state/agentStore';
import { sanitize } from './sanitize';

/**
 * VSCode context collection utilities
 * Safely collects and sanitizes context information from VSCode
 */

/**
 * Collects current VSCode context information
 */
export async function collectVSCodeContext(): Promise<VSCodeContext | null> {
	try {
		const context: VSCodeContext = {};
		
		// Get active text editor
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			// Current file path
			const filePath = editor.document.uri.fsPath;
			context.currentFile = sanitize.filePath(path.basename(filePath));
			
			// Language
			context.language = sanitize.input(editor.document.languageId);
			
			// Selected text
			const selection = editor.selection;
			if (!selection.isEmpty) {
				const selectedText = editor.document.getText(selection);
				context.selectedText = sanitize.input(selectedText);
				context.lineNumber = selection.start.line + 1; // VSCode uses 0-based line numbers
				context.column = selection.start.character + 1;
			}
		}
		
		// Workspace root
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			context.workspaceRoot = sanitize.filePath(path.basename(workspaceFolder.uri.fsPath));
		}
		
		return Object.keys(context).length > 0 ? context : null;
	} catch (error) {
		console.error('Error collecting VSCode context:', error);
		return null;
	}
}

/**
 * Gets the current file content for context
 */
export async function getCurrentFileContent(maxLength: number = 10000): Promise<string | null> {
	try {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return null;
		
		const document = editor.document;
		const content = document.getText();
		
		return sanitize.truncate(content, maxLength);
	} catch (error) {
		console.error('Error getting current file content:', error);
		return null;
	}
}

/**
 * Gets information about the current workspace
 */
export async function getWorkspaceInfo(): Promise<{
	name: string;
	fileCount: number;
	languages: string[];
} | null> {
	try {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) return null;
		
		const name = sanitize.input(workspaceFolder.name);
		
		// Get file count and language info
		const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 1000);
		const fileCount = files.length;
		
		const languages = new Set<string>();
		for (const file of files.slice(0, 100)) { // Sample first 100 files
			try {
				const document = await vscode.workspace.openTextDocument(file);
				if (document.languageId !== 'plaintext') {
					languages.add(document.languageId);
				}
			} catch {
				// Skip files that can't be opened
			}
		}
		
		return {
			name,
			fileCount,
			languages: Array.from(languages).slice(0, 10).map(lang => sanitize.input(lang))
		};
	} catch (error) {
		console.error('Error getting workspace info:', error);
		return null;
	}
}

/**
 * Context mode descriptions for UI
 */
export const contextModeDescriptions = {
	none: 'No context will be sent to the agent',
	file: 'Current file name and language will be included',
	selection: 'Current file, selected text, and cursor position will be included',
	workspace: 'Workspace information and file structure will be included'
};

/**
 * Validates that a context object is safe to send
 */
export function validateContext(context: any): context is VSCodeContext {
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
}

/**
 * Formats context for display in UI
 */
export function formatContextForDisplay(context: VSCodeContext | null): string {
	if (!context) return 'No context available';
	
	const parts: string[] = [];
	
	if (context.currentFile) {
		parts.push(`File: ${context.currentFile}`);
	}
	
	if (context.language) {
		parts.push(`Language: ${context.language}`);
	}
	
	if (context.selectedText) {
		const preview = context.selectedText.length > 50 
			? context.selectedText.substring(0, 50) + '...'
			: context.selectedText;
		parts.push(`Selection: "${preview}"`);
	}
	
	if (context.lineNumber && context.column) {
		parts.push(`Position: Line ${context.lineNumber}, Column ${context.column}`);
	}
	
	if (context.workspaceRoot) {
		parts.push(`Workspace: ${context.workspaceRoot}`);
	}
	
	return parts.join(' | ');
}

/**
 * Context change event listener
 */
export class ContextWatcher implements vscode.Disposable {
	private disposables: vscode.Disposable[] = [];
	private onContextChangedCallback?: (context: VSCodeContext | null) => void;
	
	constructor() {
		// Listen for text editor changes
		this.disposables.push(
			vscode.window.onDidChangeActiveTextEditor(() => {
				this.notifyContextChanged();
			})
		);
		
		// Listen for selection changes
		this.disposables.push(
			vscode.window.onDidChangeTextEditorSelection(() => {
				this.notifyContextChanged();
			})
		);
		
		// Listen for workspace changes
		this.disposables.push(
			vscode.workspace.onDidChangeWorkspaceFolders(() => {
				this.notifyContextChanged();
			})
		);
	}
	
	/**
	 * Set callback for context changes
	 */
	public onContextChanged(callback: (context: VSCodeContext | null) => void): void {
		this.onContextChangedCallback = callback;
	}
	
	/**
	 * Manually trigger context collection
	 */
	public async notifyContextChanged(): Promise<void> {
		if (this.onContextChangedCallback) {
			const context = await collectVSCodeContext();
			this.onContextChangedCallback(context);
		}
	}
	
	/**
	 * Dispose of resources
	 */
	public dispose(): void {
		this.disposables.forEach(disposable => disposable.dispose());
	}
}