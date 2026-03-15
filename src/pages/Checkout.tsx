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
import { ArrowLeft, MapPin, Loader2, Gift, CreditCard, Tag, CheckCircle2, Copy, QrCode } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
  const [paymentMethod, setPaymentMethod] = useState<'cartao' | 'pix'>('pix');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<{ discount_type: string; discount_value: number; code: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [pixOrderResult, setPixOrderResult] = useState<{ tracking_code: string; grand_total: number } | null>(null);

  // Fetch PIX settings from billing_settings
  const { data: billingSettings } = useQuery({
    queryKey: ['billing-settings-public'],
    queryFn: async () => {
      const { data } = await supabase.from('billing_settings').select('pix_key, pix_name').limit(1).single();
      return data;
    },
  });

  const deliveryZones: { name: string; fee: number }[] = ((settings as any)?.delivery_zones || []).filter((z: any) => z.name && z.name.trim() !== '');

  useEffect(() => {
    if (selectedZone && deliveryZones.length > 0) {
      const zone = deliveryZones.find(z => z.name === selectedZone);
      setDeliveryFee(zone?.fee || 0);
    } else {
      setDeliveryFee(0);
    }
  }, [selectedZone, deliveryZones]);

  // Loyalty lookup via secure RPC
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

  // Client-side coupon preview
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

  if (pixOrderResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md w-full shadow-xl border-border/50">
          <CardHeader className="text-center">
            <div className="text-6xl mb-3">💰</div>
            <CardTitle className="font-display text-2xl">Pagamento via PIX</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Copie a chave PIX abaixo, faça o pagamento e envie o comprovante pelo WhatsApp.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total a pagar:</p>
              <p className="text-3xl font-display font-bold text-primary">
                R$ {pixOrderResult.grand_total.toFixed(2).replace('.', ',')}
              </p>
            </div>

            {billingSettings?.pix_name && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Titular:</p>
                <p className="font-semibold text-sm">{billingSettings.pix_name}</p>
              </div>
            )}

            {billingSettings?.pix_key ? (
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2 text-center">Chave PIX (copia e cola):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background rounded-lg px-3 py-2.5 text-sm font-mono break-all border border-border">
                    {billingSettings.pix_key}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(billingSettings.pix_key!);
                      toast.success('Chave PIX copiada!');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-center text-muted-foreground">Chave PIX não configurada. Entre em contato pelo WhatsApp.</p>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Código de rastreio:</p>
              <p className="font-mono font-bold text-primary text-lg">{pixOrderResult.tracking_code}</p>
            </div>

            <div className="flex flex-col gap-2">
              {settings?.whatsapp_number && (
                <Button
                  className="w-full rounded-full bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white font-bold"
                  onClick={() => {
                    const whatsappNumber = settings.whatsapp_number?.replace(/\D/g, '') || '';
                    const msg = `✅ Olá! Fiz um pedido via PIX.\n\n*Código:* ${pixOrderResult.tracking_code}\n*Valor:* R$ ${pixOrderResult.grand_total.toFixed(2)}\n\nVou enviar o comprovante!`;
                    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                >
                  📱 Enviar Comprovante pelo WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => navigate(`/rastrear/${pixOrderResult.tracking_code}`)}
              >
                Rastrear meu Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const createOrderViaEdgeFunction = async (method: string) => {
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
        payment_method: method,
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
      const orderResult = await createOrderViaEdgeFunction('cartao');
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { order_id: orderResult.order_id, customer_email: form.email || undefined },
      });
      if (error) throw error;
      if (data?.url) {
        clearCart();
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePixPayment = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const orderResult = await createOrderViaEdgeFunction('pix');
      clearCart();
      setPixOrderResult({ tracking_code: orderResult.tracking_code, grand_total: orderResult.grand_total });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'cartao') {
      handleStripePayment();
    } else {
      handlePixPayment();
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
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <QrCode className={`h-6 w-6 mx-auto mb-2 ${paymentMethod === 'pix' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-semibold block">PIX</span>
                    <span className="text-xs text-muted-foreground">Transferência instantânea</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao')}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      paymentMethod === 'cartao'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <CreditCard className={`h-6 w-6 mx-auto mb-2 ${paymentMethod === 'cartao' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-semibold block">Cartão de Crédito</span>
                    <span className="text-xs text-muted-foreground">Pagamento online seguro</span>
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 rounded-full font-bold text-lg py-6" size="lg" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processando...</>
                ) : paymentMethod === 'cartao' ? (
                  <><CreditCard className="h-5 w-5 mr-2" /> Pagar R$ {grandTotal.toFixed(2).replace('.', ',')}</>
                ) : (
                  <><QrCode className="h-5 w-5 mr-2" /> Finalizar com PIX — R$ {grandTotal.toFixed(2).replace('.', ',')}</>
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
