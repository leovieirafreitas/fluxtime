-- Function: client_reschedule_appointment
-- Description: Allows clients to reschedule their own appointments while maintaining the current status
-- The status should NOT change - if it was 'confirmed', it stays 'confirmed'
-- Only when the business owner creates an appointment for a client should it be 'pending'

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS client_reschedule_appointment(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION client_reschedule_appointment(
    p_appointment_id UUID,
    p_new_start TIMESTAMPTZ,
    p_new_end TIMESTAMPTZ,
    p_phone TEXT,
    p_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_appointment RECORD;
    v_client_id UUID;
    v_company_id UUID;
    v_current_status TEXT;
BEGIN
    -- Get the appointment details
    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    -- Store current status to maintain it
    v_current_status := v_appointment.status;

    -- Verify the client owns this appointment
    -- Get client_id from phone/email
    SELECT id, company_id INTO v_client_id, v_company_id
    FROM clients
    WHERE company_id = v_appointment.company_id
    AND (
        phone = p_phone 
        OR phone = '+55' || p_phone
        OR phone = '55' || p_phone
        OR REPLACE(REPLACE(REPLACE(phone, '+55', ''), '55', ''), '-', '') = REPLACE(REPLACE(p_phone, '+55', ''), '-', '')
        OR email = p_email
    )
    LIMIT 1;

    IF v_client_id IS NULL OR v_client_id != v_appointment.client_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only reschedule your own appointments';
    END IF;

    -- Check for conflicts with the new time
    IF EXISTS (
        SELECT 1 FROM appointments
        WHERE company_id = v_appointment.company_id
        AND professional_id = v_appointment.professional_id
        AND id != p_appointment_id
        AND status NOT IN ('cancelled')
        AND (
            (start_time, end_time) OVERLAPS (p_new_start, p_new_end)
        )
    ) THEN
        RAISE EXCEPTION 'Time slot is already booked';
    END IF;

    -- Update the appointment with new times, keeping the same status
    UPDATE appointments
    SET 
        start_time = p_new_start,
        end_time = p_new_end,
        status = v_current_status, -- Maintain current status
        updated_at = NOW()
    WHERE id = p_appointment_id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'appointment_id', p_appointment_id,
        'status', v_current_status,
        'message', 'Appointment rescheduled successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error rescheduling appointment: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users (clients)
GRANT EXECUTE ON FUNCTION client_reschedule_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION client_reschedule_appointment TO anon;

COMMENT ON FUNCTION client_reschedule_appointment IS 
'Allows clients to reschedule their appointments while maintaining the current status. Status only becomes pending when business owner creates appointment for client.';
