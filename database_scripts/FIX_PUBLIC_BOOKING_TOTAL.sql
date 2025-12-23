-- =============================================
-- FIX 2.0: PUBLIC BOOKING ZERO AMOUNT ISSUE
-- Corrected GRANTs to avoid "function not unique" error
-- =============================================

-- 1. Update public_create_pending_booking
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

    -- Ensure price is not null
    IF v_service_price IS NULL THEN
        v_service_price := 0;
    END IF;

    IF v_is_fee_enabled AND v_reservation_fee IS NOT NULL AND v_reservation_fee > 0 THEN
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
    ELSE
        -- REGULAR BOOKING (No Fee) -> Fix: Set total_amount and remaining_amount
        INSERT INTO appointments (
            company_id, client_id, service_id, professional_id,
            start_time, end_time, status,
            client_name, client_phone, client_email, notes,
            payment_status,
            total_amount,
            remaining_amount
        )
        VALUES (
            p_company_id, p_client_id, p_service_id, p_professional_id,
            p_start_time, p_end_time, 'confirmed',
            p_client_name, p_client_phone, p_client_email, p_notes,
            'unpaid',
            v_service_price,
            v_service_price
        )
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Update public_create_appointment
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
    v_total_amount numeric;
BEGIN
    SELECT price, reservation_fee, is_reservation_fee_enabled 
    INTO v_service_price, v_reservation_fee, v_is_fee_enabled
    FROM services
    WHERE id = p_service_id;

    IF v_service_price IS NULL THEN
        v_service_price := 0;
    END IF;

    v_total_amount := v_service_price;

    INSERT INTO appointments (
        company_id, client_id, service_id, professional_id, 
        start_time, end_time, status, 
        client_name, client_phone, client_email, notes,
        total_amount,
        remaining_amount,
        payment_status
    )
    VALUES (
        p_company_id, p_client_id, p_service_id, p_professional_id, 
        p_start_time, p_end_time, 'confirmed', 
        p_client_name, p_client_phone, p_client_email, p_notes,
        v_total_amount,
        v_total_amount,
        'unpaid'
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions explicitly with arguments to avoid ambiguity
GRANT EXECUTE ON FUNCTION public_create_pending_booking(uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_create_appointment(uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text, text) TO anon, authenticated;
