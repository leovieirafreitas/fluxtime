-- FIX CASE SENSITIVITY IN SLUG LOOKUP
CREATE OR REPLACE FUNCTION get_public_company_data(p_slug text)
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
    v_company_id uuid;
    v_company_record record;
BEGIN
    -- Case-insensitive match for slug
    SELECT * INTO v_company_record 
    FROM companies 
    WHERE lower(custom_link) = lower(p_slug);
    
    IF v_company_record IS NULL THEN
        RETURN;
    END IF;

    v_company_id := v_company_record.id;
    company_data := to_jsonb(v_company_record);

    -- Get Services
    SELECT jsonb_agg(s.* ORDER BY s.name) INTO services_data
    FROM services s
    WHERE s.company_id = v_company_id AND s.active = true;

    -- Get Categories
    SELECT jsonb_agg(c.* ORDER BY c.name) INTO categories_data
    FROM service_categories c
    WHERE c.company_id = v_company_id AND c.is_public = true;

    -- Get Business Hours
    SELECT jsonb_agg(bh.* ORDER BY bh.day_of_week) INTO business_hours_data
    FROM business_hours bh
    WHERE bh.company_id = v_company_id;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
