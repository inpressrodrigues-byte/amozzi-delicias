ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS print_settings jsonb DEFAULT '{
  "auto_print_enabled": false,
  "header_title": "AMOZI",
  "header_subtitle": "Delícias no Pote",
  "footer_message": "Obrigada pela preferência! 💕",
  "extra_info": "",
  "show_logo": false,
  "show_tracking_code": true,
  "show_whatsapp": true,
  "show_address": true,
  "show_notes": true,
  "font_size": 11,
  "paper_width_mm": 58
}'::jsonb;