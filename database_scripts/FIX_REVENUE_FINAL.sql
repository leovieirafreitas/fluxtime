-- Atualiza a função do Dashboard para incluir TODOS os pagamentos recebidos no Faturamento
-- Corrigindo a diferença de R$ 110 referente a serviços pagos porém cancelados

CREATE OR REPLACE FUNCTION public.get_dashboard_insights(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_appointments_count int;
    v_active_clients int;
    v_total_revenue numeric;
BEGIN
    -- Contagem de agendamentos mantém a lógica de "ativos" (confirmados/completos/pendentes)
    SELECT COUNT(*)
    INTO v_appointments_count
    FROM appointments
    WHERE company_id = p_company_id
    AND status IN ('confirmed', 'completed', 'pending');

    -- Contagem de clientes
    SELECT COUNT(*)
    INTO v_active_clients
    FROM clients
    WHERE company_id = p_company_id;

    -- CORREÇÃO CRÍTICA DO FATURAMENTO:
    -- Soma se o serviço foi CONCLUÍDO (completed) OU se o pagamento foi REALIZADO (paid)
    -- Isso garante que valores recebidos de serviços cancelados entrem na conta
    SELECT COALESCE(SUM(
        CASE 
            WHEN total_amount IS NOT NULL THEN total_amount 
            ELSE 0 
        END
    ), 0)
    INTO v_total_revenue
    FROM appointments
    WHERE company_id = p_company_id
    AND (
        status = 'completed' OR   -- Se completou, conta (assume-se que vai receber ou recebeu)
        payment_status = 'paid'   -- Se pagou, conta SEMPRE (mesmo se cancelado)
    );

    RETURN json_build_object(
        'appointments', v_appointments_count,
        'activeClients', v_active_clients,
        'revenue', v_total_revenue
    );
END;
$function$;
