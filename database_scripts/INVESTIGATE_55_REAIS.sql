-- ============================================
-- INVESTIGAR TRANSAÇÃO DE R$ 55,00
-- ============================================

-- Vamos buscar essa transação específica para ver seus detalhes
-- Substitua parte do nome ou data se necessário
SELECT 
    id,
    client_name,
    start_time,
    status,
    payment_status,
    total_amount,
    'Service Price' as source,
    service_id
FROM appointments
-- Buscando transações próximas de 55 reais
WHERE (total_amount = 55 OR total_amount IS NULL)
AND start_time::date = '2025-12-19'
ORDER BY start_time DESC;

-- Se o total_amount for NULL, precisamos ver o preço do serviço
SELECT 
    a.id,
    a.client_name,
    a.status,
    a.payment_status,
    a.total_amount,
    s.price as service_price,
    s.name as service_name
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE a.start_time::date = '2025-12-19'
AND (a.total_amount = 55 OR s.price = 55);
