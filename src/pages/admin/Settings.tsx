import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { allNavItems } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Plus, Trash2, QrCode, Clock, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

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
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([
    { key: 'bolo_no_pote', label: 'Bolo no Pote' },
    { key: 'marmita_salgada', label: 'Marmita Salgada' },
  ]);
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [storeHours, setStoreHours] = useState({
    enabled: false,
    weekday_open: '19:30',
    weekday_close: '22:00',
    weekend_open: '10:00',
    weekend_close: '22:00',
    closed_message: 'Estamos fechados no momento. Os pedidos serão separados no próximo horário de funcionamento.',
  });
  const [hiddenMenus, setHiddenMenus] = useState<string[]>([]);

  const { data: billingSettings } = useQuery({
    queryKey: ['billing-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('billing_settings').select('*').limit(1).single();
      return data;
    },
  });

  useEffect(() => {
    if (billingSettings) {
      setPixKey(billingSettings.pix_key || '');
      setPixName(billingSettings.pix_name || '');
    }
  }, [billingSettings]);

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
      const cats = (settings as any).product_categories;
      if (Array.isArray(cats) && cats.length > 0) setProductCategories(cats);
      const sh = (settings as any).store_hours;
      if (sh) setStoreHours(prev => ({ ...prev, ...sh }));
      const hm = (settings as any).hidden_admin_menus;
      if (Array.isArray(hm)) setHiddenMenus(hm);
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
        .update({ ...form, logo_url, hero_image_url, delivery_zones: deliveryZones, product_categories: productCategories, store_hours: storeHours, hidden_admin_menus: hiddenMenus } as any)
        .eq('id', settings!.id);

      if (error) throw error;

      // Save PIX settings
      if (billingSettings?.id) {
        await supabase.from('billing_settings').update({ pix_key: pixKey, pix_name: pixName }).eq('id', billingSettings.id);
      } else {
        await supabase.from('billing_settings').insert({ pix_key: pixKey, pix_name: pixName } as any);
      }

      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Chave PIX (Pagamento)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Titular</Label>
              <Input value={pixName} onChange={e => setPixName(e.target.value)} placeholder="Nome que aparece no PIX" />
            </div>
            <div>
              <Label>Chave PIX (copia e cola)</Label>
              <Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
            <p className="text-xs text-muted-foreground">Essa chave será exibida para o cliente copiar e colar ao escolher pagamento via PIX.</p>
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
              <CardTitle>Categorias de Produtos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {productCategories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Chave (ex: doces)"
                  value={cat.key}
                  onChange={e => setProductCategories(prev => prev.map((c, idx) => idx === i ? { ...c, key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') } : c))}
                  className="w-40"
                />
                <Input
                  placeholder="Nome exibido (ex: Doces)"
                  value={cat.label}
                  onChange={e => setProductCategories(prev => prev.map((c, idx) => idx === i ? { ...c, label: e.target.value } : c))}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setProductCategories(prev => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Chave (ex: salgados)"
                value={newCatKey}
                onChange={e => setNewCatKey(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                className="w-40"
              />
              <Input
                placeholder="Nome (ex: Salgados)"
                value={newCatLabel}
                onChange={e => setNewCatLabel(e.target.value)}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  if (newCatKey && newCatLabel) {
                    setProductCategories(prev => [...prev, { key: newCatKey, label: newCatLabel }]);
                    setNewCatKey('');
                    setNewCatLabel('');
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">As categorias aparecem no cardápio público e no formulário de produtos.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Horário de Funcionamento</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="store-hours-toggle" className="text-sm text-muted-foreground">Ativar</Label>
                <Switch
                  id="store-hours-toggle"
                  checked={storeHours.enabled}
                  onCheckedChange={v => setStoreHours(h => ({ ...h, enabled: v }))}
                />
              </div>
            </div>
          </CardHeader>
          {storeHours.enabled && (
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Segunda a Sexta</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Abre às</Label>
                    <Input type="time" value={storeHours.weekday_open} onChange={e => setStoreHours(h => ({ ...h, weekday_open: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Fecha às</Label>
                    <Input type="time" value={storeHours.weekday_close} onChange={e => setStoreHours(h => ({ ...h, weekday_close: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Sábado e Domingo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Abre às</Label>
                    <Input type="time" value={storeHours.weekend_open} onChange={e => setStoreHours(h => ({ ...h, weekend_open: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Fecha às</Label>
                    <Input type="time" value={storeHours.weekend_close} onChange={e => setStoreHours(h => ({ ...h, weekend_close: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <Label>Mensagem quando fechado</Label>
                <Input
                  value={storeHours.closed_message}
                  onChange={e => setStoreHours(h => ({ ...h, closed_message: e.target.value }))}
                  placeholder="Ex: Estamos fechados no momento..."
                  maxLength={300}
                />
              </div>
              <p className="text-xs text-muted-foreground">Quando ativado, o site mostra se a loja está aberta ou fechada. Pedidos ainda podem ser feitos, mas o cliente será informado sobre o horário.</p>
            </CardContent>
          )}
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
