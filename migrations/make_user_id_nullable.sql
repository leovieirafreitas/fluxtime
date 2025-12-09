-- Make user_id nullable in clients table
-- This allows creating clients from public booking without authentication

ALTER TABLE clients 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a comment explaining this
COMMENT ON COLUMN clients.user_id IS 'Optional reference to authenticated user. NULL for clients created via public booking.';
