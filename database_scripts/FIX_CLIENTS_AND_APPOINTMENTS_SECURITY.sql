-- ============================================
-- FIX CLIENTS & APPOINTMENTS POLICIES (SECURITY)
-- ============================================

-- 1. UNIFY CLIENTS POLICIES
-- ============================================
-- Fix the "Multiple Permissive Policies" warning on clients table.
-- Strategy:
--   - Allow PUBLIC (anon) to INSERT (create booking profile).
--   - Allow PUBLIC (anon) to SELECT (verify if they exist by phone).
--   - Allow AUTHENTICATED (company users) to do everything on their clients.

DROP POLICY IF EXISTS "Public can view clients" ON clients;
DROP POLICY IF EXISTS "Users can view company clients" ON clients;
DROP POLICY IF EXISTS "Public can create clients" ON clients;
DROP POLICY IF EXISTS "Users can insert company clients" ON clients;
DROP POLICY IF EXISTS "Users can delete company clients" ON clients;
DROP POLICY IF EXISTS "Users can update company clients" ON clients;

-- Unified SELECT Policy
CREATE POLICY "Unified view policy for clients" ON clients
FOR SELECT USING (
    -- Public access implies we can read (for login check)
    -- Ideally, we'd restrict this to "only own phone", but we can't verify phone without auth.
    -- So we allow public read for now (as it was before), but cleaner.
    true
);

-- Unified INSERT Policy
CREATE POLICY "Unified insert policy for clients" ON clients
FOR INSERT WITH CHECK (
    -- Anyone can create a client row (booking flow)
    true
);

-- Authenticated Write Access (Update/Delete)
CREATE POLICY "Users can update company clients" ON clients
FOR UPDATE TO authenticated
USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = (SELECT auth.uid()))
);

CREATE POLICY "Users can delete company clients" ON clients
FOR DELETE TO authenticated
USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = (SELECT auth.uid()))
);

-- 2. SECURE APPOINTMENTS ACCESS (RPC ONLY FOR CLIENTS)
-- ============================================
-- The 'appointments' table must NOT be open to public SELECT.
-- We will replace public access with a SECURE RPC function.

-- a) Drop unsafe public policies
DROP POLICY IF EXISTS "Enable select for All" ON appointments;
DROP POLICY IF EXISTS "Public can view appointments" ON appointments;
DROP POLICY IF EXISTS "Read appointments" ON appointments;

-- b) Ensure Authenticated Company Users access remains
-- (Assuming "Users can view own company appointments" exists. If not, recreate it)
DROP POLICY IF EXISTS "Users can view own company appointments" ON appointments;

CREATE POLICY "Users can view own company appointments" ON appointments
FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = (SELECT auth.uid()))
);

-- c) Create Secure RPC for Client Dashboard
-- This function allows fetching appointments by phone/email without exposing the whole table.
CREATE OR REPLACE FUNCTION get_client_appointments(
    p_phone text DEFAULT NULL,
    p_email text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    start_time timestamptz,
    status text,
    client_name text,
    client_phone text,
    client_email text,
    service_name text,
    service_price numeric,
    company_name text
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.start_time,
        a.status::text,
        a.client_name,
        a.client_phone,
        a.client_email,
        s.name as service_name,
        s.price as service_price,
        c.name as company_name
    FROM appointments a
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN companies c ON a.company_id = c.id
    WHERE 
        (p_phone IS NOT NULL AND (
            a.client_phone = p_phone 
            OR a.client_phone = '+55' || p_phone
            OR a.client_phone = '55' || p_phone
            OR replace(replace(replace(replace(a.client_phone, ' ', ''), '-', ''), '(', ''), ')', '') = replace(replace(replace(replace(p_phone, ' ', ''), '-', ''), '(', ''), ')', '')
        ))
        OR 
        (p_email IS NOT NULL AND a.client_email = p_email)
    ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql;
