-- ============================================
-- MIGRATION: Make user_id nullable in clients
-- ============================================
-- 
-- PROBLEMA: 
-- A coluna user_id na tabela clients é NOT NULL, mas quando um cliente
-- faz agendamento pela página pública, ele não tem user_id (não está autenticado).
--
-- SOLUÇÃO:
-- Tornar a coluna user_id NULLABLE para permitir clientes sem autenticação.
--
-- COMO EXECUTAR:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em SQL Editor
-- 3. Cole e execute este SQL
-- ============================================

ALTER TABLE clients 
ALTER COLUMN user_id DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN clients.user_id IS 'Optional reference to authenticated user. NULL for clients created via public booking.';

-- Verificar se funcionou
SELECT 
    column_name, 
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'clients' 
  AND column_name = 'user_id';
