
-- Add billing_status column to remote_orders for tracking: pendente -> cobrado -> pago
ALTER TABLE public.remote_orders 
ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'pendente';

-- Comment: pendente = awaiting billing, cobrado = message sent, pago = confirmed paid
