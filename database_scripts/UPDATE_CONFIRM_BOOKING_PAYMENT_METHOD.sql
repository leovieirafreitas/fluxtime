-- =========================================================
-- UPDATE: CONFIRM BOOKING WITH PAYMENT METHOD & CORRECT TOTAL
-- =========================================================

-- 1. Update Webhook Confirmation Function
CREATE OR REPLACE FUNCTION confirm_pending_booking(
    p_pending_id uuid,
    p_payment_method text DEFAULT 'pix'
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appointment_id uuid;
    v_pending record;
BEGIN
    -- Atomic Delete
    DELETE FROM pending_bookings 
    WHERE id = p_pending_id
    RETURNING * INTO v_pending;
    
    IF v_pending IS NULL THEN
        RETURN NULL; 
    END IF;
    
    -- Insert into appointments
    -- FIX: total_amount = fee + remaining (Full Price)
    -- FIX: insert payment_method
    INSERT INTO appointments (
        company_id, client_id, service_id, professional_id,
        start_time, end_time, status,
        client_name, client_phone, client_email, notes,
        total_amount, remaining_amount, payment_status, payment_method
    )
    VALUES (
        v_pending.company_id, v_pending.client_id, v_pending.service_id, v_pending.professional_id,
        v_pending.start_time, v_pending.end_time, 'confirmed',
        v_pending.client_name, v_pending.client_phone, v_pending.client_email, v_pending.notes,
        (v_pending.reservation_fee + COALESCE(v_pending.remaining_amount, 0)), 
        v_pending.remaining_amount, 
        'paid', 
        p_payment_method
    )
    RETURNING id INTO v_appointment_id;
    
    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION confirm_pending_booking TO service_role, anon, authenticated;


-- 2. Update Frontend Confirmation Function (Defaults to 'credit_card' or 'pix'?)
-- Usually frontend 'confirm' is triggered by webhook success, but sometimes direct.
-- If direct (e.g. testing), we can default to 'pix' or pass it.
CREATE OR REPLACE FUNCTION confirm_pending_booking_frontend(
    p_pending_id uuid,
    p_payment_method text DEFAULT 'credit_card'
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appointment_id uuid;
    v_pending record;
BEGIN
    DELETE FROM pending_bookings 
    WHERE id = p_pending_id
    RETURNING * INTO v_pending;
    
    IF v_pending IS NULL THEN
        RETURN NULL; 
    END IF;
    
    INSERT INTO appointments (
        company_id, client_id, service_id, professional_id,
        start_time, end_time, status,
        client_name, client_phone, client_email, notes,
        total_amount, remaining_amount, payment_status, payment_method
    )
    VALUES (
        v_pending.company_id, v_pending.client_id, v_pending.service_id, v_pending.professional_id,
        v_pending.start_time, v_pending.end_time, 'confirmed',
        v_pending.client_name, v_pending.client_phone, v_pending.client_email, v_pending.notes,
        (v_pending.reservation_fee + COALESCE(v_pending.remaining_amount, 0)), 
        v_pending.remaining_amount, 
        'paid', 
        p_payment_method
    )
    RETURNING id INTO v_appointment_id;
    
    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION confirm_pending_booking_frontend TO anon, authenticated;
