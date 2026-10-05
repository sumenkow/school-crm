-- Fix AUD-006: Add 'enrolled' to lead_status
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'enrolled';

-- Fix AUD-007: Add missing statuses to payment_status
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cancelled';
