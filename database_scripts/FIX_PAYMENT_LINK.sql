-- Execute este script no SQL Editor do Supabase para corrigir o problema

-- 1. Função auxiliar para pegar a TAG do InfinitePay de forma segura
CREATE OR REPLACE FUNCTION get_company_infinitepay_tag(p_company_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tag text;
BEGIN
    SELECT settings->>'infinitepay_tag'
    INTO v_tag
    FROM company_payment_integrations
    WHERE company_id = p_company_id 
    AND provider = 'infinitepay' 
    AND is_active = true;
    
    RETURN v_tag;
END;
$$ LANGUAGE plpgsql;

-- 2. Dar permissão para o usuário público usar esta função
GRANT EXECUTE ON FUNCTION get_company_infinitepay_tag TO anon, authenticated;

-- (Opcional) Reaplica a public_create_pending_booking se ainda não existir
CREATE OR REPLACE FUNCTION public_create_pending_booking(
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
    SELECT price, reservation_fee, is_reservation_fee_enabled 
    INTO v_service_price, v_reservation_fee, v_is_fee_enabled
    FROM services
    WHERE id = p_service_id;

    v_remaining_amount := v_service_price - v_reservation_fee;
    
    INSERT INTO pending_bookings (
        company_id, client_id, service_id, professional_id,
        start_time, end_time,
        client_name, client_phone, client_email, notes,
        reservation_fee, remaining_amount
    )
    VALUES (
        p_company_id, p_client_id, p_service_id, p_professional_id,
        p_start_time, p_end_time,
        p_client_name, p_client_phone, p_client_email, p_notes,
        v_reservation_fee, v_remaining_amount
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
