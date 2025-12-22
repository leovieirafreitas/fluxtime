-- ============================================
-- DELETAR AGENDAMENTOS CANCELADOS - BARBESHOP
-- ============================================
-- Execute cada passo separadamente no Supabase SQL Editor

-- PASSO 1: Buscar o ID da empresa Barbeshop
SELECT id, name 
FROM companies 
WHERE name ILIKE '%barbeshop%';

-- Copie o ID retornado acima e use nos próximos passos
-- Exemplo de ID: 12345678-1234-1234-1234-123456789abc

-- ============================================
-- PASSO 2: Verificar quantos agendamentos cancelados existem
-- IMPORTANTE: Substitua o UUID abaixo pelo ID da sua empresa
-- ============================================
SELECT 
    COUNT(*) as total_cancelados,
    SUM(COALESCE(total_amount, 0)) as valor_total_cancelados
FROM appointments 
WHERE status = 'cancelled'
AND company_id = '12345678-1234-1234-1234-123456789abc'::uuid;
-- ↑ SUBSTITUA pelo ID da empresa retornado no PASSO 1

-- ============================================
-- PASSO 3: Ver detalhes dos agendamentos que serão deletados
-- ============================================
SELECT 
    id,
    client_name,
    start_time::date as data,
    status,
    payment_status,
    COALESCE(total_amount, 0) as valor,
    created_at::date as criado_em
FROM appointments 
WHERE status = 'cancelled'
AND company_id = '12345678-1234-1234-1234-123456789abc'::uuid
ORDER BY created_at DESC;
-- ↑ SUBSTITUA pelo ID da empresa retornado no PASSO 1

-- ============================================
-- PASSO 4: DELETAR os agendamentos cancelados
-- ATENÇÃO: Esta ação é IRREVERSÍVEL!
-- Só execute após verificar os passos 2 e 3
-- ============================================
DELETE FROM appointments 
WHERE status = 'cancelled'
AND company_id = '12345678-1234-1234-1234-123456789abc'::uuid;
-- ↑ SUBSTITUA pelo ID da empresa retornado no PASSO 1

-- ============================================
-- PASSO 5: Confirmar que foi deletado
-- ============================================
SELECT COUNT(*) as cancelados_restantes
FROM appointments 
WHERE status = 'cancelled'
AND company_id = '12345678-1234-1234-1234-123456789abc'::uuid;
-- ↑ SUBSTITUA pelo ID da empresa retornado no PASSO 1
-- Deve retornar 0

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Execute APENAS o PASSO 1
-- 2. Copie o UUID retornado (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
-- 3. Substitua '12345678-1234-1234-1234-123456789abc' em TODOS os passos seguintes
-- 4. Execute o PASSO 2 para ver quantos serão deletados
-- 5. Execute o PASSO 3 para ver os detalhes
-- 6. Se estiver tudo certo, execute o PASSO 4 para deletar
-- 7. Execute o PASSO 5 para confirmar
-- 8. Recarregue o Dashboard (Ctrl+Shift+R) e Financeiro (Ctrl+Shift+R)
