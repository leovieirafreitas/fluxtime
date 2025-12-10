-- FIX INFINITE RECURSION IN PROFILES

-- 1. Create a helper function to get the current user's company ID
-- This function is SECURITY DEFINER, meaning it runs with the privileges of the creator (admin).
-- It bypasses RLS on the profiles table, preventing the recursion loop.
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Users can view colleague profiles" ON profiles;

-- 3. Re-create the policy using the safe function
CREATE POLICY "Users can view colleague profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    company_id = get_my_company_id()
);
