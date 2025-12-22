-- Add columns to store InfinitePay payment data
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS infinitepay_transaction_nsu TEXT,
ADD COLUMN IF NOT EXISTS infinitepay_slug TEXT,
ADD COLUMN IF NOT EXISTS infinitepay_receipt_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_transaction_nsu ON appointments(infinitepay_transaction_nsu);
CREATE INDEX IF NOT EXISTS idx_appointments_slug ON appointments(infinitepay_slug);
