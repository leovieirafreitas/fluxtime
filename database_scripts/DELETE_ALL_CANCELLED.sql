-- ============================================
-- DELETAR TODOS OS AGENDAMENTOS CANCELADOS
-- ============================================
-- Script simplificado - Execute no Supabase SQL Editor

-- PASSO 1: Ver quantos cancelados existem
SELECT COUNT(*) as total_cancelados
FROM appointments 
WHERE status = 'cancelled'
AND company_id = '12345678-1234-1234-1234-123456789abc'::uuid;

-- PASSO 2: DELETAR TODOS os cancelados
-- ATENÇÃO: Substitua o UUID pelo ID da sua empresa Barbeshop
DELETE FROM appointments 
WHERE status = 'cancelled'
AND company_id = '12345678-1234-1234-1234-123456789abc'::uuid;

-- PASSO 3: Confirmar que foram deletados
SELECT COUNT(*) as cancelados_restantes
FROM appointments 
WHERE status = 'cancelled'
AND company_id = '12345678-1234-1234-1234-123456789abc'::uuid;

-- Deve retornar 0

-- ============================================
-- INSTRUÇÕES:
-- ============================================
-- 1. Copie o UUID da empresa Barbeshop que você já tem
-- 2. Substitua '12345678-1234-1234-1234-123456789abc' pelo UUID correto
-- 3. Execute o PASSO 1 para ver quantos serão deletados
-- 4. Execute o PASSO 2 para deletar TODOS
-- 5. Execute o PASSO 3 para confirmar (deve retornar 0)
-- 6. Recarregue Dashboard e Financeiro (Ctrl+Shift+R)
