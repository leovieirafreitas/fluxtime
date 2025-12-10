-- ============================================
-- FIX REMAINING PERFORMANCE ISSUES
-- ============================================

-- 1. CRIAR ÍNDICES AUSENTES (Foreign Keys)
-- ============================================

-- PROFILES
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- SERVICE_CATEGORIES
CREATE INDEX IF NOT EXISTS idx_service_categories_company_id ON service_categories(company_id);

-- SERVICES
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);


-- 2. REMOVER ÍNDICES DUPLICADOS
-- ============================================

-- CLIENTS
DROP INDEX IF EXISTS idx_clients_company; 
-- Manter idx_clients_company_id (já existe ou foi criado)

-- SERVICE_COLLABORATORS
DROP INDEX IF EXISTS idx_service_collaborators_service;
-- Manter idx_service_collaborators_service_id (já existe ou foi criado)


-- 3. RESOLVER POLÍTICAS DUPLICADAS EM SERVICES
-- ============================================
-- O linter alertou conflito entre "Users can manage..." e as políticas granulares (Update, etc.)
-- Vamos remover a política "Manage" genérica e manter as granulares que já otimizamos no passo anterior.

DROP POLICY IF EXISTS "Users can manage their company services" ON services;
