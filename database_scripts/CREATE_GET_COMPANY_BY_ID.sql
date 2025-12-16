-- ============================================
-- CRIAR FUNÇÃO PARA BUSCAR EMPRESA POR ID
-- ============================================
-- Esta função permite que a página pública busque empresa por ID (UUID)
-- ao invés de apenas por slug, permitindo links diretos do tipo /book/{company_id}

CREATE OR REPLACE FUNCTION get_public_company_data_by_id(p_company_id uuid)
RETURNS TABLE (
    company_data jsonb,
    services_data jsonb,
    categories_data jsonb,
    business_hours_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(c.*) as company_data,
        COALESCE(
            (SELECT jsonb_agg(to_jsonb(s.*))
             FROM services s
             WHERE s.company_id = p_company_id AND s.is_active = true),
            '[]'::jsonb
        ) as services_data,
        COALESCE(
            (SELECT jsonb_agg(to_jsonb(cat.*))
             FROM service_categories cat
             WHERE cat.company_id = p_company_id AND cat.is_public = true),
            '[]'::jsonb
        ) as categories_data,
        COALESCE(
            (SELECT jsonb_agg(to_jsonb(bh.*))
             FROM business_hours bh
             WHERE bh.company_id = p_company_id),
            '[]'::jsonb
        ) as business_hours_data
    FROM companies c
    WHERE c.id = p_company_id;
END;
$$;
