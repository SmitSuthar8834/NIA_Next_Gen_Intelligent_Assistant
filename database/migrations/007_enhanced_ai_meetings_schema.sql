-- Enhanced AI Meeting System Database Schema
-- This migration adds support for scheduled AI meetings, question management,
-- multi-user participation, and email notifications

-- Create scheduled_meetings table with timezone support and meeting room management
CREATE TABLE IF NOT EXISTS scheduled_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    meeting_room_id VARCHAR(255) UNIQUE NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    question_set_id UUID, -- Will reference question_sets table
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, active, completed, cancelled
    meeting_type VARCHAR(50) DEFAULT 'ai_discovery',
    max_participants INTEGER DEFAULT 10,
    recording_enabled BOOLEAN DEFAULT true,
    transcript_enabled BOOLEAN DEFAULT true,
    email_notifications_enabled BOOLEAN DEFAULT true,
    ai_joined_at TIMESTAMP WITH TIME ZONE,
    participants_joined INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question_sets table for customizable question management
CREATE TABLE IF NOT EXISTS question_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table for individual questions within sets
CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'open_ended', -- open_ended, multiple_choice, rating
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting_participants table for multi-user tracking
CREATE TABLE IF NOT EXISTS meeting_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_type VARCHAR(50) DEFAULT 'human', -- human, ai
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    audio_enabled BOOLEAN DEFAULT true,
    is_organizer BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_notifications table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- invitation, reminder, ai_joined, summary
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, bounced
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_events table for real-time conversation tracking
CREATE TABLE IF NOT EXISTS conversation_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
    speaker_type VARCHAR(50) NOT NULL, -- ai, human
    speaker_id UUID, -- user_id for humans, null for AI
    message_text TEXT NOT NULL,
    audio_duration_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence_score FLOAT,
    processed BOOLEAN DEFAULT false
);

-- Create meeting_analyses table for storing AI analysis results
CREATE TABLE IF NOT EXISTS meeting_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    lead_score_before INTEGER,
    lead_score_after INTEGER,
    status_changed_from VARCHAR(50),
    status_changed_to VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting_recordings table for recording management
CREATE TABLE IF NOT EXISTS meeting_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    transcript TEXT,
    transcript_confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key constraint for question_set_id in scheduled_meetings
ALTER TABLE scheduled_meetings 
ADD CONSTRAINT fk_scheduled_meetings_question_set 
FOREIGN KEY (question_set_id) REFERENCES question_sets(id) ON DELETE SET NULL;

-- Update existing ai_meetings table to support scheduled meetings
ALTER TABLE ai_meetings ADD COLUMN IF NOT EXISTS scheduled_meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE SET NULL;
ALTER TABLE ai_meetings ADD COLUMN IF NOT EXISTS meeting_room_id VARCHAR(255);
ALTER TABLE ai_meetings ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE;

-- Create database indexes for optimal query performance

