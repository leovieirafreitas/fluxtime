-- Script de teste para verificar agendamentos passados do Leonardo Freitas
-- Execute este script no SQL Editor do Supabase

-- 1. Buscar informações do cliente Leonardo Freitas
SELECT 
    id,
    name,
    phone,
    email,
    created_at
FROM clients
WHERE name ILIKE '%leonardo%freitas%'
ORDER BY created_at DESC;

-- 2. Buscar TODOS os agendamentos do Leonardo (passados e futuros)
SELECT 
    a.id,
    a.start_time,
    a.status,
    c.name as company_name,
    s.name as service_name,
    s.price as service_price,
    CASE 
        WHEN a.start_time < CURRENT_DATE THEN 'PASSADO'
        WHEN a.start_time >= CURRENT_DATE THEN 'FUTURO'
    END as tipo
FROM appointments a
JOIN clients cl ON a.client_id = cl.id
JOIN companies c ON a.company_id = c.id
JOIN services s ON a.service_id = s.id
WHERE cl.name ILIKE '%leonardo%freitas%'
ORDER BY a.start_time DESC;

-- 3. Contar agendamentos passados vs futuros
SELECT 
    CASE 
        WHEN a.start_time < CURRENT_DATE THEN 'PASSADOS'
        WHEN a.start_time >= CURRENT_DATE THEN 'FUTUROS'
    END as tipo,
    COUNT(*) as quantidade
FROM appointments a
JOIN clients cl ON a.client_id = cl.id
WHERE cl.name ILIKE '%leonardo%freitas%'
GROUP BY tipo
ORDER BY tipo;

-- 4. Verificar se a RPC function retorna os agendamentos corretamente
-- Substitua o telefone pelo telefone real do Leonardo
SELECT * FROM get_client_appointments(
    p_phone := '11999999999',  -- SUBSTITUA pelo telefone real
    p_email := NULL
);
