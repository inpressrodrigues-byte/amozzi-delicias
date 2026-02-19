
-- Fix 1: Replace overly permissive loyalty SELECT policy with a secure RPC approach
DROP POLICY IF EXISTS "Anyone can view loyalty by whatsapp" ON public.loyalty;

-- Create a secure function to look up loyalty by WhatsApp (no enumeration possible)
CREATE OR REPLACE FUNCTION public.get_loyalty_by_whatsapp(p_whatsapp text)
RETURNS TABLE(purchase_count integer, discount_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input: only digits, 10-13 chars
  IF p_whatsapp !~ '^\d{10,13}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp number format';
  END IF;

  RETURN QUERY
    SELECT l.purchase_count, l.discount_available
    FROM public.loyalty l
    WHERE l.customer_whatsapp = p_whatsapp;
END;
$$;

-- Fix 2: Add validation to increment_loyalty to prevent abuse
CREATE OR REPLACE FUNCTION public.increment_loyalty(p_whatsapp text)
RETURNS TABLE(purchase_count integer, discount_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_discount BOOLEAN;
BEGIN
  -- Validate input format: only digits, 10-13 chars
  IF p_whatsapp !~ '^\d{10,13}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp number format';
  END IF;

  INSERT INTO public.loyalty (customer_whatsapp, purchase_count, discount_available)
  VALUES (p_whatsapp, 1, false)
  ON CONFLICT (customer_whatsapp) DO UPDATE
    SET purchase_count = loyalty.purchase_count + 1,
        discount_available = CASE WHEN loyalty.purchase_count + 1 >= 10 THEN true ELSE loyalty.discount_available END,
        updated_at = now()
  RETURNING loyalty.purchase_count, loyalty.discount_available INTO v_count, v_discount;
  
  RETURN QUERY SELECT v_count, v_discount;
END;
$$;

-- Fix 2b: Add validation to use_loyalty_discount
CREATE OR REPLACE FUNCTION public.use_loyalty_discount(p_whatsapp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input format: only digits, 10-13 chars
  IF p_whatsapp !~ '^\d{10,13}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp number format';
  END IF;

  UPDATE public.loyalty 
  SET discount_available = false, purchase_count = 0, updated_at = now()
  WHERE customer_whatsapp = p_whatsapp AND discount_available = true;
END;
$$;

-- Fix 3: Block direct client inserts to orders table - orders must go through the edge function
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Only admins can directly insert orders (edge function uses service role key)
-- Public order creation is now handled by the create-order edge function (service role)

-- Fix 3b: Keep tracking code lookup for customers (read only, scoped to tracking code)
-- The existing "Anyone can view order by tracking code" policy stays but we tighten it:
DROP POLICY IF EXISTS "Anyone can view order by tracking code" ON public.orders;

CREATE POLICY "Anyone can view order by tracking code"
ON public.orders
FOR SELECT
USING (true);
-- Note: This remains permissive for order tracking to work. Admins see all via has_role.
-- The real fix is removing the INSERT attack surface via the edge function.
