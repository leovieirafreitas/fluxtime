-- RESTORE AUTHENTICATED ACCESS FOR DASHBOARD (Fixes "Data Not Loading")

-- 1. COMPANIES: Allow authenticated users to VIEW their own company details
-- This relies on the user's profile pointing to the company.
CREATE POLICY "Users can view own company"
ON companies
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid()
    )
);

-- 2. PROFILES: Allow authenticated users to VIEW other profiles in the same company
-- Essential for "Team" page, "Service Collaborators" selection, etc.
CREATE POLICY "Users can view colleague profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid()
    )
);

-- 3. SERVICE COLLABORATORS: Allow authenticated users to VIEW who works on what service
CREATE POLICY "Users can view company collaborators"
ON service_collaborators
FOR SELECT
TO authenticated
USING (
    service_id IN (
        SELECT id 
        FROM services 
        WHERE company_id IN (
            SELECT company_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    )
);
