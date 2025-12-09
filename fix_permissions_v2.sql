-- SCRIPT CORRIGIDO: Remove as políticas antigas antes de criar novas para evitar erro de "já existe"

-- Apagar políticas anteriores (DROP IF EXISTS)
DROP POLICY IF EXISTS "Permitir leitura publica de empresas" ON public.companies;
DROP POLICY IF EXISTS "Permitir leitura publica de servicos" ON public.services;
DROP POLICY IF EXISTS "Permitir leitura publica de categorias" ON public.service_categories;
DROP POLICY IF EXISTS "Permitir leitura publica de horarios" ON public.business_hours;
DROP POLICY IF EXISTS "Permitir leitura publica de colaboradores" ON public.service_collaborators;
DROP POLICY IF EXISTS "Permitir leitura publica de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir leitura publica de clientes" ON public.clients;

-- Garantir que RLS está habilitado
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Criar as políticas novamente
CREATE POLICY "Permitir leitura publica de empresas" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de servicos" ON public.services FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de categorias" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de horarios" ON public.business_hours FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de colaboradores" ON public.service_collaborators FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de clientes" ON public.clients FOR SELECT USING (true);
