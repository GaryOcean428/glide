# GitHub OAuth Authentication Setup for GIDE

This document provides instructions for setting up GitHub OAuth authentication in GIDE.

## Quick Start

1. **Set up environment variables:**
   ```bash
   cp .env.template .env
   # Edit .env with your actual GitHub OAuth client secret
   ```

2. **Configure OAuth:**
   ```bash
   ./configure-oauth.sh
   ```

3. **Build GIDE:**
   ```bash
   npm run compile
   ```

## OAuth Application Configuration

Your GitHub OAuth application should be configured with these settings:

- **Client ID:** `Ov23liQH0sYgeB4izNjP`
- **Callback URLs:**
  - `vscode://vscode.github-authentication/did-authenticate`
  - `http://127.0.0.1:3000/callback`
  - `http://localhost:3000/callback`
  - `http://127.0.0.1:8080/callback`
  - `http://localhost:8080/callback`

## Environment Variables

Required environment variables:

- `GITHUB_CLIENT_ID` - Your GitHub OAuth client ID (already configured)
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth client secret (set manually)

## Security Notes

- Never commit `.env` files containing actual secrets
- Use environment variable injection for production builds
- The client secret is injected at build time for security

## Troubleshooting

If authentication fails:

1. Verify your GitHub OAuth app configuration
2. Check that callback URLs match exactly
3. Ensure environment variables are set correctly
4. Check the GIDE logs for detailed error information

For detailed setup instructions, see the complete documentation files provided.

