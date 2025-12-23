-- Function to fetch companies where the user is a client, independent of appointments
CREATE OR REPLACE FUNCTION fetch_client_companies_list(
    p_phone text DEFAULT NULL,
    p_email text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    name text,
    slug text,
    logo_url text,
    address text
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        c.id,
        c.name,
        c.id::text as slug,
        c.logo_url,
        c.address
    FROM clients cl
    JOIN companies c ON cl.company_id = c.id
    WHERE
        (p_phone IS NOT NULL AND (
            cl.phone = p_phone 
            OR cl.phone = '+55' || p_phone
            OR cl.phone = '55' || p_phone
            OR replace(replace(replace(replace(cl.phone, ' ', ''), '-', ''), '(', ''), ')', '') = replace(replace(replace(replace(p_phone, ' ', ''), '-', ''), '(', ''), ')', '')
        ))
        OR 
        (p_email IS NOT NULL AND cl.email = p_email);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION fetch_client_companies_list TO anon, authenticated;
