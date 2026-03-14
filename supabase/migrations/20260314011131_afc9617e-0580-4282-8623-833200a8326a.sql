
-- 1. First admin trigger: auto-assign admin role to first registered user
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_first_admin_assignment
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_admin();

-- 2. Add source column to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS source text DEFAULT 'site';

-- 3. Add tags column to products (for fitness, zero sugar labels)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- 4. Allow admins to view all profiles (needed for admin management)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
