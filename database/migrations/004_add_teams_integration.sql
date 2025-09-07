-- Add Microsoft Teams integration fields to users table
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS microsoft_access_token TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS microsoft_refresh_token TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS microsoft_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Update meetings table for Teams integration
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS event_id TEXT UNIQUE;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_time TIMESTAMP WITH TIME ZONE;

-- Rename title to subject for consistency with Teams API
ALTER TABLE meetings RENAME COLUMN title TO subject;

-- Create index for event_id
CREATE INDEX IF NOT EXISTS idx_meetings_event_id ON meetings(event_id);

-- Create teams_configs table for storing Teams OAuth configuration
CREATE TABLE IF NOT EXISTS teams_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    microsoft_access_token TEXT,
    microsoft_refresh_token TEXT,
    microsoft_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for teams_configs
ALTER TABLE teams_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for teams_configs
CREATE POLICY "Users can only access their own teams configs" ON teams_configs
    FOR ALL USING (auth.uid() = user_id);

-- Create index for teams_configs
CREATE INDEX IF NOT EXISTS idx_teams_configs_user_id ON teams_configs(user_id);

-- Create trigger for updated_at on teams_configs
CREATE TRIGGER update_teams_configs_updated_at BEFORE UPDATE ON teams_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add transcripts table for storing meeting transcripts
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'teams', -- 'teams', 'manual', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for transcripts
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for transcripts
CREATE POLICY "Users can only access their own transcripts" ON transcripts
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for transcripts
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_id ON transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);

-- Create trigger for updated_at on transcripts
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add summaries table for storing AI-generated summaries
CREATE TABLE IF NOT EXISTS summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    ai_model TEXT DEFAULT 'gpt-3.5-turbo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for summaries
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for summaries
CREATE POLICY "Users can only access their own summaries" ON summaries
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for summaries
CREATE INDEX IF NOT EXISTS idx_summaries_meeting_id ON summaries(meeting_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);

-- Create trigger for updated_at on summaries
CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();