
CREATE TABLE public.custom_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_whatsapp text NOT NULL DEFAULT '',
  weight_kg numeric NOT NULL DEFAULT 1,
  flavors jsonb NOT NULL DEFAULT '[]'::jsonb,
  desired_date date,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  quoted_price numeric DEFAULT 0,
  cost_estimate numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom orders" ON public.custom_orders
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert custom orders" ON public.custom_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
