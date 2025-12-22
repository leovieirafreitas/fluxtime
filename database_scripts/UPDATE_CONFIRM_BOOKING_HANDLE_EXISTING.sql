-- =========================================================
-- UPDATE: CONFIRM BOOKING - HANDLE EXISTING PAYMENTS (REMAINING BALANCE)
-- =========================================================

-- 1. Update Core Webhook Function
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
    v_existing_id uuid;
BEGIN
    -- 1. Try to Process Pending Booking (New Appointment / First Payment)
    DELETE FROM pending_bookings 
    WHERE id = p_pending_id
    RETURNING * INTO v_pending;
    
    IF v_pending IS NOT NULL THEN
        -- Insert new appointment
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
            CASE WHEN v_pending.remaining_amount > 0 THEN 'unpaid' ELSE 'paid' END,
            p_payment_method
        )
        RETURNING id INTO v_appointment_id;
        
        RETURN v_appointment_id;
    END IF;

    -- 2. If Pending NOT found, Check Existing Appointments (Remaining Balance Payment)
    -- This handles the case where user pays the remaining balance for an already confirmed appointment.
    SELECT id INTO v_existing_id FROM appointments WHERE id = p_pending_id;
    
    IF v_existing_id IS NOT NULL THEN
        -- Update Existing to PAID FULL
        UPDATE appointments
        SET
            payment_status = 'paid',
            remaining_amount = 0,
            payment_method = p_payment_method, -- Update method to the one used for remaining balance
            updated_at = NOW()
        WHERE id = v_existing_id;
        
        RETURN v_existing_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION confirm_pending_booking TO service_role, anon, authenticated;


-- 2. Update Frontend Function (Same Logic)
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
    v_existing_id uuid;
BEGIN
    -- 1. Pending Booking
    DELETE FROM pending_bookings 
    WHERE id = p_pending_id
    RETURNING * INTO v_pending;
    
    IF v_pending IS NOT NULL THEN
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
            CASE WHEN v_pending.remaining_amount > 0 THEN 'unpaid' ELSE 'paid' END,
            p_payment_method
        )
        RETURNING id INTO v_appointment_id;
        
        RETURN v_appointment_id;
    END IF;
    
    -- 2. Existing Appointment (Remaining Balance)
    SELECT id INTO v_existing_id FROM appointments WHERE id = p_pending_id;
    
    IF v_existing_id IS NOT NULL THEN
        UPDATE appointments
        SET
            payment_status = 'paid',
            remaining_amount = 0,
            payment_method = p_payment_method,
            updated_at = NOW()
        WHERE id = v_existing_id;
        
        RETURN v_existing_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION confirm_pending_booking_frontend TO anon, authenticated;
