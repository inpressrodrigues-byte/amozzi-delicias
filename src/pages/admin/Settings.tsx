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
import { Save, Plus, Trash2 } from 'lucide-react';

interface DeliveryZone {
  name: string;
  fee: number;
}

interface ProductCategory {
  key: string;
  label: string;
}

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
    instagram_url: '',
    ifood_url: '',
  });
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
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
        instagram_url: (settings as any).instagram_url || '',
        ifood_url: (settings as any).ifood_url || '',
      });
      const zones = (settings as any).delivery_zones;
      if (Array.isArray(zones)) setDeliveryZones(zones);
    }
  }, [settings]);

  const addZone = () => setDeliveryZones(prev => [...prev, { name: '', fee: 0 }]);
  const removeZone = (i: number) => setDeliveryZones(prev => prev.filter((_, idx) => idx !== i));
  const updateZone = (i: number, field: keyof DeliveryZone, value: string | number) => {
    setDeliveryZones(prev => prev.map((z, idx) => idx === i ? { ...z, [field]: value } : z));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logo_url = settings?.logo_url;
      let hero_image_url = (settings as any)?.hero_image_url;

      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `logo-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('site-assets').upload(path, logoFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }

      if (heroImageFile) {
        const ext = heroImageFile.name.split('.').pop();
        const path = `hero-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('site-assets').upload(path, heroImageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
        hero_image_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('site_settings')
        .update({ ...form, logo_url, hero_image_url, delivery_zones: deliveryZones } as any)
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
          <CardHeader><CardTitle>Imagem de Fundo do Banner</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(settings as any)?.hero_image_url && (
              <img src={(settings as any).hero_image_url} alt="Banner atual" className="h-32 w-full object-cover rounded-lg" />
            )}
            <Input type="file" accept="image/*" onChange={e => setHeroImageFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-muted-foreground">Recomendado: 1920x1080 ou maior</p>
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
          <CardHeader><CardTitle>Contato e Redes Sociais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Número do WhatsApp (com DDD)</Label>
              <Input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="5511999999999" />
            </div>
            <div>
              <Label>Instagram (URL ou @)</Label>
              <Input value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="https://instagram.com/amozi ou @amozi" />
            </div>
            <div>
              <Label>Link do iFood 🛵</Label>
              <Input value={form.ifood_url} onChange={e => setForm(f => ({ ...f, ifood_url: e.target.value }))} placeholder="https://www.ifood.com.br/delivery/..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Zonas de Entrega (Taxa por Bairro)</CardTitle>
              <Button size="sm" variant="outline" onClick={addZone}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveryZones.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma zona cadastrada. Sem taxa de entrega.</p>}
            {deliveryZones.map((zone, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Bairro / Região"
                  value={zone.name}
                  onChange={e => updateZone(i, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Taxa R$"
                  value={zone.fee}
                  onChange={e => updateZone(i, 'fee', parseFloat(e.target.value) || 0)}
                  className="w-28"
                />
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeZone(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Settings;
