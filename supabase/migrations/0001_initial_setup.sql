-- Create a simple table for API key tracking if needed
CREATE TABLE IF NOT EXISTS api_key_usage (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    validation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_valid BOOLEAN NOT NULL,
    error_message TEXT,
    user_id TEXT,
    UNIQUE(provider, validation_timestamp)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_api_key_usage_provider ON api_key_usage(provider);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(validation_timestamp);

-- Enable RLS (Row Level Security)
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable insert for authenticated users only" ON api_key_usage
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable select for authenticated users only" ON api_key_usage
    FOR SELECT USING (auth.role() = 'authenticated');