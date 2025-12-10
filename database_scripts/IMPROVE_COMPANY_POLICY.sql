-- IMPROVE COMPANY ACCESS POLICY
-- Allow viewing company if you are the OWNER, even if your profile.company_id isn't pointing there yet.
-- This fixes issues immediately after company creation or switching.

DROP POLICY IF EXISTS "Users can view own company" ON companies;

CREATE POLICY "Users can view own company"
ON companies
FOR SELECT
TO authenticated
USING (
    id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    owner_id = auth.uid()
);
