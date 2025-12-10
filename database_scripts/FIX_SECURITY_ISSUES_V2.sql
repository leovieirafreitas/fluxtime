-- ============================================
-- FIX SECURITY ISSUES (V2 - Corrected Signatures)
-- ============================================

-- 1. FIX MUTABLE SEARCH PATH ON FUNCTIONS
-- ============================================

ALTER FUNCTION get_dashboard_insights(uuid) SET search_path = public;
ALTER FUNCTION handle_new_user() SET search_path = public;
ALTER FUNCTION set_client_company_id() SET search_path = public; -- Corrected: No arguments


-- 2. RESTRICT WRITE POLICIES TO AUTHENTICATED USERS
-- ============================================

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
