-- Grants INSERT permissions for public booking flow
-- Allow anon/authenticated to insert into clients (for registration) and appointments (to book)

-- Policy for CLIENTS: Allow anyone to insert (since it's public registration)
-- We might want to restrict this properly in production, but for now:
DROP POLICY IF EXISTS "Permitir criacao publica de clientes" ON public.clients;
CREATE POLICY "Permitir criacao publica de clientes" ON public.clients FOR INSERT WITH CHECK (true);

-- Policy for APPOINTMENTS: Allow anyone to insert
DROP POLICY IF EXISTS "Permitir criacao publica de agendamentos" ON public.appointments;
CREATE POLICY "Permitir criacao publica de agendamentos" ON public.appointments FOR INSERT WITH CHECK (true);

-- Also ensure UPDATE is allowed if we need to update client details? 
-- For now, we only INSERT. But maybe if they are an existing client booking again?
-- If they exist, we just read (SELECT is enabled).
