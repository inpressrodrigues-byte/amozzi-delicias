
-- Remove overly permissive policies since SECURITY DEFINER functions handle writes
DROP POLICY "Anyone can create loyalty" ON public.loyalty;
DROP POLICY "Anyone can update loyalty" ON public.loyalty;
