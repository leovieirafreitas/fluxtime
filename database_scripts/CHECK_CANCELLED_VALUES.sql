-- ============================================
-- VERIFICAR VALORES DE AGENDAMENTOS CANCELADOS
-- ============================================

SELECT 
    client_name,
    start_time,
    status,
    payment_status,
    total_amount as "Valor Salvo no Banco",
    service_id
FROM appointments
WHERE status = 'cancelled'
ORDER BY start_time DESC;
