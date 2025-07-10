import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface APIKeyValidationRequest {
  provider: string;
  keyPrefix?: string;
  testCall?: boolean;
}

interface APIKeyValidationResponse {
  isValid: boolean;
  provider: string;
  error?: string;
  timestamp: string;
}

/**
 * Validates API keys for various AI providers
 * Supports: OpenAI, Anthropic, Perplexity, XAI, Groq, Gemini
 */
async function validateApiKey(req: Request): Promise<APIKeyValidationResponse> {
  const { provider, keyPrefix, testCall = false } = await req.json() as APIKeyValidationRequest;
  
  const timestamp = new Date().toISOString();
  
  if (!provider) {
    return {
      isValid: false,
      provider: 'unknown',
      error: 'Provider is required',
      timestamp
    };
  }

  // Get the API key from environment based on provider
  const envKeyMap: Record<string, string> = {
    'openai': 'OPENAI_API_KEY',
    'anthropic': 'ANTHROPIC_API_KEY', 
    'perplexity': 'PERPLEXITY_API_KEY',
    'xai': 'XAI_API_KEY',
    'groq': 'GROQ_API_KEY',
    'gemini': 'GEMINI_API_KEY'
  };

  const envKey = envKeyMap[provider.toLowerCase()];
  if (!envKey) {
    return {
      isValid: false,
      provider,
      error: `Unsupported provider: ${provider}`,
      timestamp
    };
  }

  const apiKey = Deno.env.get(envKey);
  if (!apiKey) {
    return {
      isValid: false,
      provider,
      error: `API key not configured for ${provider}`,
      timestamp
    };
  }

  // Basic validation - check key format and length
  const isValidFormat = validateKeyFormat(provider, apiKey);
  if (!isValidFormat) {
    return {
      isValid: false,
      provider,
      error: `Invalid API key format for ${provider}`,
      timestamp
    };
  }

  // Optional: Test the key with a live API call (disabled by default for security)
  if (testCall) {
    try {
      const isLiveValid = await testApiKeyLive(provider, apiKey);
      return {
        isValid: isLiveValid,
        provider,
        error: isLiveValid ? undefined : 'API key failed live validation',
        timestamp
      };
    } catch (error) {
      return {
        isValid: false,
        provider,
        error: `Live validation failed: ${error.message}`,
        timestamp
      };
    }
  }

  return {
    isValid: true,
    provider,
    timestamp
  };
}

/**
 * Validates API key format for different providers
 */
function validateKeyFormat(provider: string, apiKey: string): boolean {
  const patterns: Record<string, RegExp> = {
    'openai': /^sk-[a-zA-Z0-9\-_]{20,}$/,
    'anthropic': /^sk-ant-api\d{2}-[a-zA-Z0-9\-_]{20,}$/,
    'perplexity': /^pplx-[a-zA-Z0-9]{32,}$/,
    'xai': /^xai-[a-zA-Z0-9]{32,}$/,
    'groq': /^gsk_[a-zA-Z0-9]{32,}$/,
    'gemini': /^[a-zA-Z0-9\-_]{32,}$/
  };

  const pattern = patterns[provider.toLowerCase()];
  return pattern ? pattern.test(apiKey) : apiKey.length > 10;
}

/**
 * Test API key with live call (use sparingly)
 */
async function testApiKeyLive(provider: string, apiKey: string): Promise<boolean> {
  const testEndpoints: Record<string, { url: string; headers: Record<string, string> }> = {
    'openai': {
      url: 'https://api.openai.com/v1/models',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    },
    'anthropic': {
      url: 'https://api.anthropic.com/v1/models',
      headers: { 'X-API-Key': apiKey, 'Anthropic-Version': '2023-06-01' }
    }
    // Add other providers as needed
  };

  const endpoint = testEndpoints[provider.toLowerCase()];
  if (!endpoint) {
    return false; // No test endpoint available
  }

  try {
    const response = await fetch(endpoint.url, {
      method: 'GET',
      headers: endpoint.headers,
      // Short timeout for validation
      signal: AbortSignal.timeout(5000)
    });
    
    return response.status === 200;
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    // Only allow POST requests for validation
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 405,
        }
      )
    }

    const response = await validateApiKey(req);
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('API Key validation error:', error);
    
    return new Response(
      JSON.stringify({ 
        isValid: false,
        provider: 'unknown',
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      }
    )
  }
})