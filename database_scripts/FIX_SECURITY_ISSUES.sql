-- ============================================
-- FIX SECURITY ISSUES
-- ============================================

-- 1. FIX MUTABLE SEARCH PATH ON FUNCTIONS
-- ============================================
-- Security Best Practice: Always set a fixed search_path for SECURITY DEFINER functions.

ALTER FUNCTION get_dashboard_insights(uuid) SET search_path = public;
ALTER FUNCTION handle_new_user() SET search_path = public;
-- Note: set_client_company_id might block if it's not in public or simple logic. Assuming public.
ALTER FUNCTION set_client_company_id(uuid) SET search_path = public;


-- 2. RESTRICT WRITE POLICIES TO AUTHENTICATED USERS
-- ============================================
-- The advisor warns that default policies apply to 'public' (anon + auth).
-- We should restrict sensitive write operations explicitly to 'authenticated'.

-- Services
ALTER POLICY "Users can insert own company services" ON services TO authenticated;
ALTER POLICY "Users can update own company services" ON services TO authenticated;
ALTER POLICY "Users can delete own company services" ON services TO authenticated;

-- Service Categories
ALTER POLICY "Users can insert their company service categories" ON service_categories TO authenticated;
ALTER POLICY "Users can update their company service categories" ON service_categories TO authenticated;
ALTER POLICY "Users can delete their company service categories" ON service_categories TO authenticated;

-- Service Collaborators
ALTER POLICY "Users can insert collaborators" ON service_collaborators TO authenticated;
ALTER POLICY "Users can update collaborators" ON service_collaborators TO authenticated;
ALTER POLICY "Users can delete collaborators" ON service_collaborators TO authenticated;

-- Companies
ALTER POLICY "Users can update own company" ON companies TO authenticated;
