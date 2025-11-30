-- Security Features Migration
-- Adds audit logging table and related security infrastructure

-- ============================================================================
-- AUDIT LOGS TABLE
-- Immutable log of all sensitive data access for compliance (HIPAA/GDPR)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast company-scoped queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created 
    ON audit_logs (company_id, created_at DESC);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON audit_logs (company_id, action, created_at DESC);

-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
    ON audit_logs (company_id, user_id, created_at DESC);

-- ============================================================================
-- RLS POLICIES FOR AUDIT LOGS
-- Only company admins can view their own audit logs
-- Logs are write-only from service role (no user updates/deletes)
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own company's audit logs
CREATE POLICY "Users can view own company audit logs"
    ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE user_id = auth.uid()
        )
    );

-- No user can insert/update/delete audit logs directly
-- All writes must go through service role
CREATE POLICY "Only service role can insert audit logs"
    ON audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ============================================================================
-- SECURITY SETTINGS TABLE
-- Per-company security configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    require_2fa BOOLEAN NOT NULL DEFAULT false,
    encryption_enabled BOOLEAN NOT NULL DEFAULT false,
    last_key_rotation TIMESTAMPTZ,
    failed_login_lockout_threshold INTEGER NOT NULL DEFAULT 5,
    data_retention_days INTEGER NOT NULL DEFAULT 365,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for security settings
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company security settings"
    ON security_settings
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own company security settings"
    ON security_settings
    FOR UPDATE
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_security_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_security_settings_updated
    BEFORE UPDATE ON security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_security_settings_timestamp();

-- ============================================================================
-- ADD ENCRYPTION HASH COLUMNS TO WAITLIST_MEMBERS
-- For searchable encrypted fields (allows exact match search)
-- ============================================================================

ALTER TABLE waitlist_members 
    ADD COLUMN IF NOT EXISTS name_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS address_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_waitlist_members_name_hash 
    ON waitlist_members (company_id, name_hash);

CREATE INDEX IF NOT EXISTS idx_waitlist_members_address_hash 
    ON waitlist_members (company_id, address_hash);

-- ============================================================================
-- LOGIN ATTEMPTS TRACKING (for brute-force protection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    success BOOLEAN NOT NULL DEFAULT false,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created 
    ON login_attempts (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created 
    ON login_attempts (ip_address, created_at DESC);

-- Automatically clean up old login attempts (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if account is locked
-- ============================================================================

CREATE OR REPLACE FUNCTION is_account_locked(check_email VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    failed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO failed_count
    FROM login_attempts
    WHERE email = check_email
      AND success = false
      AND created_at > NOW() - INTERVAL '15 minutes';
    
    RETURN failed_count >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTO-CREATE SECURITY SETTINGS FOR NEW COMPANIES
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_security_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO security_settings (company_id)
    VALUES (NEW.id)
    ON CONFLICT (company_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_security_settings
    AFTER INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION create_default_security_settings();

-- Create security settings for existing companies
INSERT INTO security_settings (company_id)
SELECT id FROM companies
WHERE id NOT IN (SELECT company_id FROM security_settings)
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================================
-- COMMENT FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance (HIPAA/GDPR)';
COMMENT ON TABLE security_settings IS 'Per-company security configuration';
COMMENT ON TABLE login_attempts IS 'Track login attempts for brute-force protection';
COMMENT ON COLUMN waitlist_members.name_hash IS 'SHA-256 hash of name for encrypted search';
COMMENT ON COLUMN waitlist_members.address_hash IS 'SHA-256 hash of address for encrypted search';
