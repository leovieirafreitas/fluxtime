-- RPC to find client details globally by phone (for auto-filling new company registration)
CREATE OR REPLACE FUNCTION public_get_global_client_info(p_phone text)
RETURNS TABLE (name text, email text)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT c.name, c.email
    FROM clients c
    WHERE (
           c.phone = p_phone
           OR c.phone = '+55' || p_phone
           OR c.phone = '55' || p_phone
           OR ('+55' || c.phone) = p_phone
          )
    ORDER BY c.created_at DESC -- Get the most recent info if multiple exist
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
