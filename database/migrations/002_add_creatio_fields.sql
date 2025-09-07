-- Add additional Creatio fields to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_name TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commentary TEXT,
ADD COLUMN IF NOT EXISTS creatio_created_on TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS creatio_modified_on TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_id TEXT,
ADD COLUMN IF NOT EXISTS qualify_status_id TEXT;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_leads_lead_name ON leads(lead_name);
CREATE INDEX IF NOT EXISTS idx_leads_contact_name ON leads(contact_name);
CREATE INDEX IF NOT EXISTS idx_leads_status_id ON leads(status_id);
CREATE INDEX IF NOT EXISTS idx_leads_qualify_status_id ON leads(qualify_status_id);