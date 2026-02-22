
CREATE TABLE public.billing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_token text DEFAULT '',
  phone_number_id text DEFAULT '',
  pix_key text DEFAULT '',
  pix_name text DEFAULT '',
  billing_message text DEFAULT 'Olá {nome}! 😊 Passando para lembrar do seu pedido de {itens} que está pendente. Nossa chave PIX é: {pix}. Qualquer dúvida, estamos à disposição!',
  billing_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billing settings"
  ON public.billing_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.billing_settings (id) VALUES (gen_random_uuid());

-- Trigger for updated_at
CREATE TRIGGER update_billing_settings_updated_at
  BEFORE UPDATE ON public.billing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
