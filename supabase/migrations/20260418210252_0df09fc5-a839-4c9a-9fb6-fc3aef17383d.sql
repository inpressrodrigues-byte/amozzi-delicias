-- Tabela de lotes de produção (cada lote = um lançamento de produção de um sabor)
CREATE TABLE public.production_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  manufactured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE NOT NULL,
  shelf_life_days INTEGER NOT NULL DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices úteis
CREATE INDEX idx_production_batches_product ON public.production_batches(product_id);
CREATE INDEX idx_production_batches_expires ON public.production_batches(expires_at);
CREATE INDEX idx_production_batches_manufactured ON public.production_batches(manufactured_at);

-- RLS
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage production batches"
  ON public.production_batches
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para calcular validade automaticamente
CREATE OR REPLACE FUNCTION public.set_batch_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.shelf_life_days IS NULL OR NEW.shelf_life_days <= 0 THEN
    NEW.shelf_life_days := 7;
  END IF;
  NEW.expires_at := NEW.manufactured_at + (NEW.shelf_life_days || ' days')::interval;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_batch_expiry
BEFORE INSERT OR UPDATE OF manufactured_at, shelf_life_days ON public.production_batches
FOR EACH ROW
EXECUTE FUNCTION public.set_batch_expiry();

-- Trigger para updated_at
CREATE TRIGGER trg_production_batches_updated_at
BEFORE UPDATE ON public.production_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();