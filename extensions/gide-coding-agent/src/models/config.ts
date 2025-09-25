export const APPROVED_MODELS = {
  anthropic: {
    primary: 'claude-sonnet-4-20250514',
    fallback: 'claude-3-5-haiku-20241022',
    description: 'Best for complex reasoning and code analysis'
  },
  xai: {
    primary: 'grok-code-fast-1',
    fallback: 'grok-4-latest', 
    description: 'Optimized for fast code generation'
  },
  openai: {
    primary: 'gpt-5-mini',
    fallback: 'o4-mini',
    description: 'Efficient for well-defined coding tasks'
  }
} as const;