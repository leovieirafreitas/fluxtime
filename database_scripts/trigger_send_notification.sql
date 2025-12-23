-- Função para criar notificação interna quando novo agendamento é criado
CREATE OR REPLACE FUNCTION notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    company_name TEXT;
    service_name TEXT;
BEGIN
    -- Buscar nome da empresa e serviço
    SELECT c.name INTO company_name
    FROM companies c
    WHERE c.id = NEW.company_id;

    SELECT s.name INTO service_name
    FROM services s
    WHERE s.id = NEW.service_id;

    -- Criar notificação no banco
    INSERT INTO notifications (
        company_id,
        title,
        body,
        type,
        appointment_id
    ) VALUES (
        NEW.company_id,
        'Novo Agendamento',
        NEW.client_name || ' agendou ' || COALESCE(service_name, 'um serviço') || ' para ' || 
        TO_CHAR(NEW.start_time, 'DD/MM às HH24:MI'),
        'new_appointment',
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para novos agendamentos
DROP TRIGGER IF EXISTS trigger_new_appointment_notification ON appointments;
CREATE TRIGGER trigger_new_appointment_notification
AFTER INSERT ON appointments
FOR EACH ROW
WHEN (NEW.origin = 'public')  -- Apenas agendamentos feitos por clientes
EXECUTE FUNCTION notify_new_appointment();
