-- Create RPC to get all companies a client is registered with
CREATE OR REPLACE FUNCTION get_client_companies(
    p_phone text
)
RETURNS TABLE (
    name text,
    slug text,
    logo_url text,
    member_since timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (comp.id)
        comp.name,
        comp.custom_link as slug,
        comp.logo_url,
        c.created_at as member_since
    FROM clients c
    JOIN companies comp ON c.company_id = comp.id
    WHERE 
        c.phone = p_phone 
        OR c.phone = '+55' || p_phone
        OR c.phone = '55' || p_phone
        OR replace(replace(replace(replace(c.phone, ' ', ''), '-', ''), '(', ''), ')', '') = replace(replace(replace(replace(p_phone, ' ', ''), '-', ''), '(', ''), ')', '')
    ORDER BY comp.id, c.created_at DESC; -- Prefer most recent client record if duplicates exist for same company
END;
$$ LANGUAGE plpgsql;
