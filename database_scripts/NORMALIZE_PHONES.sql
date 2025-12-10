-- ============================================
-- NORMALIZAR TELEFONES EXISTENTES
-- ============================================
-- Este script normaliza todos os telefones existentes
-- para o formato +55XXXXXXXXXXX

-- 1. Normalizar client_phone em appointments
UPDATE appointments
SET client_phone = CASE
    -- Se já começa com +55, manter
    WHEN client_phone LIKE '+55%' THEN client_phone
    -- Se começa com 55 (sem +), adicionar +
    WHEN client_phone ~ '^55[0-9]{11}$' THEN '+' || client_phone
    -- Se é apenas números (11 dígitos), adicionar +55
    WHEN client_phone ~ '^[0-9]{11}$' THEN '+55' || client_phone
    -- Se tem formatação (XX) XXXXX-XXXX, remover e adicionar +55
    WHEN client_phone ~ '^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$' THEN 
        '+55' || regexp_replace(client_phone, '[^0-9]', '', 'g')
    -- Qualquer outro formato, tentar limpar e adicionar +55
    ELSE '+55' || regexp_replace(client_phone, '[^0-9]', '', 'g')
END
WHERE client_phone IS NOT NULL
  AND client_phone NOT LIKE '+55%';

-- 2. Normalizar phone em clients
UPDATE clients
SET phone = CASE
    -- Se já começa com +55, manter
    WHEN phone LIKE '+55%' THEN phone
    -- Se começa com 55 (sem +), adicionar +
    WHEN phone ~ '^55[0-9]{11}$' THEN '+' || phone
    -- Se é apenas números (11 dígitos), adicionar +55
    WHEN phone ~ '^[0-9]{11}$' THEN '+55' || phone
    -- Se tem formatação (XX) XXXXX-XXXX, remover e adicionar +55
    WHEN phone ~ '^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$' THEN 
        '+55' || regexp_replace(phone, '[^0-9]', '', 'g')
    -- Qualquer outro formato, tentar limpar e adicionar +55
    ELSE '+55' || regexp_replace(phone, '[^0-9]', '', 'g')
END
WHERE phone IS NOT NULL
  AND phone NOT LIKE '+55%';

-- Verificar resultado
SELECT 
    'appointments' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN client_phone LIKE '+55%' THEN 1 END) as normalized,
    COUNT(CASE WHEN client_phone NOT LIKE '+55%' THEN 1 END) as not_normalized
FROM appointments
WHERE client_phone IS NOT NULL

UNION ALL

SELECT 
    'clients' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN phone LIKE '+55%' THEN 1 END) as normalized,
    COUNT(CASE WHEN phone NOT LIKE '+55%' THEN 1 END) as not_normalized
FROM clients
WHERE phone IS NOT NULL;
