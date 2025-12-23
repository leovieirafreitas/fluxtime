-- Atualizar get_client_appointments para incluir total_amount separado de service_price
-- Isso permite que o cliente veja o preço original E o preço com desconto

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
    total_amount numeric,  -- Preço com desconto (se aplicado)
    remaining_amount numeric,
    discount numeric,
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
        s.price as service_price,  -- Preço original do serviço
        a.total_amount,  -- Preço final (com desconto se aplicado)
        a.remaining_amount,
        a.discount,
        s.duration_minutes as service_duration,
        c.id as company_id,
        c.name as company_name,
        c.id::text as company_slug,
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
            -- Direct matches
            a.client_phone = p_phone 
            OR a.client_phone = '+55' || p_phone
            OR a.client_phone = '55' || p_phone
            -- Regex clean match (entire string digits)
            OR regexp_replace(a.client_phone, '\D','','g') = regexp_replace(p_phone, '\D','','g')
            -- Suffix match (Last 11 digits - DDD + Number) - ignores country code differences
            OR RIGHT(regexp_replace(a.client_phone, '\D','','g'), 11) = RIGHT(regexp_replace(p_phone, '\D','','g'), 11)
            -- Suffix match (Last 9 digits - Number only) - loose match
             OR RIGHT(regexp_replace(a.client_phone, '\D','','g'), 9) = RIGHT(regexp_replace(p_phone, '\D','','g'), 9)
        ))
        OR 
        (p_email IS NOT NULL AND LOWER(a.client_email) = LOWER(p_email))
    ORDER BY a.start_time DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_client_appointments TO anon, authenticated;
```