-- Indexes for scheduled_meetings
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_user_id ON scheduled_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_lead_id ON scheduled_meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_room_id ON scheduled_meetings(meeting_room_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_scheduled_time ON scheduled_meetings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_status ON scheduled_meetings(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_question_set ON scheduled_meetings(question_set_id);

-- Indexes for question_sets
CREATE INDEX IF NOT EXISTS idx_question_sets_user_id ON question_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_question_sets_is_default ON question_sets(is_default);

-- Indexes for questions
CREATE INDEX IF NOT EXISTS idx_questions_question_set_id ON questions(question_set_id);
CREATE INDEX IF NOT EXISTS idx_questions_order_index ON questions(question_set_id, order_index);
CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);

-- Indexes for meeting_participants
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_type ON meeting_participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_joined_at ON meeting_participants(joined_at);

-- Indexes for email_notifications
CREATE INDEX IF NOT EXISTS idx_email_notifications_meeting_id ON email_notifications(meeting_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at ON email_notifications(sent_at);

-- Indexes for conversation_events
CREATE INDEX IF NOT EXISTS idx_conversation_events_meeting_id ON conversation_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_conversation_events_timestamp ON conversation_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversation_events_speaker_type ON conversation_events(speaker_type);
CREATE INDEX IF NOT EXISTS idx_conversation_events_processed ON conversation_events(processed);

-- Indexes for meeting_analyses
CREATE INDEX IF NOT EXISTS idx_meeting_analyses_meeting_id ON meeting_analyses(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_analyses_lead_id ON meeting_analyses(lead_id);
CREATE INDEX IF NOT EXISTS idx_meeting_analyses_created_at ON meeting_analyses(created_at);

-- Indexes for meeting_recordings
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_expires_at ON meeting_recordings(expires_at);

-- Indexes for updated ai_meetings table
CREATE INDEX IF NOT EXISTS idx_ai_meetings_scheduled_meeting_id ON ai_meetings(scheduled_meeting_id);
CREATE INDEX IF NOT EXISTS idx_ai_meetings_room_id ON ai_meetings(meeting_room_id);
CREATE INDEX IF NOT EXISTS idx_ai_meetings_scheduled_time ON ai_meetings(scheduled_time);

-- Enable Row Level Security (RLS) for all new tables
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scheduled_meetings
CREATE POLICY "Users can only access their own scheduled meetings" ON scheduled_meetings
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for question_sets
CREATE POLICY "Users can only access their own question sets" ON question_sets
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for questions
CREATE POLICY "Users can only access questions from their question sets" ON questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM question_sets 
            WHERE question_sets.id = questions.question_set_id 
            AND question_sets.user_id = auth.uid()
        )
    );

-- Create RLS policies for meeting_participants
CREATE POLICY "Users can only access participants from their meetings" ON meeting_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM scheduled_meetings 
            WHERE scheduled_meetings.id = meeting_participants.meeting_id 
            AND scheduled_meetings.user_id = auth.uid()
        )
        OR auth.uid() = meeting_participants.user_id
    );

-- Create RLS policies for email_notifications
CREATE POLICY "Users can only access notifications from their meetings" ON email_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM scheduled_meetings 
            WHERE scheduled_meetings.id = email_notifications.meeting_id 
            AND scheduled_meetings.user_id = auth.uid()
        )
    );

-- Create RLS policies for conversation_events
CREATE POLICY "Users can only access events from their meetings" ON conversation_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM scheduled_meetings 
            WHERE scheduled_meetings.id = conversation_events.meeting_id 
            AND scheduled_meetings.user_id = auth.uid()
        )
    );

-- Create RLS policies for meeting_analyses
CREATE POLICY "Users can only access analyses from their meetings" ON meeting_analyses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM scheduled_meetings 
            WHERE scheduled_meetings.id = meeting_analyses.meeting_id 
            AND scheduled_meetings.user_id = auth.uid()
        )
    );

-- Create RLS policies for meeting_recordings
CREATE POLICY "Users can only access recordings from their meetings" ON meeting_recordings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM scheduled_meetings 
            WHERE scheduled_meetings.id = meeting_recordings.meeting_id 
            AND scheduled_meetings.user_id = auth.uid()
        )
    );

-- Create triggers for updated_at columns
CREATE TRIGGER update_scheduled_meetings_updated_at BEFORE UPDATE ON scheduled_meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_sets_updated_at BEFORE UPDATE ON question_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_notifications_updated_at BEFORE UPDATE ON email_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate unique meeting room IDs
CREATE OR REPLACE FUNCTION generate_meeting_room_id()
RETURNS TEXT AS $
DECLARE
    room_id TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate a random 8-character alphanumeric string
        room_id := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
        
        -- Check if this room_id already exists
        IF NOT EXISTS (SELECT 1 FROM scheduled_meetings WHERE meeting_room_id = room_id) THEN
            RETURN room_id;
        END IF;
        
        counter := counter + 1;
        -- Prevent infinite loop
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique meeting room ID after 100 attempts';
        END IF;
    END LOOP;
END;
$ LANGUAGE plpgsql;

-- Create function to automatically set meeting room ID if not provided
CREATE OR REPLACE FUNCTION set_meeting_room_id()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.meeting_room_id IS NULL OR NEW.meeting_room_id = '' THEN
        NEW.meeting_room_id := generate_meeting_room_id();
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger to auto-generate meeting room ID
CREATE TRIGGER trigger_set_meeting_room_id
    BEFORE INSERT ON scheduled_meetings
    FOR EACH ROW
    EXECUTE FUNCTION set_meeting_room_id();

