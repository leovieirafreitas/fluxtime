-- ============================================
-- EXECUTE ESTE SCRIPT AGORA NO SUPABASE SQL EDITOR
-- ============================================
-- Este script corrige:
-- 1. Função get_client_appointments (para mostrar agendamentos no dashboard do cliente)
-- 2. Função get_dashboard_insights (para calcular faturamento apenas com pagos)

-- PARTE 1: Atualizar função do dashboard do cliente
-- ============================================
DROP FUNCTION IF EXISTS get_client_appointments(text, text);

CREATE OR REPLACE FUNCTION get_client_appointments(
    p_phone text DEFAULT NULL,
    p_email text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    start_time timestamptz,
    end_time timestamptz,
    status text,
    payment_status text,
    service_name text,
    service_price numeric,
    service_duration int,
    company_id uuid,
    company_name text,
    company_slug text,
    company_logo_url text,
    company_address text,
    professional_name text,
    professional_avatar_url text,
    client_name text,
    client_phone text,
    client_email text
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.start_time,
        a.end_time,
        a.status::text,
        a.payment_status::text,
        s.name as service_name,
        COALESCE(a.total_amount, s.price) as service_price,
        s.duration_minutes as service_duration,
        c.id as company_id,
        c.name as company_name,
        c.slug as company_slug,
        c.logo_url as company_logo_url,
        c.address as company_address,
        p.full_name as professional_name,
        p.avatar_url as professional_avatar_url,
        a.client_name,
        a.client_phone,
        a.client_email
    FROM appointments a
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN companies c ON a.company_id = c.id
    LEFT JOIN profiles p ON a.professional_id = p.id
    WHERE 
        (p_phone IS NOT NULL AND (
            a.client_phone = p_phone 
            OR a.client_phone = '+55' || p_phone
            OR a.client_phone = '55' || p_phone
            OR replace(replace(replace(replace(a.client_phone, ' ', ''), '-', ''), '(', ''), ')', '') = replace(replace(replace(replace(p_phone, ' ', ''), '-', ''), '(', ''), ')', '')
        ))
        OR 
        (p_email IS NOT NULL AND a.client_email = p_email)
    ORDER BY a.start_time DESC;
END;
$$ LANGUAGE plpgsql;

-- PARTE 2: Atualizar função de insights (faturamento)
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
    appt_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
            COUNT(DISTINCT client_id) as unique_clients
        FROM appointments
        WHERE company_id = p_company_id
    ),
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

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Após executar este script:
-- 1. Os agendamentos voltarão a aparecer no dashboard do cliente
-- 2. O faturamento mostrará apenas valores de agendamentos pagos
-- 3. Recarregue a página do dashboard do cliente (F5)
