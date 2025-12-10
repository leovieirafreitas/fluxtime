-- 1. Update the missing custom_link for 'Barbeshop' to make it accessible
UPDATE companies 
SET custom_link = 'barbeshop' 
WHERE name = 'Barbeshop' AND custom_link IS NULL;

-- 2. Update public_check_client to be scoped by company_id
-- This ensures we only return a client if they are registered for THIS specific company.
-- This allows the same phone number to be registered across multiple companies (separate client records).
CREATE OR REPLACE FUNCTION public_check_client(p_phone text, p_company_id uuid)
RETURNS TABLE (id uuid, name text, email text, phone text)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.email, c.phone
    FROM clients c
    WHERE c.company_id = p_company_id
      AND (
           c.phone = p_phone
           OR c.phone = '+55' || p_phone
           OR c.phone = '55' || p_phone
           OR ('+55' || c.phone) = p_phone -- Handle case where DB has local and input is +55
          )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
