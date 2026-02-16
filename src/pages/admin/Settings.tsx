import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const Settings = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    hero_title: '',
    hero_subtitle: '',
    about_text: '',
    whatsapp_number: '',
    primary_color: '#C65A7C',
    secondary_color: '#E8A7B8',
    accent_color: '#C49A4A',
    background_color: '#F4F1EC',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        hero_title: settings.hero_title || '',
        hero_subtitle: settings.hero_subtitle || '',
        about_text: settings.about_text || '',
        whatsapp_number: settings.whatsapp_number || '',
        primary_color: settings.primary_color || '#C65A7C',
        secondary_color: settings.secondary_color || '#E8A7B8',
        accent_color: settings.accent_color || '#C49A4A',
        background_color: settings.background_color || '#F4F1EC',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let logo_url = settings?.logo_url;

      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `logo-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('site-assets').upload(path, logoFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('site_settings')
        .update({ ...form, logo_url })
        .eq('id', settings!.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('Configurações salvas!');
    } catch (err) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <AdminLayout><p>Carregando...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Personalização</h1>
        <Button onClick={handleSave} disabled={saving} className="bg-primary">
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {settings?.logo_url && <img src={settings.logo_url} alt="Logo atual" className="h-20 w-auto" />}
            <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Textos da Página</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Título do Banner</Label><Input value={form.hero_title} onChange={e => setForm(f => ({ ...f, hero_title: e.target.value }))} /></div>
            <div><Label>Subtítulo do Banner</Label><Input value={form.hero_subtitle} onChange={e => setForm(f => ({ ...f, hero_subtitle: e.target.value }))} /></div>
            <div><Label>Texto Sobre Nós</Label><Textarea value={form.about_text} onChange={e => setForm(f => ({ ...f, about_text: e.target.value }))} rows={5} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cores do Tema</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: 'primary_color', label: 'Rosa Principal' },
                { key: 'secondary_color', label: 'Rosa Blush' },
                { key: 'accent_color', label: 'Dourado' },
                { key: 'background_color', label: 'Fundo' },
              ].map(color => (
                <div key={color.key}>
                  <Label>{color.label}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={(form as any)[color.key]}
                      onChange={e => setForm(f => ({ ...f, [color.key]: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border"
                    />
                    <Input
                      value={(form as any)[color.key]}
                      onChange={e => setForm(f => ({ ...f, [color.key]: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>WhatsApp</CardTitle></CardHeader>
          <CardContent>
            <Label>Número do WhatsApp (com DDD)</Label>
            <Input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="5511999999999" />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Settings;
