
-- Add new columns to remote_orders
ALTER TABLE public.remote_orders 
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'nao_pago',
  ADD COLUMN IF NOT EXISTS delivered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_whatsapp text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_sent boolean NOT NULL DEFAULT false;

-- Migrate existing data: paid=true -> 'pago_dinheiro' (default assumption)
UPDATE public.remote_orders SET payment_status = 'pago_dinheiro' WHERE paid = true;
