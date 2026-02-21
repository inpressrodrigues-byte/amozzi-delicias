
CREATE TABLE public.remote_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  paid BOOLEAN NOT NULL DEFAULT false,
  separated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.remote_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage remote orders"
  ON public.remote_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_remote_orders_updated_at
  BEFORE UPDATE ON public.remote_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
