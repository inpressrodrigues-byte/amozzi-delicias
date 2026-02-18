-- Tabela de cupons
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' ou 'fixed'
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric NOT NULL DEFAULT 0,
  max_uses integer, -- null = ilimitado
  uses_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
USING (active = true);

-- Adicionar coluna ifood_url em site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ifood_url text DEFAULT '';