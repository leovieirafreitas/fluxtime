-- ============================================
-- FIX REVENUE CALCULATION (PAID ONLY)
-- ============================================

DROP FUNCTION IF EXISTS get_dashboard_insights(uuid);

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
    -- 2. Revenue (Sum TOTAL_AMOUNT of PAID appointments only)
    rev_stats AS (
        SELECT COALESCE(SUM(COALESCE(a.total_amount, s.price)), 0) as revenue
        FROM appointments a
        LEFT JOIN services s ON a.service_id = s.id
        WHERE a.company_id = p_company_id
        AND a.payment_status = 'paid'
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
