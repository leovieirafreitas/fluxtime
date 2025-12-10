-- ============================================
-- OPTIMIZE DASHBOARD PERFORMANCE
-- ============================================

-- 1. RE-ADD INDEXES FOR CLIENT DASHBOARD
-- ============================================
-- These were removed because they were "unused", but they are critical for the Client Dashboard lookups.
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone ON appointments(client_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_client_email ON appointments(client_email);

-- 2. ADD COMPOSITE INDEX FOR UPCOMING APPOINTMENTS
-- ============================================
-- Essential for: .eq('company_id', ...).gte('start_time', ...).order('start_time')
CREATE INDEX IF NOT EXISTS idx_appointments_company_start_time ON appointments(company_id, start_time);


-- 3. CREATE RPC FOR EFFICIENT INSIGHTS
-- ============================================
-- Calculates all dashboard stats in one go on the server side
-- Prevents fetching thousands of rows just to sum/count in JS

CREATE OR REPLACE FUNCTION get_dashboard_insights(p_company_id uuid)
RETURNS TABLE (
    total_appointments bigint,
    active_clients bigint,
    total_revenue numeric,
    pending_count bigint,
    confirmed_count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- 1. Appointments Stats
    appt_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
            COUNT(DISTINCT client_id) as unique_clients
        FROM appointments
        WHERE company_id = p_company_id
    ),
    -- 2. Revenue (Sum price of confirmed services)
    rev_stats AS (
        SELECT COALESCE(SUM(s.price), 0) as revenue
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.company_id = p_company_id
        AND a.status = 'confirmed'
    )
    SELECT 
        appt_stats.total,
        appt_stats.unique_clients,
        rev_stats.revenue,
        appt_stats.pending,
        appt_stats.confirmed
    FROM appt_stats, rev_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
