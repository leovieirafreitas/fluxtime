-- ============================================
-- FIX FINAL ADVISOR WARNINGS (COMPANIES POLICIES)
-- ============================================

-- O Advisor reportou "Multiple Permissive Policies" na tabela companies.
-- A política "Public can view companies" permite leitura irrestrita (true),
-- tornando a política "Users can view own company" redundante para SELECT.

DROP POLICY IF EXISTS "Users can view own company" ON companies;

-- Apenas para garantir que não removemos acesso de escrita/update acidentalmente,
-- verificamos se existem políticas de UPDATE separadas.
-- No script anterior, criamos "Users can update own company".
-- Portanto, é seguro remover a de SELECT duplicada.

-- Manter:
-- 1. "Public can view companies" (SELECT true)
-- 2. "Users can update own company" (UPDATE)
