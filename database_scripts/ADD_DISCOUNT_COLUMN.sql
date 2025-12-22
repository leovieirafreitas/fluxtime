ALTER TABLE appointments ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;

-- Atualizar função de criação se necessário, mas o desconto geralmente é aplicado DEPOIS, na hora de pagar/editar.
-- Por enquanto, só a coluna basta.
