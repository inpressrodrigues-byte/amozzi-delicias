
CREATE TABLE public.product_nutrition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  calories numeric DEFAULT 0,
  total_fat numeric DEFAULT 0,
  saturated_fat numeric DEFAULT 0,
  trans_fat numeric DEFAULT 0,
  cholesterol numeric DEFAULT 0,
  sodium numeric DEFAULT 0,
  total_carbs numeric DEFAULT 0,
  dietary_fiber numeric DEFAULT 0,
  total_sugars numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  serving_size text DEFAULT '1 pote (200g)',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

ALTER TABLE public.product_nutrition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage nutrition" ON public.product_nutrition FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view nutrition" ON public.product_nutrition FOR SELECT
  USING (true);

CREATE TRIGGER update_product_nutrition_updated_at
  BEFORE UPDATE ON public.product_nutrition
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
