/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { sanitize } from '../utils/sanitize';

/**
 * Code suggestion actions for VSCode integration
 * Provides functionality to insert and copy code suggestions from the agent
 */

export interface CodeSuggestion {
	code: string;
	language?: string;
	description?: string;
	insertMode?: 'replace' | 'insert' | 'append';
}

/**
 * Extracts code blocks from agent response text
 */
export function extractCodeBlocks(text: string): CodeSuggestion[] {
	const codeBlocks: CodeSuggestion[] = [];
	
	// Match code blocks with language specification (```language ... ```)
	const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
	let match;
	
	while ((match = codeBlockRegex.exec(text)) !== null) {
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
	
	// If no code blocks found, look for inline code
	if (codeBlocks.length === 0) {
		const inlineCodeRegex = /`([^`]+)`/g;
		while ((match = inlineCodeRegex.exec(text)) !== null) {
			const code = match[1].trim();
			if (code && code.length > 5) { // Only consider substantial inline code
				codeBlocks.push({
					code: sanitize.input(code),
					description: 'Inline code',
					insertMode: 'insert'
				});
			}
		}
	}
	
	return codeBlocks;
}

/**
 * Inserts code at the current cursor position
 */
export async function insertCodeAtCursor(suggestion: CodeSuggestion): Promise<boolean> {
	try {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !suggestion.code) {
			vscode.window.showWarningMessage('No active editor or empty code suggestion');
			return false;
		}
		
		const position = editor.selection.active;
		const edit = new vscode.WorkspaceEdit();
		
		switch (suggestion.insertMode) {
			case 'replace':
				if (!editor.selection.isEmpty) {
					edit.replace(editor.document.uri, editor.selection, suggestion.code);
				} else {
					edit.insert(editor.document.uri, position, suggestion.code);
				}
				break;
			case 'insert':
				edit.insert(editor.document.uri, position, suggestion.code);
				break;
			case 'append':
				const lineEnd = new vscode.Position(position.line, editor.document.lineAt(position.line).text.length);
				edit.insert(editor.document.uri, lineEnd, '\n' + suggestion.code);
				break;
		}
		
		const success = await vscode.workspace.applyEdit(edit);
		
		if (success) {
			vscode.window.showInformationMessage('Code inserted successfully');
			return true;
		} else {
			vscode.window.showErrorMessage('Failed to insert code');
			return false;
		}
	} catch (error) {
		console.error('Error inserting code:', error);
		vscode.window.showErrorMessage(`Error inserting code: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return false;
	}
}

/**
 * Copies code to clipboard
 */
export async function copyCodeToClipboard(suggestion: CodeSuggestion): Promise<boolean> {
	try {
		if (!suggestion.code) {
			vscode.window.showWarningMessage('Empty code suggestion');
			return false;
		}
		
		await vscode.env.clipboard.writeText(suggestion.code);
		vscode.window.showInformationMessage('Code copied to clipboard');
		return true;
	} catch (error) {
		console.error('Error copying code:', error);
		vscode.window.showErrorMessage(`Error copying code: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return false;
	}
}

/**
 * Creates a new file with the suggested code
 */
export async function createNewFileWithCode(suggestion: CodeSuggestion): Promise<boolean> {
	try {
		if (!suggestion.code) {
			vscode.window.showWarningMessage('Empty code suggestion');
			return false;
		}
		
		const document = await vscode.workspace.openTextDocument({
			content: suggestion.code,
			language: suggestion.language || 'plaintext'
		});
		
		await vscode.window.showTextDocument(document);
		vscode.window.showInformationMessage('Code opened in new file');
		return true;
	} catch (error) {
		console.error('Error creating new file:', error);
		vscode.window.showErrorMessage(`Error creating new file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return false;
	}
}

/**
 * Shows a quick pick menu for code suggestions
 */
export async function showCodeSuggestionPicker(suggestions: CodeSuggestion[]): Promise<CodeSuggestion | null> {
	if (suggestions.length === 0) {
		vscode.window.showInformationMessage('No code suggestions found in the response');
		return null;
	}
	
	const items = suggestions.map((suggestion, index) => ({
		label: `$(code) ${suggestion.description || `Code Block ${index + 1}`}`,
		description: suggestion.language ? `Language: ${suggestion.language}` : '',
		detail: suggestion.code.length > 100 
			? suggestion.code.substring(0, 100) + '...'
			: suggestion.code,
		suggestion
	}));
	
	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select a code suggestion to insert',
		matchOnDescription: true,
		matchOnDetail: true
	});
	
	return selected?.suggestion || null;
}

/**
 * Shows action menu for a code suggestion
 */
export async function showCodeActionMenu(suggestion: CodeSuggestion): Promise<void> {
	const actions = [
		{
			label: '$(diff-insert) Insert at Cursor',
			description: 'Insert code at current cursor position',
			action: 'insert'
		},
		{
			label: '$(copy) Copy to Clipboard',
			description: 'Copy code to clipboard',
			action: 'copy'
		},
		{
			label: '$(file-add) Create New File',
			description: 'Open code in a new file',
			action: 'newFile'
		}
	];
	
	const selected = await vscode.window.showQuickPick(actions, {
		placeHolder: 'Choose an action for the code suggestion'
	});
	
	if (!selected) return;
	
	switch (selected.action) {
		case 'insert':
			await insertCodeAtCursor(suggestion);
			break;
		case 'copy':
			await copyCodeToClipboard(suggestion);
			break;
		case 'newFile':
			await createNewFileWithCode(suggestion);
			break;
	}
}

/**
 * Formats code suggestion for display
 */
export function formatCodeSuggestion(suggestion: CodeSuggestion): string {
	let formatted = suggestion.code;
	
	// Add language-specific formatting if available
	if (suggestion.language) {
		formatted = `\`\`\`${suggestion.language}\n${formatted}\n\`\`\``;
	}
	
	return formatted;
}

/**
 * Validates a code suggestion
 */
export function validateCodeSuggestion(suggestion: any): suggestion is CodeSuggestion {
	return (
		typeof suggestion === 'object' &&
		suggestion !== null &&
		typeof suggestion.code === 'string' &&
		suggestion.code.length > 0 &&
		(suggestion.language === undefined || typeof suggestion.language === 'string') &&
		(suggestion.description === undefined || typeof suggestion.description === 'string') &&
		(suggestion.insertMode === undefined || ['replace', 'insert', 'append'].includes(suggestion.insertMode))
	);
}

/**
 * Code suggestion provider for webview integration
 */
export class CodeSuggestionProvider {
	/**
	 * Processes agent response and extracts code suggestions
	 */
	public static async processAgentResponse(response: string): Promise<CodeSuggestion[]> {
		const suggestions = extractCodeBlocks(response);
		return suggestions.filter(validateCodeSuggestion);
	}
	
	/**
	 * Shows interactive code suggestion picker
	 */
	public static async showInteractivePicker(response: string): Promise<void> {
		const suggestions = await this.processAgentResponse(response);
		
		if (suggestions.length === 0) {
			vscode.window.showInformationMessage('No code suggestions found in the response');
			return;
		}
		
		const selected = await showCodeSuggestionPicker(suggestions);
		if (selected) {
			await showCodeActionMenu(selected);
		}
	}
}