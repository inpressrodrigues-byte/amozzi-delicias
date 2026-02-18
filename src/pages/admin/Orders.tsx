import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { toast } from 'sonner';
import { Trash2, MapPin, Check } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'preparing', label: 'Preparando', color: 'bg-blue-100 text-blue-800' },
  { value: 'delivering', label: 'Saiu para Entrega', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Entregue', color: 'bg-green-100 text-green-800' },
];

const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;
const statusColor = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.color || '';
const statusIdx = (s: string) => STATUS_OPTIONS.findIndex(o => o.value === s);

const Orders = () => {
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendWhatsAppNotification = async (order: any, newStatus: string) => {
    const customerPhone = order.customer_whatsapp?.replace(/\D/g, '');
    if (!customerPhone) return;
    const trackingCode = order.tracking_code || '';
    const origin = window.location.origin;

    let loyaltyMsg = '';
    if (newStatus === 'delivered') {
      const { data: loyalty } = await supabase
        .from('loyalty')
        .select('purchase_count, discount_available')
        .eq('customer_whatsapp', customerPhone)
        .maybeSingle();
      if (loyalty) {
        const count = loyalty.purchase_count;
        const remaining = 10 - (count % 10);
        if (loyalty.discount_available) {
          loyaltyMsg = `\n\n🎉 *Parabéns! Você completou 10 pedidos!*\nVocê ganhou *50% de desconto* no seu próximo pedido. Use no checkout!`;
        } else {
          loyaltyMsg = `\n\n⭐ *Fidelidade AMOZI:* ${count} pedido${count !== 1 ? 's' : ''} realizado${count !== 1 ? 's' : ''}\nFaltam apenas *${remaining} pedido${remaining !== 1 ? 's' : ''}* para ganhar *50% de desconto*! 🎁`;
        }
      }
    }

    const statusMessages: Record<string, string> = {
      preparing: `🍰 *AMOZI Delícias no Pote*\n\nOlá, ${order.customer_name}! Seu pedido está sendo preparado com muito carinho! 💕\n\n🔗 Rastreie: ${origin}/rastrear/${trackingCode}`,
      delivering: `🚚 *AMOZI Delícias no Pote*\n\nOlá, ${order.customer_name}! Seu pedido *saiu para entrega* e logo chegará! 🎉\n\n🔗 Rastreie: ${origin}/rastrear/${trackingCode}`,
      delivered: `✅ *AMOZI Delícias no Pote*\n\nOlá, ${order.customer_name}! Seu pedido foi *entregue*!\n\nEsperamos que você adore! Obrigada pela preferência! 💕${loyaltyMsg}\n\n🔗 Código: ${trackingCode}`,
    };
    const message = statusMessages[newStatus];
    if (message) {
      window.open(`https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    toast.success(`Status atualizado: ${statusLabel(status)}`);
    queryClient.invalidateQueries({ queryKey: ['admin-orders-list'] });

    // Send WhatsApp notification
    const order = orders?.find(o => o.id === id);
    if (order) sendWhatsAppNotification(order, status);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Excluir este pedido permanentemente?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir pedido'); return; }
    toast.success('Pedido excluído');
    queryClient.invalidateQueries({ queryKey: ['admin-orders-list'] });
  };

  const openMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Pedidos</h1>
      {isLoading ? <p>Carregando...</p> : (
        <div className="space-y-4">
          {orders?.map(order => {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            const lat = order.customer_lat;
            const lng = order.customer_lng;
            const deliveryFee = Number(order.delivery_fee || 0);
            const trackingCode = order.tracking_code || '';
            const currentIdx = statusIdx(order.status);
            return (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">{order.customer_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {/* Status pills with checkmarks */}
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map((s, i) => {
                          const completed = i < currentIdx;
                          const active = i === currentIdx;
                          return (
                            <Badge key={s.value} className={`text-[10px] px-1.5 ${
                              completed ? 'bg-green-500 text-white' :
                              active ? statusColor(s.value) : 'bg-muted text-muted-foreground'
                            }`}>
                              {completed ? <Check className="h-3 w-3" /> : null}
                              {!completed && s.label.slice(0, 4)}
                            </Badge>
                          );
                        })}
                      </div>
                      <Select value={order.status} onValueChange={v => updateStatus(order.id, v)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">📱 {order.customer_whatsapp}</p>
                  <p className="text-sm text-muted-foreground">📍 {order.customer_address} - {order.customer_cep}</p>
                  {trackingCode && <p className="text-xs text-muted-foreground">🔗 Código: <span className="font-mono font-bold">{trackingCode}</span></p>}
                  {lat && lng && (
                    <Button variant="outline" size="sm" className="mt-1" onClick={() => openMap(lat, lng)}>
                      <MapPin className="h-3 w-3 mr-1" /> Ver no Mapa
                    </Button>
                  )}
                  <div className="mt-2 space-y-1">
                    {items.map((item: any, i: number) => (
                      <p key={i} className="text-sm">{item.quantity}x {item.name} — R$ {(item.price * item.quantity).toFixed(2)}</p>
                    ))}
                  </div>
                  {deliveryFee > 0 && <p className="text-sm text-muted-foreground mt-1">🚚 Taxa de entrega: R$ {deliveryFee.toFixed(2)}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-bold text-primary">Total: R$ {Number(order.total).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteOrder(order.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                </CardContent>
              </Card>
            );
          })}
          {orders?.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum pedido ainda.</p>}
        </div>
      )}
    </AdminLayout>
  );
};

export default Orders;
