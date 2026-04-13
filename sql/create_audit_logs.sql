-- ============================================
-- Audit Logs Table for Service Hub
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    user_name TEXT DEFAULT 'unknown',
    user_role TEXT DEFAULT 'unknown',
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_name ON audit_logs(user_name);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (anon key)
CREATE POLICY "Allow all for anon" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Optional: Auto-delete logs older than 90 days (uncomment if needed)
-- CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$
-- BEGIN
--     DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- Enable realtime for audit_logs (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