-- Create function to update meeting participant count
CREATE OR REPLACE FUNCTION update_meeting_participant_count()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' AND NEW.joined_at IS NOT NULL THEN
        -- Participant joined
        UPDATE scheduled_meetings 
        SET participants_joined = participants_joined + 1
        WHERE id = NEW.meeting_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.joined_at IS NULL AND NEW.joined_at IS NOT NULL THEN
        -- Participant joined (updated from null to timestamp)
        UPDATE scheduled_meetings 
        SET participants_joined = participants_joined + 1
        WHERE id = NEW.meeting_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.joined_at IS NOT NULL AND NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
        -- Participant left (left_at updated from null to timestamp)
        UPDATE scheduled_meetings 
        SET participants_joined = participants_joined - 1
        WHERE id = NEW.meeting_id AND participants_joined > 0;
    ELSIF TG_OP = 'DELETE' AND OLD.joined_at IS NOT NULL AND OLD.left_at IS NULL THEN
        -- Participant record deleted while still in meeting
        UPDATE scheduled_meetings 
        SET participants_joined = participants_joined - 1
        WHERE id = OLD.meeting_id AND participants_joined > 0;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$ LANGUAGE plpgsql;

-- Create trigger to automatically update participant count
CREATE TRIGGER trigger_update_meeting_participant_count
    AFTER INSERT OR UPDATE OR DELETE ON meeting_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_participant_count();

-- Create function to clean up expired recordings
CREATE OR REPLACE FUNCTION cleanup_expired_recordings()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM meeting_recordings 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- Insert default question set for new users
INSERT INTO question_sets (name, description, is_default) VALUES 
('Default Discovery Questions', 'Standard set of discovery questions for sales meetings', true)
ON CONFLICT DO NOTHING;

-- Get the default question set ID and insert default questions
DO $
DECLARE
    default_set_id UUID;
BEGIN
    SELECT id INTO default_set_id FROM question_sets WHERE is_default = true LIMIT 1;
    
    IF default_set_id IS NOT NULL THEN
        INSERT INTO questions (question_set_id, question_text, order_index) VALUES
        (default_set_id, 'Can you tell me about your current challenges with [relevant area]?', 1),
        (default_set_id, 'What solutions have you tried in the past?', 2),
        (default_set_id, 'What would an ideal solution look like for you?', 3),
        (default_set_id, 'What is your timeline for implementing a solution?', 4),
        (default_set_id, 'Who else would be involved in the decision-making process?', 5),
        (default_set_id, 'What budget range are you working with?', 6)
        ON CONFLICT DO NOTHING;
    END IF;
END $;

-- Add comments for documentation
COMMENT ON TABLE scheduled_meetings IS 'Stores scheduled AI meetings with timezone support and room management';
COMMENT ON TABLE question_sets IS 'Customizable question sets for AI meetings';
COMMENT ON TABLE questions IS 'Individual questions within question sets';
COMMENT ON TABLE meeting_participants IS 'Tracks participants in multi-user meetings';
COMMENT ON TABLE email_notifications IS 'Tracks email notifications sent for meetings';
COMMENT ON TABLE conversation_events IS 'Real-time conversation events during meetings';
COMMENT ON TABLE meeting_analyses IS 'AI analysis results from completed meetings';
COMMENT ON TABLE meeting_recordings IS 'Meeting recordings and transcripts with expiration';

COMMENT ON COLUMN scheduled_meetings.meeting_room_id IS 'Unique identifier for WebRTC meeting room';
COMMENT ON COLUMN scheduled_meetings.scheduled_time IS 'Meeting start time with timezone support';
COMMENT ON COLUMN scheduled_meetings.duration_minutes IS 'Expected meeting duration in minutes';
COMMENT ON COLUMN scheduled_meetings.status IS 'Meeting status: scheduled, active, completed, cancelled';
COMMENT ON COLUMN questions.order_index IS 'Order of questions within the set';
COMMENT ON COLUMN meeting_participants.participant_type IS 'Type of participant: human or ai';
COMMENT ON COLUMN email_notifications.notification_type IS 'Type: invitation, reminder, ai_joined, summary';