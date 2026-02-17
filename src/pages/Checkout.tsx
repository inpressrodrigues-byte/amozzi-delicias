import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { data: settings } = useSiteSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState({ name: '', whatsapp: '', address: '', cep: '' });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);

  const deliveryZones: { name: string; fee: number }[] = (settings as any)?.delivery_zones || [];

  useEffect(() => {
    if (selectedZone && deliveryZones.length > 0) {
      const zone = deliveryZones.find(z => z.name === selectedZone);
      setDeliveryFee(zone?.fee || 0);
    } else {
      setDeliveryFee(0);
    }
  }, [selectedZone]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success('Localização obtida!');
        setGeoLoading(false);
      },
      () => {
        toast.error('Não foi possível obter sua localização');
        setGeoLoading(false);
      }
    );
  };

  const grandTotal = total + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
          <Button onClick={() => navigate('/')}>Voltar à Loja</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.whatsapp || !form.address || !form.cep) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }));

      const { data: orderData, error } = await supabase.from('orders').insert({
        customer_name: form.name,
        customer_whatsapp: form.whatsapp,
        customer_address: form.address,
        customer_cep: form.cep,
        items: orderItems,
        total: grandTotal,
        delivery_fee: deliveryFee,
        customer_lat: location?.lat || null,
        customer_lng: location?.lng || null,
        status: 'pending',
      } as any).select('tracking_code').single();

      if (error) throw error;

      const trackingCode = orderData?.tracking_code || '';

      // Send to WhatsApp
      const whatsappNumber = settings?.whatsapp_number?.replace(/\D/g, '') || '';
      const itemsList = items.map(i => `• ${i.quantity}x ${i.name} - R$${(i.price * i.quantity).toFixed(2)}`).join('\n');
      const feeText = deliveryFee > 0 ? `\n*Taxa de entrega:* R$${deliveryFee.toFixed(2)} (${selectedZone})` : '';
      const trackText = trackingCode ? `\n*Código de rastreio:* ${trackingCode}` : '';
      const locationText = location ? `\n*Localização:* https://www.google.com/maps?q=${location.lat},${location.lng}` : '';
      const message = `🧁 *Novo Pedido AMOZI*\n\n*Cliente:* ${form.name}\n*WhatsApp:* ${form.whatsapp}\n*Endereço:* ${form.address}\n*CEP:* ${form.cep}${locationText}\n\n*Itens:*\n${itemsList}${feeText}\n\n*Total: R$${grandTotal.toFixed(2)}*${trackText}`;

      if (whatsappNumber) {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
      }

      clearCart();
      toast.success('Pedido realizado com sucesso!');
      if (trackingCode) {
        navigate(`/rastrear/${trackingCode}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error('Erro ao realizar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Finalizar Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-2 bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Resumo do Pedido</h3>
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>🚚 Taxa de entrega ({selectedZone})</span>
                  <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome completo" />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro, cidade" />
              </div>
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
              </div>

              {deliveryZones.length > 0 && (
                <div>
                  <Label>Região de Entrega</Label>
                  <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu bairro/região" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryZones.map(z => (
                        <SelectItem key={z.name} value={z.name}>
                          {z.name} — R$ {z.fee.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Button type="button" variant="outline" className="w-full" onClick={requestLocation} disabled={geoLoading}>
                  {geoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                  {location ? '📍 Localização obtida' : 'Compartilhar minha localização'}
                </Button>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg" disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar Pedido'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
