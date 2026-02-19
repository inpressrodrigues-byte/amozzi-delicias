import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Loader2, Gift, CreditCard, MessageCircle, Tag, CheckCircle2 } from 'lucide-react';

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { data: settings } = useSiteSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState({ name: '', whatsapp: '', address: '', cep: '', email: '' });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loyalty, setLoyalty] = useState<{ purchase_count: number; discount_available: boolean } | null>(null);
  const [useDiscount, setUseDiscount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'whatsapp'>('stripe');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<{ discount_type: string; discount_value: number; code: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const deliveryZones: { name: string; fee: number }[] = ((settings as any)?.delivery_zones || []).filter((z: any) => z.name && z.name.trim() !== '');

  useEffect(() => {
    if (selectedZone && deliveryZones.length > 0) {
      const zone = deliveryZones.find(z => z.name === selectedZone);
      setDeliveryFee(zone?.fee || 0);
    } else {
      setDeliveryFee(0);
    }
  }, [selectedZone, deliveryZones]);

  // Loyalty lookup via secure RPC (no enumeration possible)
  useEffect(() => {
    const checkLoyalty = async () => {
      const phone = form.whatsapp.replace(/\D/g, '');
      if (phone.length < 10) { setLoyalty(null); return; }
      const { data } = await supabase.rpc('get_loyalty_by_whatsapp' as any, { p_whatsapp: phone });
      if (data && Array.isArray(data) && data.length > 0) {
        setLoyalty(data[0] as any);
      } else {
        setLoyalty(null);
      }
    };
    const timeout = setTimeout(checkLoyalty, 600);
    return () => clearTimeout(timeout);
  }, [form.whatsapp]);

  // CEP automático via ViaCEP
  useEffect(() => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(r => r.json())
      .then(data => {
        if (!data.erro) {
          const address = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean).join(', ');
          setForm(f => ({ ...f, address }));
          toast.success('Endereço preenchido automaticamente!');
        } else {
          toast.error('CEP não encontrado');
        }
      })
      .catch(() => toast.error('Erro ao buscar CEP'))
      .finally(() => setCepLoading(false));
  }, [form.cep]);

  // Client-side coupon preview (server re-validates on submit)
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('code, discount_type, discount_value, active, expires_at, max_uses, uses_count, min_order_value')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('active', true)
        .maybeSingle();
      if (error || !data) { toast.error('Cupom inválido ou inativo'); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error('Cupom expirado'); return; }
      if (data.max_uses && data.uses_count >= data.max_uses) { toast.error('Cupom esgotado'); return; }
      if (data.min_order_value > total) { toast.error(`Pedido mínimo: R$ ${Number(data.min_order_value).toFixed(2)}`); return; }
      setCoupon({ discount_type: data.discount_type, discount_value: data.discount_value, code: data.code });
      toast.success(`Cupom ${data.code} aplicado! 🎉`);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setCoupon(null); setCouponCode(''); };

  const couponDiscount = coupon
    ? coupon.discount_type === 'percentage'
      ? total * (coupon.discount_value / 100)
      : Math.min(coupon.discount_value, total)
    : 0;

  const loyaltyDiscount = useDiscount && loyalty?.discount_available ? total * 0.5 : 0;
  const discountAmount = Math.max(couponDiscount, loyaltyDiscount);
  const grandTotal = Math.max(0, total - discountAmount + deliveryFee);

  const requestLocation = () => {
    if (!navigator.geolocation) { toast.error('Seu navegador não suporta geolocalização'); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success('Localização obtida!'); setGeoLoading(false); },
      (err) => {
        if (err.code === 1) toast.error('Permissão de localização negada.');
        else if (err.code === 2) toast.error('Localização indisponível.');
        else toast.error('Tempo esgotado ao obter localização.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center p-10 bg-card rounded-2xl shadow-lg border border-border/50 max-w-sm mx-4">
          <span className="text-7xl block mb-6">🛒</span>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Carrinho Vazio</h2>
          <p className="text-muted-foreground mb-6">Você ainda não adicionou nenhum produto ao carrinho.</p>
          <Button onClick={() => navigate('/')} className="rounded-full bg-primary hover:bg-primary/90 px-8 py-5 text-base font-bold">
            Ver Cardápio
          </Button>
        </div>
      </div>
    );
  }

  // Validate form fields client-side before calling edge function
  const validateForm = (): boolean => {
    const phone = form.whatsapp.replace(/\D/g, '');
    const cep = form.cep.replace(/\D/g, '');
    if (!form.name.trim() || form.name.trim().length < 2) { toast.error('Nome inválido'); return false; }
    if (phone.length < 10) { toast.error('WhatsApp inválido'); return false; }
    if (!form.address.trim() || form.address.trim().length < 5) { toast.error('Endereço inválido'); return false; }
    if (cep.length !== 8) { toast.error('CEP inválido'); return false; }
    if (deliveryZones.length > 0 && !selectedZone) { toast.error('Selecione a região de entrega'); return false; }
    return true;
  };

  // Create order via secure edge function (server validates + recalculates prices)
  const createOrderViaEdgeFunction = async () => {
    const { data, error } = await supabase.functions.invoke('create-order', {
      body: {
        customer_name: form.name,
        customer_whatsapp: form.whatsapp.replace(/\D/g, ''),
        customer_address: form.address,
        customer_cep: form.cep.replace(/\D/g, ''),
        customer_lat: location?.lat || null,
        customer_lng: location?.lng || null,
        item_ids: items.map(i => ({ id: i.id, quantity: i.quantity })),
        delivery_zone_name: selectedZone || null,
        use_loyalty_discount: useDiscount && loyalty?.discount_available,
        coupon_code: coupon?.code || null,
        payment_method: paymentMethod,
      },
    });
    if (error) throw new Error(error.message || 'Erro ao criar pedido');
    if (data?.error) throw new Error(data.error);
    return data as { tracking_code: string; order_id: string; grand_total: number; items: any[]; delivery_fee: number; discount_amount: number };
  };

  const handleStripePayment = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const orderResult = await createOrderViaEdgeFunction();

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          order_id: orderResult.order_id,
          customer_email: form.email || undefined,
        },
      });

      if (error) throw error;
      if (data?.url) {
        clearCart();
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pagamento. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppOrder = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const orderResult = await createOrderViaEdgeFunction();

      const whatsappNumber = settings?.whatsapp_number?.replace(/\D/g, '') || '';
      const itemsList = orderResult.items.map((i: any) => `• ${i.quantity}x ${i.name} - R$${(i.price * i.quantity).toFixed(2)}`).join('\n');
      const feeText = orderResult.delivery_fee > 0 ? `\n*Taxa de entrega:* R$${orderResult.delivery_fee.toFixed(2)} (${selectedZone})` : '';
      const discountText = orderResult.discount_amount > 0 ? `\n*Desconto:* -R$${orderResult.discount_amount.toFixed(2)}` : '';
      const trackText = orderResult.tracking_code ? `\n*Código de rastreio:* ${orderResult.tracking_code}` : '';
      const locationText = location ? `\n*Localização:* https://www.google.com/maps?q=${location.lat},${location.lng}` : '';
      const message = `🧁 *Novo Pedido AMOZI*\n\n*Cliente:* ${form.name}\n*WhatsApp:* ${form.whatsapp}\n*Endereço:* ${form.address}\n*CEP:* ${form.cep}${locationText}\n\n*Itens:*\n${itemsList}${feeText}${discountText}\n\n*Total: R$${orderResult.grand_total.toFixed(2)}*${trackText}`;

      if (whatsappNumber) {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
      }

      clearCart();
      toast.success('Pedido realizado com sucesso!');
      if (orderResult.tracking_code) {
        navigate(`/rastrear/${orderResult.tracking_code}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'stripe') {
      handleStripePayment();
    } else {
      handleWhatsAppOrder();
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Finalizar Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Order Summary */}
            <div className="mb-6 space-y-2 bg-muted/30 p-5 rounded-xl border border-border/30">
              <h3 className="font-display font-bold text-lg mb-3">Resumo do Pedido</h3>
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-semibold">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
              {coupon && (
                <div className="flex justify-between text-sm text-primary font-medium">
                  <span>🏷️ Cupom {coupon.code}</span>
                  <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm text-primary font-medium">
                  <span>🎉 Desconto Fidelidade (50%)</span>
                  <span>- R$ {loyaltyDiscount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>🚚 Taxa de entrega ({selectedZone})</span>
                  <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary font-display">R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome" className="rounded-lg" maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" className="rounded-lg" maxLength={20} />
                </div>
              </div>

              {loyalty && (
                <div className="flex items-center gap-2 bg-primary/5 p-3 rounded-lg border border-primary/20">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground flex-1">
                    {loyalty.discount_available
                      ? '🎉 Você tem um desconto de 50% disponível!'
                      : `${loyalty.purchase_count}/10 compras para 50% de desconto`}
                  </span>
                  {loyalty.discount_available && (
                    <Badge
                      className="cursor-pointer"
                      variant={useDiscount ? 'default' : 'outline'}
                      onClick={() => setUseDiscount(!useDiscount)}
                    >
                      {useDiscount ? '✓ Aplicado' : 'Usar'}
                    </Badge>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seu@email.com" className="rounded-lg" maxLength={254} />
              </div>

              <div>
                <Label htmlFor="address">Endereço Completo</Label>
                <Input id="address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro, cidade" className="rounded-lg" maxLength={300} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cep">CEP {cepLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</Label>
                  <Input id="cep" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" className="rounded-lg" maxLength={9} />
                </div>
                {deliveryZones.length > 0 && (
                  <div>
                    <Label>Região de Entrega</Label>
                    <Select value={selectedZone} onValueChange={setSelectedZone}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Selecione" />
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
              </div>

              {/* Cupom */}
              <div>
                <Label>Cupom de Desconto</Label>
                {coupon ? (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-mono font-bold text-primary flex-1">{coupon.code}</span>
                    <button onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-destructive">remover</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Digite o cupom"
                      className="rounded-lg font-mono uppercase"
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      maxLength={30}
                    />
                    <Button type="button" variant="outline" onClick={applyCoupon} disabled={couponLoading} className="flex-shrink-0">
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Button type="button" variant="outline" className="w-full rounded-lg" onClick={requestLocation} disabled={geoLoading}>
                  {geoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                  {location ? '📍 Localização obtida' : 'Compartilhar minha localização'}
                </Button>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <Label className="text-base font-display font-bold">Forma de Pagamento</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      paymentMethod === 'stripe'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <CreditCard className={`h-6 w-6 mx-auto mb-2 ${paymentMethod === 'stripe' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-semibold block">Cartão / PIX</span>
                    <span className="text-xs text-muted-foreground">Pagamento online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('whatsapp')}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      paymentMethod === 'whatsapp'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <MessageCircle className={`h-6 w-6 mx-auto mb-2 ${paymentMethod === 'whatsapp' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-semibold block">WhatsApp</span>
                    <span className="text-xs text-muted-foreground">Combinar pagamento</span>
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 rounded-full font-bold text-lg py-6" size="lg" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processando...</>
                ) : paymentMethod === 'stripe' ? (
                  <><CreditCard className="h-5 w-5 mr-2" /> Pagar R$ {grandTotal.toFixed(2).replace('.', ',')}</>
                ) : (
                  <><MessageCircle className="h-5 w-5 mr-2" /> Enviar Pedido</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
