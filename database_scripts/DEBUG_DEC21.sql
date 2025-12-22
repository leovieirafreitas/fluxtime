-- Inspecionar agendamento e serviço associado
SELECT 
    a.id, 
    a.start_time, 
    a.status, 
    a.payment_status, 
    a.total_amount,
    s.name as service_name,
    s.price as service_price,
    -- Tentando descobrir colunas de taxa
    -- s.reservation_fee, -- Se existir
    -- s.down_payment -- Se existir
    a.company_id
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE a.start_time::text LIKE '2025-12-21%';
