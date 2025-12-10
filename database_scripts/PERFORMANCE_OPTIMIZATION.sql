-- ============================================
-- PERFORMANCE OPTIMIZATION
-- ============================================
-- Este script cria índices para melhorar a performance
-- das queries mais comuns do FluxTime

-- 1. Índice para busca de appointments por client_phone
-- Usado em: ClientDashboard.tsx
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone 
ON appointments(client_phone);

-- 2. Índice para busca de appointments por client_email
CREATE INDEX IF NOT EXISTS idx_appointments_client_email 
ON appointments(client_email);

-- 3. Índice para busca de appointments por company_id e start_time
-- Usado em: Dashboard principal, Insights
CREATE INDEX IF NOT EXISTS idx_appointments_company_start_time 
ON appointments(company_id, start_time DESC);

-- 4. Índice para busca de appointments por status
CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON appointments(status);

-- 5. Índice composto para busca de appointments por company_id e status
CREATE INDEX IF NOT EXISTS idx_appointments_company_status 
ON appointments(company_id, status);

-- 6. Índice para busca de clients por phone
-- Usado em: ClientLogin.tsx, PublicCompanyPage.tsx
CREATE INDEX IF NOT EXISTS idx_clients_phone 
ON clients(phone);

-- 7. Índice para busca de clients por company_id
CREATE INDEX IF NOT EXISTS idx_clients_company 
ON clients(company_id);

-- 8. Índice para busca de services por company_id
CREATE INDEX IF NOT EXISTS idx_services_company 
ON services(company_id);

-- 9. Índice para busca de business_hours por company_id
CREATE INDEX IF NOT EXISTS idx_business_hours_company 
ON business_hours(company_id);

-- 10. Índice para busca de service_collaborators por service_id
CREATE INDEX IF NOT EXISTS idx_service_collaborators_service 
ON service_collaborators(service_id);

-- Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('appointments', 'clients', 'services', 'business_hours', 'service_collaborators')
ORDER BY tablename, indexname;
