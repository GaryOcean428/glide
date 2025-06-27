/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IConfig {
	// The client ID of the GitHub OAuth app
	gitHubClientId: string;
	gitHubClientSecret?: string;
}

// GIDE GitHub OAuth Configuration
// 
// IMPORTANT: This configuration uses the GIDE project's OAuth application credentials.
// The client secret should be injected at build time via environment variables for security.
//
// OAuth Application Details:
// - Application Name: GIDE (GitHub Integrated Development Environment)
// - Client ID: Ov23liQH0sYgeB4izNjP
// - Owner: GaryOcean428
//
// Callback URLs configured:
// - vscode://vscode.github-authentication/did-authenticate (primary)
// - http://127.0.0.1:3000/callback (loopback fallback)
// - http://localhost:3000/callback (loopback fallback)
// - http://127.0.0.1:8080/callback (loopback fallback)
// - http://localhost:8080/callback (loopback fallback)
//
// NOTE: GitHub client secrets cannot be secured when running in a native client so in other words, the client secret is
// not really a secret... so we allow the client secret in code. It is brought in before we publish VS Code. Reference:
// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app#client-secrets
export const Config: IConfig = {
	gitHubClientId: process.env.GITHUB_CLIENT_ID || 'Ov23liQH0sYgeB4izNjP',
	gitHubClientSecret: process.env.GITHUB_CLIENT_SECRET
};

