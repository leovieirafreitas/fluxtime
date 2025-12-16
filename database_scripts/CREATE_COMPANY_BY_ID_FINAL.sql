-- ============================================
-- FUNÇÃO PARA BUSCAR EMPRESA POR ID OU SLUG
-- ============================================

-- Esta função busca empresa por ID (UUID)
CREATE OR REPLACE FUNCTION get_public_company_data_by_id(p_company_id uuid)
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
BEGIN
    SELECT * INTO v_company_record FROM companies WHERE id = p_company_id;
    
    IF v_company_record IS NULL THEN
        RETURN;
    END IF;

    company_data := to_jsonb(v_company_record);

    SELECT jsonb_agg(s.* ORDER BY s.name) INTO services_data
    FROM services s
    WHERE s.company_id = p_company_id AND s.is_active = true;

    SELECT jsonb_agg(c.* ORDER BY c.name) INTO categories_data
    FROM service_categories c
    WHERE c.company_id = p_company_id AND c.is_public = true;

    SELECT jsonb_agg(bh.* ORDER BY bh.day_of_week) INTO business_hours_data
    FROM business_hours bh
    WHERE bh.company_id = p_company_id;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
