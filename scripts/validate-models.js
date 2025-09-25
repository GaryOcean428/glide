const APPROVED_MODELS = {
  'anthropic': ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
  'xai': ['grok-code-fast-1', 'grok-4-latest', 'grok-3'],
  'openai': ['gpt-5', 'gpt-5-mini', 'o4-mini', 'o3-pro', 'gpt-4.1']
};

const currentModel = process.env.GIDE_MODEL_NAME;
const currentProvider = process.env.GIDE_MODEL_PROVIDER;

if (!currentModel || !currentProvider) {
  console.error('❌ Model configuration missing');
  process.exit(1);
}

if (!APPROVED_MODELS[currentProvider]?.includes(currentModel)) {
  console.error(`❌ Model ${currentModel} not approved for ${currentProvider}`);
  console.log('✅ Approved models:', APPROVED_MODELS[currentProvider]);
  process.exit(1);
}

console.log(`✅ Model ${currentModel} approved for ${currentProvider}`);