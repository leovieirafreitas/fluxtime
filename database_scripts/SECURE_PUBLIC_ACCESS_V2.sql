-- ============================================
-- SECURE PUBLIC ACCESS ARCHITECTURE (RPCs) v2 - Fix Policy Conflicts
-- ============================================

-- 1. GET PUBLIC COMPANY DATA
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
    SELECT * INTO v_company_record FROM companies WHERE custom_link = p_slug;
    
    IF v_company_record IS NULL THEN
        RETURN;
    END IF;

    v_company_id := v_company_record.id;
    company_data := to_jsonb(v_company_record);

    SELECT jsonb_agg(s.* ORDER BY s.name) INTO services_data
    FROM services s
    WHERE s.company_id = v_company_id AND s.active = true;

    SELECT jsonb_agg(c.* ORDER BY c.name) INTO categories_data
    FROM service_categories c
    WHERE c.company_id = v_company_id AND c.is_public = true;

    SELECT jsonb_agg(bh.* ORDER BY bh.day_of_week) INTO business_hours_data
    FROM business_hours bh
    WHERE bh.company_id = v_company_id;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;


-- 2. GET BUSY SLOTS
CREATE OR REPLACE FUNCTION get_busy_slots(
    p_company_id uuid,
    p_date text,
    p_professional_id uuid DEFAULT NULL
)
RETURNS TABLE (
    start_time timestamptz,
    end_time timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT a.start_time, a.end_time
    FROM appointments a
    WHERE a.company_id = p_company_id
    AND a.status != 'cancelled'
    AND a.start_time >= (p_date::date)::timestamp AT TIME ZONE 'UTC'
    AND a.start_time < ((p_date::date + 1)::timestamp AT TIME ZONE 'UTC')
    AND (p_professional_id IS NULL OR a.professional_id = p_professional_id);
END;
$$ LANGUAGE plpgsql;


-- 3. GET SERVICE COLLABORATORS
CREATE OR REPLACE FUNCTION get_public_service_collaborators(p_service_id uuid)
RETURNS TABLE (
    id uuid,
    full_name text,
    avatar_url text
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.full_name, p.avatar_url
    FROM service_collaborators sc
    JOIN profiles p ON sc.profile_id = p.id
    WHERE sc.service_id = p_service_id;
END;
$$ LANGUAGE plpgsql;


-- 4. PUBLIC CLIENT ACTIONS
CREATE OR REPLACE FUNCTION public_check_client(p_phone text)
RETURNS TABLE (id uuid, name text, email text, phone text)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.email, c.phone
    FROM clients c
    WHERE c.phone = p_phone
       OR c.phone = '+55' || p_phone
       OR c.phone = '55' || p_phone
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

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
    INSERT INTO clients (company_id, name, phone, email)
    VALUES (p_company_id, p_name, p_phone, p_email)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;


-- 5. PUBLIC CREATE APPOINTMENT
CREATE OR REPLACE FUNCTION public_create_appointment(
    p_company_id uuid,
    p_client_id uuid,
    p_service_id uuid,
    p_professional_id uuid,
    p_start_time timestamptz,
    p_end_time timestamptz,
    p_client_name text,
    p_client_phone text,
    p_client_email text,
    p_notes text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO appointments (
        company_id, client_id, service_id, professional_id, 
        start_time, end_time, status, 
        client_name, client_phone, client_email, notes
    )
    VALUES (
        p_company_id, p_client_id, p_service_id, p_professional_id, 
        p_start_time, p_end_time, 'confirmed', 
        p_client_name, p_client_phone, p_client_email, p_notes
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- SECURE THE DATABASE: REVOKE PUBLIC ACCESS
-- ============================================

-- Companies
DROP POLICY IF EXISTS "Public can view companies" ON companies;

-- Services
DROP POLICY IF EXISTS "Unified view policy for services" ON services;
DROP POLICY IF EXISTS "Public can view active services" ON services;
DROP POLICY IF EXISTS "Users can view own company services" ON services; -- Re-create below

-- Service Categories
DROP POLICY IF EXISTS "Public can view service categories" ON service_categories;
DROP POLICY IF EXISTS "Users can view own company categories" ON service_categories; -- Re-create below

-- Service Collaborators
DROP POLICY IF EXISTS "Public can view service collaborators" ON service_collaborators;

-- Business Hours
DROP POLICY IF EXISTS "Permitir leitura publica de horarios" ON business_hours;
DROP POLICY IF EXISTS "Users can view own company hours" ON business_hours; -- Re-create below

-- Profiles (Public view of professionals)
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;

-- Clients
DROP POLICY IF EXISTS "Unified view policy for clients" ON clients;
DROP POLICY IF EXISTS "Unified insert policy for clients" ON clients;
DROP POLICY IF EXISTS "Users can view own company clients" ON clients; -- Re-create below

-- Appointments
DROP POLICY IF EXISTS "Enable select for All" ON appointments;

-- ============================================
-- RESTORE AUTHENTICATED ACCESS
-- ============================================

-- Services
CREATE POLICY "Users can view own company services" ON services FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Categories
CREATE POLICY "Users can view own company categories" ON service_categories FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Business Hours
CREATE POLICY "Users can view own company hours" ON business_hours FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Clients
CREATE POLICY "Users can view own company clients" ON clients FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
