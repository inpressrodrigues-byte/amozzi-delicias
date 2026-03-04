
-- Table for manual internal control records (purchases, sales, entries, exits)
CREATE TABLE public.manual_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'compra', -- compra, venda, entrada, saida
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'geral',
  supplier TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage manual records"
ON public.manual_records
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_manual_records_updated_at
BEFORE UPDATE ON public.manual_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
