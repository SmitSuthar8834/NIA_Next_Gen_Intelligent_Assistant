-- Fix meetings table to ensure duration field exists
-- This addresses the issue where duration column is missing from meetings table

-- Add duration column if it doesn't exist
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add comment for clarity
COMMENT ON COLUMN meetings.duration IS 'Meeting duration in minutes';