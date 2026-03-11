
-- Create customers table to store customer database
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text DEFAULT '',
  sector text DEFAULT '',
  purchase_history jsonb DEFAULT '[]'::jsonb,
  total_orders integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint on name to avoid duplicates
CREATE UNIQUE INDEX customers_name_unique ON public.customers (lower(name));

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Admin can manage customers
CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
