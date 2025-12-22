-- ============================================
-- RELATÓRIO DE FATURAMENTO POR EMPRESA
-- ============================================
-- Este script calcula o faturamento separado para cada empresa
-- considerando APENAS transações pagas e NÃO canceladas.

SELECT 
    c.name as "Nome da Empresa",
    c.id as "ID da Empresa",
    COUNT(a.id) as "Qtd Transações",
    SUM(COALESCE(a.total_amount, s.price)) as "Faturamento Total (R$)"
FROM appointments a
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN companies c ON a.company_id = c.id
WHERE a.payment_status = 'paid'       -- Apenas pagos
AND a.status != 'cancelled'           -- Excluir cancelados
GROUP BY c.id, c.name
ORDER BY c.name;

-- ============================================
-- DETALHAR DIFERENÇAS
-- ============================================
-- Listar as últimas 5 transações de CADA empresa para conferência

SELECT 
    c.name as "Empresa",
    a.client_name as "Cliente",
    a.start_time::date as "Data",
    a.status as "Status",
    a.payment_status as "Pagamento",
    COALESCE(a.total_amount, s.price) as "Valor (R$)"
FROM appointments a
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN companies c ON a.company_id = c.id
WHERE a.payment_status = 'paid'
AND a.status != 'cancelled'
ORDER BY c.name, a.start_time DESC
LIMIT 10;
