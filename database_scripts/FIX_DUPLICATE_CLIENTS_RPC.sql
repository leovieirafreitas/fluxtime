CREATE OR REPLACE FUNCTION public_create_client(
    p_company_id uuid,
    p_name text,
    p_phone text,
    p_email text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    -- 1. Try to find existing client by phone in this company
    -- Checks for exact match OR match with/without '+' prefix to be robust
    SELECT id INTO v_id
    FROM clients
    WHERE company_id = p_company_id
    AND (
        phone = p_phone
        OR phone = '+55' || replace(replace(p_phone, '+', ''), '55', '')
        OR replace(phone, '+', '') = replace(p_phone, '+', '')
    )
    ORDER BY created_at ASC -- Return the oldest (original) record if duplicates exist
    LIMIT 1;

    -- 2. If found, return it
    IF v_id IS NOT NULL THEN
        -- Optional: Update name if provided and significantly different?
        -- For now, we trust the ID association is what matters most.
        RETURN v_id;
    END IF;

    -- 3. If not found, insert new
    INSERT INTO clients (company_id, name, phone, email)
    VALUES (p_company_id, p_name, p_phone, p_email)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public_create_client(uuid, text, text, text) TO anon, authenticated, service_role;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
