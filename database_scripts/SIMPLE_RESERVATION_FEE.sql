-- ========================================
-- SOLUÇÃO SIMPLIFICADA: TAXA DE RESERVA
-- Execute este script no SQL Editor do Supabase
-- ========================================

-- 1. Adicionar colunas na tabela services
ALTER TABLE services ADD COLUMN IF NOT EXISTS reservation_fee numeric DEFAULT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_reservation_fee_enabled boolean DEFAULT false;

-- 2. Adicionar coluna remaining_amount na tabela appointments  
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remaining_amount numeric DEFAULT NULL;

-- 3. Atualizar função public_create_appointment para NÃO criar agendamento se houver taxa
-- O agendamento só será criado APÓS o pagamento via webhook
CREATE OR REPLACE FUNCTION public_create_appointment(
    p_company_id uuid,
    p_client_id uuid,
    p_service_id uuid,
    p_professional_id uuid,
    p_start_time timestamptz,
    p_end_time timestamptz,
    p_client_name text,
    p_client_phone text,
    p_client_email text,
    p_notes text,
    p_coupon_code text DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
    v_service_price numeric;
    v_reservation_fee numeric;
    v_is_fee_enabled boolean;
    v_remaining_amount numeric;
BEGIN
    -- Fetch service details
    SELECT price, reservation_fee, is_reservation_fee_enabled 
    INTO v_service_price, v_reservation_fee, v_is_fee_enabled
    FROM services
    WHERE id = p_service_id;

    -- Se tem taxa de reserva, retorna NULL (não cria agendamento ainda)
    -- O agendamento será criado pelo webhook após pagamento
    IF v_is_fee_enabled AND v_reservation_fee IS NOT NULL AND v_reservation_fee > 0 THEN
        -- Retorna um UUID temporário que será usado como referência
        -- Mas NÃO cria o agendamento
        RETURN gen_random_uuid();
    ELSE
        -- Sem taxa, cria agendamento normalmente
        v_remaining_amount := NULL;
        
        INSERT INTO appointments (
            company_id, client_id, service_id, professional_id,
            start_time, end_time, status,
            client_name, client_phone, client_email, notes,
            payment_status, remaining_amount
        )
        VALUES (
            p_company_id, p_client_id, p_service_id, p_professional_id,
            p_start_time, p_end_time, 'confirmed',
            p_client_name, p_client_phone, p_client_email, p_notes,
            'unpaid', v_remaining_amount
        )
        RETURNING id INTO v_id;
        
        RETURN v_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- FIM DO SCRIPT
-- Agora teste novamente!
