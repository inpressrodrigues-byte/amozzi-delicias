
-- Add stock_quantity to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT null;

-- Add pix_qr_url to billing_settings
ALTER TABLE public.billing_settings ADD COLUMN IF NOT EXISTS pix_qr_url text DEFAULT null;
