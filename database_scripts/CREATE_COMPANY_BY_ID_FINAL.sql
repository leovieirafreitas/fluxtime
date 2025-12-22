-- ============================================
-- FUNÇÃO PARA BUSCAR EMPRESA POR ID OU SLUG
-- ============================================

-- Esta função busca empresa por ID (UUID)
DROP FUNCTION IF EXISTS get_public_company_data_by_id(uuid);
DROP FUNCTION IF EXISTS get_public_company_data_by_id(text);

CREATE OR REPLACE FUNCTION get_public_company_data_by_id(p_company_id text)
RETURNS TABLE (
    company_data jsonb,
    services_data jsonb,
    categories_data jsonb,
    business_hours_data jsonb
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_record record;
    v_uuid uuid;
BEGIN
    -- Validate/Cast UUID
    BEGIN
        v_uuid := p_company_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN; -- Invalid UUID, return empty
    END;

    SELECT * INTO v_company_record FROM companies WHERE id = v_uuid;
    
    IF v_company_record IS NULL THEN
        RETURN;
    END IF;

    company_data := to_jsonb(v_company_record);

    SELECT jsonb_agg(s.* ORDER BY s.name) INTO services_data
    FROM services s
    WHERE s.company_id = v_uuid AND s.active = true;

    SELECT jsonb_agg(c.* ORDER BY c.name) INTO categories_data
    FROM service_categories c
    WHERE c.company_id = v_uuid AND c.is_public = true;

    SELECT jsonb_agg(bh.* ORDER BY bh.day_of_week) INTO business_hours_data
    FROM business_hours bh
    WHERE bh.company_id = v_uuid;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_public_company_data_by_id TO anon, authenticated;
