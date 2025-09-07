-- Complete AI Meeting System Migration
-- This migration adds all necessary tables and columns for the complete AI meeting flow

-- Add missing columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS budget_notes TEXT,
ADD COLUMN IF NOT EXISTS timeline_notes TEXT,
ADD COLUMN IF NOT EXISTS decision_maker_notes TEXT,
ADD COLUMN IF NOT EXISTS last_contact TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Create meeting_analyses table
CREATE TABLE IF NOT EXISTS meeting_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    transcript TEXT,
    lead_score_before INTEGER DEFAULT 0,
    lead_score_after INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversation_events table
CREATE TABLE IF NOT EXISTS conversation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
    speaker_type VARCHAR(20) NOT NULL CHECK (speaker_type IN ('human', 'ai')),
    speaker_id VARCHAR(255),
    message_text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to scheduled_meetings table
ALTER TABLE scheduled_meetings 
ADD COLUMN IF NOT EXISTS ai_joined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meeting_analyses_meeting_id ON meeting_analyses(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_analyses_lead_id ON meeting_analyses(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversation_events_meeting_id ON conversation_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_conversation_events_timestamp ON conversation_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_notifications_meeting_id ON email_notifications(meeting_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON leads(last_contact);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);

-- Add RLS policies for new tables
ALTER TABLE meeting_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_analyses
CREATE POLICY "Users can view their own meeting analyses" ON meeting_analyses
    FOR SELECT USING (
        meeting_id IN (
            SELECT id FROM scheduled_meetings WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert their own meeting analyses" ON meeting_analyses
    FOR INSERT WITH CHECK (
        meeting_id IN (
            SELECT id FROM scheduled_meetings WHERE user_id = auth.uid()::text
        )
    );

-- RLS policies for conversation_events
CREATE POLICY "Users can view their own conversation events" ON conversation_events
    FOR SELECT USING (
        meeting_id IN (
            SELECT id FROM scheduled_meetings WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert their own conversation events" ON conversation_events
    FOR INSERT WITH CHECK (
        meeting_id IN (
            SELECT id FROM scheduled_meetings WHERE user_id = auth.uid()::text
        )
    );

-- RLS policies for email_notifications
CREATE POLICY "Users can view their own email notifications" ON email_notifications
    FOR SELECT USING (
        meeting_id IN (
            SELECT id FROM scheduled_meetings WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert their own email notifications" ON email_notifications
    FOR INSERT WITH CHECK (
        meeting_id IN (
            SELECT id FROM scheduled_meetings WHERE user_id = auth.uid()::text
        )
    );

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meeting_analyses_updated_at 
    BEFORE UPDATE ON meeting_analyses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default question set for existing users who don't have one
INSERT INTO question_sets (user_id, name, description, is_default, question_count)
SELECT 
    p.id,
    'Default Discovery Questions',
    'Standard discovery questions for lead qualification',
    true,
    7
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM question_sets qs WHERE qs.user_id = p.id AND qs.is_default = true
);

-- Insert default questions for the newly created question sets
WITH default_questions AS (
    SELECT unnest(ARRAY[
        'Can you tell me about your company and what you do?',
        'What are the main challenges you''re facing in your business right now?',
        'How are you currently handling these challenges?',
        'What would an ideal solution look like for you?',
        'What''s your timeline for making a decision on this?',
        'Who else would be involved in the decision-making process?',
        'What budget range are you working with for this project?'
    ]) as question_text,
    generate_series(1, 7) as order_index
),
new_question_sets AS (
    SELECT id as question_set_id
    FROM question_sets 
    WHERE name = 'Default Discovery Questions' 
    AND is_default = true
    AND NOT EXISTS (
        SELECT 1 FROM questions q WHERE q.question_set_id = question_sets.id
    )
)
INSERT INTO questions (question_set_id, question_text, order_index, is_required)
SELECT 
    nqs.question_set_id,
    dq.question_text,
    dq.order_index,
    true
FROM new_question_sets nqs
CROSS JOIN default_questions dq;

COMMENT ON TABLE meeting_analyses IS 'Stores AI analysis results for completed meetings';
COMMENT ON TABLE conversation_events IS 'Stores individual conversation messages during meetings';
COMMENT ON TABLE email_notifications IS 'Tracks email notifications sent to users';