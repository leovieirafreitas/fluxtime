-- Add remaining_amount to the return table of get_client_appointments function
-- This allows the client dashboard to see if there is a partial payment remaining

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
    remaining_amount numeric, -- Added this field
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
        COALESCE(a.payment_status, 'unpaid')::text,
        s.name as service_name,
        COALESCE(a.total_amount, s.price) as service_price,
        a.remaining_amount, -- Return the remaining amount
        s.duration_minutes as service_duration,
        c.id as company_id,
        c.name as company_name,
        c.id::text as company_slug, -- Fallback to ID as slug does not exist
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

GRANT EXECUTE ON FUNCTION get_client_appointments TO anon, authenticated;
