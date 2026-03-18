
-- Add payment_due_date to remote_orders for "vai pagar em" feature
ALTER TABLE public.remote_orders ADD COLUMN IF NOT EXISTS payment_due_date date;

-- Create admin_logs table for activity tracking
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  action text NOT NULL,
  details text,
  table_name text,
  record_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only the main admin (inpress.rodrigues) can view logs
CREATE POLICY "Main admin can view logs" ON public.admin_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u 
      WHERE u.id = auth.uid() 
      AND u.email LIKE 'inpress.rodrigues%'
    )
  );

-- Any authenticated admin can insert logs  
CREATE POLICY "Admins can insert logs" ON public.admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for admin_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_logs;
