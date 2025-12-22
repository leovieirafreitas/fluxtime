-- 1. Add columns to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS reservation_fee numeric DEFAULT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_reservation_fee_enabled boolean DEFAULT false;

-- 2. Update public_create_appointment to populate total_amount if reservation fee is enabled
-- We need to drop the old one first if we change signature, but we can overload or just replace if signature is same (it's not).
-- To avoid breaking changes, we might want to keep the old one or ensure frontend is updated simultaneously.
-- However, we can just update the function body to look up the service fee?
-- No, RLS prevents reading service details inside the function if not careful, but it's SECURITY DEFINER so it can read services.

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
    p_notes text
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
    v_initial_status text;
BEGIN
    -- Fetch service details to determine amount
    SELECT price, reservation_fee, is_reservation_fee_enabled 
    INTO v_service_price, v_reservation_fee, v_is_fee_enabled
    FROM services
    WHERE id = p_service_id;

    -- Determine total_amount and initial status based on reservation fee logic
    IF v_is_fee_enabled AND v_reservation_fee IS NOT NULL AND v_reservation_fee > 0 THEN
        v_total_amount := v_reservation_fee;
        v_initial_status := 'pending_payment'; -- Aguardando pagamento da taxa
    ELSE
        -- If no fee, leave total_amount NULL and set as confirmed
        v_total_amount := NULL;
        v_initial_status := 'confirmed';
    END IF;

    INSERT INTO appointments (
        company_id, client_id, service_id, professional_id, 
        start_time, end_time, status, 
        client_name, client_phone, client_email, notes,
        total_amount,
        payment_status
    )
    VALUES (
        p_company_id, p_client_id, p_service_id, p_professional_id, 
        p_start_time, p_end_time, v_initial_status, 
        p_client_name, p_client_phone, p_client_email, p_notes,
        v_total_amount,
        CASE WHEN v_is_fee_enabled THEN 'unpaid' ELSE 'unpaid' END
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
