-- ========================================
-- SCRIPT COMPLETO: TAXA DE RESERVA
-- Execute este script no SQL Editor do Supabase
-- ========================================

-- 1. Adicionar colunas na tabela services
ALTER TABLE services ADD COLUMN IF NOT EXISTS reservation_fee numeric DEFAULT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_reservation_fee_enabled boolean DEFAULT false;

-- 2. Adicionar coluna remaining_amount na tabela appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remaining_amount numeric DEFAULT NULL;

-- 3. Criar tabela de agendamentos pendentes (antes do pagamento)
CREATE TABLE IF NOT EXISTS pending_bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
    service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    professional_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    client_name text NOT NULL,
    client_phone text NOT NULL,
    client_email text,
    notes text,
    reservation_fee numeric NOT NULL,
    remaining_amount numeric NOT NULL,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '15 minutes'),
    CONSTRAINT pending_bookings_time_check CHECK (end_time > start_time)
);

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_pending_bookings_expires ON pending_bookings(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_company ON pending_bookings(company_id);

-- 5. Função para criar agendamento pendente
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
        INSERT INTO appointments (
            company_id, client_id, service_id, professional_id,
            start_time, end_time, status,
            client_name, client_phone, client_email, notes,
            payment_status
        )
        VALUES (
            p_company_id, p_client_id, p_service_id, p_professional_id,
            p_start_time, p_end_time, 'confirmed',
            p_client_name, p_client_phone, p_client_email, p_notes,
            'unpaid'
        )
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Função para confirmar agendamento pendente (após pagamento)
CREATE OR REPLACE FUNCTION confirm_pending_booking(p_pending_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appointment_id uuid;
    v_pending record;
BEGIN
    SELECT * INTO v_pending FROM pending_bookings WHERE id = p_pending_id;
    
    IF v_pending IS NULL THEN
        RAISE EXCEPTION 'Pending booking not found';
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
    
    DELETE FROM pending_bookings WHERE id = p_pending_id;
    
    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Função para limpar agendamentos pendentes expirados
CREATE OR REPLACE FUNCTION cleanup_expired_pending_bookings()
RETURNS integer
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count integer;
BEGIN
    DELETE FROM pending_bookings WHERE expires_at < now();
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Dar permissões públicas para as funções
GRANT EXECUTE ON FUNCTION public_create_pending_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_pending_booking TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_pending_bookings TO service_role;

-- 9. Políticas RLS para pending_bookings
ALTER TABLE pending_bookings ENABLE ROW LEVEL SECURITY;

-- Permitir que service_role leia/escreva tudo
CREATE POLICY "Service role can do everything on pending_bookings"
ON pending_bookings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- FIM DO SCRIPT
-- Agora você pode testar o agendamento com taxa de reserva!
