-- =========================================================
-- FIX: PREVENT DOUBLE BOOKING (ATOMIC CONFIRMATION)
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
    -- ATOMIC OPERATION: Delete and Return in one step.
    -- If another process (webhook) already deleted it, this returns NULL.
    DELETE FROM pending_bookings 
    WHERE id = p_pending_id
    RETURNING * INTO v_pending;
    
    -- If no record was deleted (because it doesn't exist anymore), stop here.
    IF v_pending IS NULL THEN
        RETURN NULL; 
    END IF;
    
    -- Insert into appointments
    INSERT INTO appointments (
        company_id, client_id, service_id, professional_id,
        start_time, end_time, status,
        client_name, client_phone, client_email, notes,
        total_amount, remaining_amount, payment_status
    )
    VALUES (
        v_pending.company_id, v_pending.client_id, v_pending.service_id, v_pending.professional_id,
        v_pending.start_time, v_pending.end_time, 'confirmed',
        v_pending.client_name, v_pending.client_phone, v_pending.client_email, v_pending.notes,
        v_pending.reservation_fee, v_pending.remaining_amount, 'paid'
    )
    RETURNING id INTO v_appointment_id;
    
    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the Webhook Confirmation Function (same logic)
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
        total_amount, remaining_amount, payment_status
    )
    VALUES (
        v_pending.company_id, v_pending.client_id, v_pending.service_id, v_pending.professional_id,
        v_pending.start_time, v_pending.end_time, 'confirmed',
        v_pending.client_name, v_pending.client_phone, v_pending.client_email, v_pending.notes,
        v_pending.reservation_fee, v_pending.remaining_amount, 'paid'
    )
    RETURNING id INTO v_appointment_id;
    
    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Cleanup existing duplicates (Optional but helpful)
-- Removes appointments that are exact duplicates (same client, service, start_time) created within 1 minute of each other
-- Keeping the one with the lowest ID (first one)
DELETE FROM appointments a
USING appointments b
WHERE a.id > b.id
AND a.client_id = b.client_id
AND a.service_id = b.service_id
AND a.start_time = b.start_time
AND a.created_at > (b.created_at - interval '1 minute')
AND a.created_at < (b.created_at + interval '1 minute');

