-- Add AI meeting functionality

-- Add notes field to leads table for AI insights
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_insights JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;

-- Create ai_meetings table for AI-conducted meetings
CREATE TABLE IF NOT EXISTS ai_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
    meeting_id BIGINT REFERENCES meetings(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, active, completed, cancelled
    questions JSONB, -- Array of questions to ask
    conversation_history JSONB DEFAULT '[]'::jsonb, -- Array of conversation messages
    ai_analysis JSONB, -- AI analysis results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_messages table for detailed conversation tracking
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ai_meeting_id UUID REFERENCES ai_meetings(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL, -- 'ai' or 'user'
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audio_duration INTEGER, -- Duration in milliseconds if audio
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_meetings_user_id ON ai_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_meetings_lead_id ON ai_meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_meetings_meeting_id ON ai_meetings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_ai_meetings_status ON ai_meetings(status);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_ai_meeting_id ON conversation_messages(ai_meeting_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(timestamp);

-- Enable RLS
ALTER TABLE ai_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own AI meetings" ON ai_meetings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own conversation messages" ON conversation_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_meetings 
            WHERE ai_meetings.id = conversation_messages.ai_meeting_id 
            AND ai_meetings.user_id = auth.uid()
        )
    );

-- Create triggers for updated_at
CREATE TRIGGER update_ai_meetings_updated_at BEFORE UPDATE ON ai_meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add lead linking to existing meetings table (if not already present)
-- This ensures meetings can be linked to leads
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meetings' AND column_name = 'lead_id'
    ) THEN
        ALTER TABLE meetings ADD COLUMN lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL;
        CREATE INDEX idx_meetings_lead_id ON meetings(lead_id);
    END IF;
END $$;

-- Create function to update lead insights after AI meeting
CREATE OR REPLACE FUNCTION update_lead_from_ai_meeting()
RETURNS TRIGGER AS $$
BEGIN
    -- Update lead with AI insights when AI meeting is completed
    IF NEW.status = 'completed' AND NEW.ai_analysis IS NOT NULL THEN
        UPDATE leads 
        SET 
            notes = COALESCE(notes, '') || E'\n\n--- AI Meeting Insights ---\n' || 
                   COALESCE(NEW.ai_analysis->>'summary', 'AI analysis completed'),
            ai_insights = NEW.ai_analysis,
            lead_score = COALESCE((NEW.ai_analysis->>'lead_score')::integer, lead_score),
            status = CASE 
                WHEN NEW.ai_analysis->>'recommended_status' IS NOT NULL 
                THEN NEW.ai_analysis->>'recommended_status'
                ELSE status 
            END,
            updated_at = NOW()
        WHERE id = NEW.lead_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic lead updates
CREATE TRIGGER trigger_update_lead_from_ai_meeting
    AFTER UPDATE ON ai_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_from_ai_meeting();