-- ============================================
-- ADICIONAR COLUNA MÉTODO DE PAGAMENTO
-- ============================================

-- Adiciona a coluna para saber se foi Pix, Dinheiro ou Cartão
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'pix';

-- Opcional: Atualizar registros antigos para 'pix' por padrão
UPDATE appointments 
SET payment_method = 'pix' 
WHERE payment_method IS NULL;
