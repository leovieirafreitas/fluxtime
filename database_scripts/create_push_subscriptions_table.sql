-- Tabela de subscrições push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_company ON push_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver suas próprias subscrições
CREATE POLICY "Users can view their own subscriptions"
ON push_subscriptions FOR SELECT
USING (user_id = auth.uid());

-- Política: Usuários podem inserir suas próprias subscrições
CREATE POLICY "Users can insert their own subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Política: Usuários podem atualizar suas próprias subscrições
CREATE POLICY "Users can update their own subscriptions"
ON push_subscriptions FOR UPDATE
USING (user_id = auth.uid());

-- Política: Usuários podem deletar suas próprias subscrições
CREATE POLICY "Users can delete their own subscriptions"
ON push_subscriptions FOR DELETE
USING (user_id = auth.uid());

COMMENT ON TABLE push_subscriptions IS 'Armazena tokens de push notification para cada usuário';
