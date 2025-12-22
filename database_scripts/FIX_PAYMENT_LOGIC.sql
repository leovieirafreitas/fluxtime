-- =========================================================
-- FIX: PAYMENT STATUS & TOTAL AMOUNT LOGIC
-- =========================================================

-- 1. Update the Frontend Confirmation Function
CREATE OR REPLACE FUNCTION confirm_pending_booking_frontend(p_pending_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appointment_id uuid;
    v_pending record;
BEGIN
    -- ATOMIC OPERATION
    DELETE FROM pending_bookings 
    WHERE id = p_pending_id
    RETURNING * INTO v_pending;
    
    IF v_pending IS NULL THEN
        RETURN NULL; 
    END IF;
    
    -- Insert into appointments with CORRECT logic
    INSERT INTO appointments (
        company_id, client_id, service_id, professional_id,
        start_time, end_time, status,
        client_name, client_phone, client_email, notes,
        total_amount,        -- Should be FULL PRICE (fee + remaining)
        remaining_amount,    -- Amount left to pay
        payment_status       -- Should be 'pending' (not fully paid)
    )
    VALUES (
        v_pending.company_id, v_pending.client_id, v_pending.service_id, v_pending.professional_id,
        v_pending.start_time, v_pending.end_time, 'confirmed',
        v_pending.client_name, v_pending.client_phone, v_pending.client_email, v_pending.notes,
        (v_pending.reservation_fee + v_pending.remaining_amount), -- Full Price
        v_pending.remaining_amount,
        'pending' -- Status is PENDING because there is a remaining amount
    )
    RETURNING id INTO v_appointment_id;
    
    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the Webhook Confirmation Function
CREATE OR REPLACE FUNCTION confirm_pending_booking(p_pending_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appointment_id uuid;
    v_pending record;
BEGIN
    -- ATOMIC OPERATION
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
        total_amount, 
        remaining_amount, 
        payment_status
    )
    VALUES (
        v_pending.company_id, v_pending.client_id, v_pending.service_id, v_pending.professional_id,
        v_pending.start_time, v_pending.end_time, 'confirmed',
        v_pending.client_name, v_pending.client_phone, v_pending.client_email, v_pending.notes,
        (v_pending.reservation_fee + v_pending.remaining_amount), -- Full Price
        v_pending.remaining_amount,
        'pending'
    )
    RETURNING id INTO v_appointment_id;
    
    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- 3. FIX RECENT DATA (Repair the broken appointment)
-- Finds appointments created in the last hour where remaining_amount > 0 AND payment_status = 'paid'
-- Updates them to have correct total_amount (current total + remaining) and payment_status 'pending'
UPDATE appointments
SET 
    total_amount = total_amount + remaining_amount,
    payment_status = 'pending'
WHERE 
    created_at > (now() - interval '24 hours')
    AND remaining_amount > 0 
    AND payment_status = 'paid';
