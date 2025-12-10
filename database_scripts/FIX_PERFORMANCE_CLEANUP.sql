-- ============================================
-- FIX PERFORMANCE CLEANUP (Unused Indexes & Duplicate Policies)
-- ============================================

-- 1. UNIFICAR POLÍTICAS DE LEITURA EM SERVICES
-- ============================================
-- O Advisor reclama de múltiplas políticas permissivas. Vamos unificar.

DROP POLICY IF EXISTS "Public can view active services" ON services;
DROP POLICY IF EXISTS "Users can view own company services" ON services;

CREATE POLICY "Unified view policy for services" ON services
FOR SELECT USING (
  -- Permite acesso público se estiver ativo
  (active = true) 
  OR 
  -- Permite acesso total para usuários da própria empresa
  (
    auth.role() = 'authenticated' AND 
    company_id IN (
        SELECT company_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  )
);


-- 2. REMOVER ÍNDICES NÃO USADOS (Sugerido pelo Advisor)
-- ============================================
-- Atenção: Remover apenas se tiver certeza que não serão necessários no futuro.
-- Para limpar o Advisor, vamos remover.

DROP INDEX IF EXISTS idx_services_active;
DROP INDEX IF EXISTS idx_appointments_client_phone;
DROP INDEX IF EXISTS idx_appointments_client_email;
DROP INDEX IF EXISTS idx_appointments_company_start_time;
