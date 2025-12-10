-- ============================================
-- FIX ALL PERFORMANCE ISSUES
-- ============================================
-- Este script corrige TODOS os problemas de performance detectados pelo Supabase Advisor
-- Execute este script no SQL Editor do Supabase Dashboard

-- ============================================
-- PARTE 1: Corrigir RLS Policies (auth_rls_initplan)
-- ============================================
-- Problema: auth.uid() está sendo reavaliado para cada linha
-- Solução: Usar (SELECT auth.uid()) para avaliar apenas uma vez

-- CLIENTS
DROP POLICY IF EXISTS "Users can view company clients" ON clients;
CREATE POLICY "Users can view company clients" ON clients
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert company clients" ON clients;
CREATE POLICY "Users can insert company clients" ON clients
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update company clients" ON clients;
CREATE POLICY "Users can update company clients" ON clients
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete company clients" ON clients;
CREATE POLICY "Users can delete company clients" ON clients
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = (SELECT auth.uid()));

-- COMPANIES
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own company" ON companies;
CREATE POLICY "Users can update own company" ON companies
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

-- BUSINESS_HOURS
DROP POLICY IF EXISTS "Users can view own company hours" ON business_hours;
CREATE POLICY "Users can view own company hours" ON business_hours
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own company hours" ON business_hours;
CREATE POLICY "Users can insert own company hours" ON business_hours
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own company hours" ON business_hours;
CREATE POLICY "Users can update own company hours" ON business_hours
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete own company hours" ON business_hours;
CREATE POLICY "Users can delete own company hours" ON business_hours
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

-- SERVICES
DROP POLICY IF EXISTS "Users can view own company services" ON services;
CREATE POLICY "Users can view own company services" ON services
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own company services" ON services;
CREATE POLICY "Users can insert own company services" ON services
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own company services" ON services;
CREATE POLICY "Users can update own company services" ON services
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete own company services" ON services;
CREATE POLICY "Users can delete own company services" ON services
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

-- COMPANY_SCHEDULING_RULES
DROP POLICY IF EXISTS "Users can view their company rules" ON company_scheduling_rules;
CREATE POLICY "Users can view their company rules" ON company_scheduling_rules
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert their company rules" ON company_scheduling_rules;
CREATE POLICY "Users can insert their company rules" ON company_scheduling_rules
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update their company rules" ON company_scheduling_rules;
CREATE POLICY "Users can update their company rules" ON company_scheduling_rules
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

-- COMPANY_PAYMENT_INTEGRATIONS
DROP POLICY IF EXISTS "Users can view their company integrations" ON company_payment_integrations;
CREATE POLICY "Users can view their company integrations" ON company_payment_integrations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert their company integrations" ON company_payment_integrations;
CREATE POLICY "Users can insert their company integrations" ON company_payment_integrations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update their company integrations" ON company_payment_integrations;
CREATE POLICY "Users can update their company integrations" ON company_payment_integrations
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

-- SERVICE_CATEGORIES
DROP POLICY IF EXISTS "Users can view their company service categories" ON service_categories;
CREATE POLICY "Users can view their company service categories" ON service_categories
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can manage their company service categories" ON service_categories;
CREATE POLICY "Users can manage their company service categories" ON service_categories
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
        )
    );

-- SERVICE_COLLABORATORS
DROP POLICY IF EXISTS "Users can view their company service collaborators" ON service_collaborators;
CREATE POLICY "Users can view their company service collaborators" ON service_collaborators
    FOR SELECT USING (
        service_id IN (
            SELECT id FROM services WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage their company service collaborators" ON service_collaborators;
CREATE POLICY "Users can manage their company service collaborators" ON service_collaborators
    FOR ALL USING (
        service_id IN (
            SELECT id FROM services WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
            )
        )
    );

-- ============================================
-- PARTE 2: Remover Políticas Duplicadas
-- ============================================

-- APPOINTMENTS - Remover política duplicada
DROP POLICY IF EXISTS "Enable insert for All" ON appointments;
-- Manter apenas "Permitir criacao publica de agendamentos"

-- BUSINESS_HOURS - Remover política duplicada
DROP POLICY IF EXISTS "Permitir leitura publica de horarios" ON business_hours;
-- Manter apenas "Users can view own company hours" (já corrigida acima)

-- CLIENTS - Remover políticas duplicadas
DROP POLICY IF EXISTS "Permitir criacao publica de clientes" ON clients;
DROP POLICY IF EXISTS "Permitir leitura publica de clientes" ON clients;
-- Manter apenas as políticas "Users can..." (já corrigidas acima)

-- Recriar política pública para clientes (necessária para agendamento público)
CREATE POLICY "Public can create clients" ON clients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view clients" ON clients
    FOR SELECT USING (true);

-- COMPANIES - Remover política duplicada
DROP POLICY IF EXISTS "Permitir leitura publica de empresas" ON companies;
-- Manter apenas "Users can view own company" (já corrigida)

-- Recriar política pública para empresas (necessária para página pública)
CREATE POLICY "Public can view companies" ON companies
    FOR SELECT USING (true);

-- PROFILES - Remover política duplicada
DROP POLICY IF EXISTS "Permitir leitura publica de perfis" ON profiles;
-- Manter apenas "Users can view own profile" (já corrigida)

-- SERVICE_CATEGORIES - Remover políticas duplicadas
DROP POLICY IF EXISTS "Permitir leitura publica de categorias" ON service_categories;
DROP POLICY IF EXISTS "Service categories are viewable by everyone" ON service_categories;
-- Manter apenas as políticas "Users can..." (já corrigidas)

-- Recriar política pública para categorias
CREATE POLICY "Public can view service categories" ON service_categories
    FOR SELECT USING (true);

-- SERVICE_COLLABORATORS - Remover políticas duplicadas
DROP POLICY IF EXISTS "Permitir leitura publica de colaboradores" ON service_collaborators;
DROP POLICY IF EXISTS "Service collaborators are viewable by everyone" ON service_collaborators;
-- Manter apenas as políticas "Users can..." (já corrigidas)

-- Recriar política pública para colaboradores
CREATE POLICY "Public can view service collaborators" ON service_collaborators
    FOR SELECT USING (true);

-- SERVICES - Remover políticas duplicadas (MUITAS!)
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
DROP POLICY IF EXISTS "Permitir leitura publica de servicos" ON services;
DROP POLICY IF EXISTS "Public services are viewable by everyone" ON services;
DROP POLICY IF EXISTS "Users can view their company services" ON services;
-- Manter apenas "Users can view own company services" e "Users can manage their company services"

-- Recriar política pública para serviços
CREATE POLICY "Public can view active services" ON services
    FOR SELECT USING (active = true);

-- ============================================
-- PARTE 3: Remover Índices Duplicados
-- ============================================

-- BUSINESS_HOURS - Remover índice duplicado
DROP INDEX IF EXISTS idx_business_hours_company;
-- Manter idx_business_hours_company_id

-- SERVICES - Remover índice duplicado
DROP INDEX IF EXISTS idx_services_company;
-- Manter idx_services_company_id

-- ============================================
-- PARTE 4: Criar Índices Ausentes (Foreign Keys)
-- ============================================

-- APPOINTMENTS
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);

-- SERVICE_COLLABORATORS
CREATE INDEX IF NOT EXISTS idx_service_collaborators_service_id ON service_collaborators(service_id);
CREATE INDEX IF NOT EXISTS idx_service_collaborators_profile_id ON service_collaborators(profile_id);

-- CLIENTS
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- COMPANIES
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar políticas restantes
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Verificar índices
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
