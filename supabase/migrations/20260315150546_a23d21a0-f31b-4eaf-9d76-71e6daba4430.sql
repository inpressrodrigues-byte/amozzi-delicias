
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view order by tracking code" ON public.orders;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
