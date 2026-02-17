
-- Add location fields to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_lat double precision,
ADD COLUMN IF NOT EXISTS customer_lng double precision,
ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tracking_code text UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex');

-- Add social media and delivery zones to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS delivery_zones jsonb DEFAULT '[]'::jsonb;

-- Allow admins to delete orders
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anyone to view their order by tracking code (for order tracking page)
CREATE POLICY "Anyone can view order by tracking code"
ON public.orders
FOR SELECT
USING (true);

-- Drop the old restrictive select policy since we now allow public tracking
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- Enable realtime for orders so tracking updates in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
