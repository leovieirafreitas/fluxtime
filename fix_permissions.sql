-- FIXED SCRIPT: Added 'clients' table permissions

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY; -- Added clients

-- Create policies for public read access
CREATE POLICY "Permitir leitura publica de empresas" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de servicos" ON public.services FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de categorias" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de horarios" ON public.business_hours FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de colaboradores" ON public.service_collaborators FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica de clientes" ON public.clients FOR SELECT USING (true); -- Added clients policy
