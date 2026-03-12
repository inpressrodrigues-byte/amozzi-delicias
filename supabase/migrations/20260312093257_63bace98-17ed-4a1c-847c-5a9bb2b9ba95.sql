
-- Add customer portal columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address text;

-- Fix existing orders: set billing_status to 'pago' for already-paid orders
UPDATE public.remote_orders SET billing_status = 'pago' WHERE payment_status != 'nao_pago' AND billing_status = 'pendente';

-- Create RLS policy for public customer self-service (read-only via edge function, so no RLS needed for anon)
