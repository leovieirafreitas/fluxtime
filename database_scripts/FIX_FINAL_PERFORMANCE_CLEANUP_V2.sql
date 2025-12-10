-- ============================================
-- FIX FINAL PERFORMANCE CLEANUP V2
-- ============================================

-- 1. CORRIGIR POLICY UNIFICADA DE SERVICES (Auth RLS Init Plan)
-- ============================================
DROP POLICY IF EXISTS "Unified view policy for services" ON services;

CREATE POLICY "Unified view policy for services" ON services
FOR SELECT USING (
  (active = true) 
  OR 
  (
    (SELECT auth.role()) = 'authenticated' AND 
    company_id IN (
        SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  )
);

-- 2. UNIFICAR POLICIES DE SERVICE_CATEGORIES
-- ============================================
-- Estratégia: Transformar policies 'ALL' em Insert/Update/Delete para evitar duplicação no SELECT com a policy pública.

DROP POLICY IF EXISTS "Public can view service categories" ON service_categories;
DROP POLICY IF EXISTS "Users can view their company service categories" ON service_categories;
DROP POLICY IF EXISTS "Users can manage their company service categories" ON service_categories;

-- Create separated Write policies (Manage)
CREATE POLICY "Users can insert their company service categories" ON service_categories
    FOR INSERT WITH CHECK (
        company_id IN (SELECT company_id FROM profiles WHERE id = (SELECT auth.uid()))
    );

CREATE POLICY "Users can update their company service categories" ON service_categories
    FOR UPDATE USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = (SELECT auth.uid()))
    );

CREATE POLICY "Users can delete their company service categories" ON service_categories
    FOR DELETE USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = (SELECT auth.uid()))
    );

-- Create Single Read Policy (Public)
CREATE POLICY "Public can view service categories" ON service_categories
    FOR SELECT USING (true);


-- 3. UNIFICAR POLICIES DE SERVICE_COLLABORATORS
-- ============================================

DROP POLICY IF EXISTS "Public can view service collaborators" ON service_collaborators;
DROP POLICY IF EXISTS "Users can view their company service collaborators" ON service_collaborators;
DROP POLICY IF EXISTS "Users can manage their company service collaborators" ON service_collaborators;

-- Write policies
CREATE POLICY "Users can insert collaborators" ON service_collaborators
    FOR INSERT WITH CHECK (
        service_id IN (
            SELECT id FROM services WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "Users can update collaborators" ON service_collaborators
    FOR UPDATE USING (
        service_id IN (
            SELECT id FROM services WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "Users can delete collaborators" ON service_collaborators
    FOR DELETE USING (
        service_id IN (
            SELECT id FROM services WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
            )
        )
    );

-- Read policy (Public)
CREATE POLICY "Public can view service collaborators" ON service_collaborators
    FOR SELECT USING (true);


-- 4. REMOVER ÍNDICES NÃO USADOS (Restantes)
-- ============================================
DROP INDEX IF EXISTS idx_appointments_status;
DROP INDEX IF EXISTS idx_appointments_company_status;
