
-- Loyalty table: track purchases by WhatsApp number
CREATE TABLE public.loyalty (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_whatsapp TEXT NOT NULL UNIQUE,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  discount_available BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty ENABLE ROW LEVEL SECURITY;

-- Anyone can read their own loyalty (by whatsapp lookup)
CREATE POLICY "Anyone can view loyalty by whatsapp"
ON public.loyalty FOR SELECT USING (true);

-- Anyone can insert loyalty records (created during checkout)
CREATE POLICY "Anyone can create loyalty"
ON public.loyalty FOR INSERT WITH CHECK (true);

-- Anyone can update loyalty (increment count)
CREATE POLICY "Anyone can update loyalty"
ON public.loyalty FOR UPDATE USING (true);

-- Admins can manage all
CREATE POLICY "Admins can manage loyalty"
ON public.loyalty FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_loyalty_updated_at
BEFORE UPDATE ON public.loyalty
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment loyalty after order
CREATE OR REPLACE FUNCTION public.increment_loyalty(p_whatsapp TEXT)
RETURNS TABLE(purchase_count INTEGER, discount_available BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_discount BOOLEAN;
BEGIN
  INSERT INTO public.loyalty (customer_whatsapp, purchase_count, discount_available)
  VALUES (p_whatsapp, 1, false)
  ON CONFLICT (customer_whatsapp) DO UPDATE
    SET purchase_count = loyalty.purchase_count + 1,
        discount_available = CASE WHEN loyalty.purchase_count + 1 >= 10 THEN true ELSE loyalty.discount_available END
  RETURNING loyalty.purchase_count, loyalty.discount_available INTO v_count, v_discount;
  
  RETURN QUERY SELECT v_count, v_discount;
END;
$$;

-- Function to use loyalty discount
CREATE OR REPLACE FUNCTION public.use_loyalty_discount(p_whatsapp TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.loyalty 
  SET discount_available = false, purchase_count = 0
  WHERE customer_whatsapp = p_whatsapp AND discount_available = true;
END;
$$;
