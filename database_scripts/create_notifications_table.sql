-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT CHECK (type IN ('new_appointment', 'appointment_updated', 'appointment_cancelled', 'payment_received', 'system')),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(company_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver notificações da sua empresa
CREATE POLICY "Users can view their company notifications"
ON notifications FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    )
);

-- Política: Usuários podem atualizar (marcar como lida) suas notificações
CREATE POLICY "Users can update their company notifications"
ON notifications FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    )
);

-- Política: Sistema pode inserir notificações
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

COMMENT ON TABLE notifications IS 'Armazena notificações para usuários da empresa';
