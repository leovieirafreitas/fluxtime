-- ============================================
-- CORREÇÃO DO CÁLCULO DE FATURAMENTO (DASHBOARD)
-- ============================================
-- REGRA: Se está PAGO, conta no faturamento, mesmo se cancelado.

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
    appt_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE status != 'cancelled') as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
            COUNT(DISTINCT client_id) FILTER (WHERE status != 'cancelled') as unique_clients
        FROM appointments
        WHERE company_id = p_company_id
    ),
    rev_stats AS (
        SELECT COALESCE(SUM(COALESCE(a.total_amount, s.price)), 0) as revenue
        FROM appointments a
        LEFT JOIN services s ON a.service_id = s.id
        WHERE a.company_id = p_company_id
        AND a.payment_status = 'paid'
        -- REMOVIDO: AND a.status != 'cancelled' 
        -- (Agora somamos mesmo se estiver cancelado, pois o dinheiro entrou)
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
