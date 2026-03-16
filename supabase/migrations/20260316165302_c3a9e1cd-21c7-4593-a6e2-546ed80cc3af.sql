CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  quantity_used numeric NOT NULL DEFAULT 0,
  quantity_unit text NOT NULL DEFAULT 'g',
  package_price numeric NOT NULL DEFAULT 0,
  package_quantity numeric NOT NULL DEFAULT 1,
  package_unit text NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recipe ingredients" ON public.recipe_ingredients
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view recipe ingredients" ON public.recipe_ingredients
  FOR SELECT TO public USING (true);