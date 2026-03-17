import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Clock, ChefHat, Truck, Package, Star, Bell } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { key: 'pending', label: 'Pedido Recebido', icon: Clock, description: 'Seu pedido foi registrado' },
  { key: 'preparing', label: 'Preparando', icon: ChefHat, description: 'Estamos preparando suas delícias' },
  { key: 'delivering', label: 'Saiu para Entrega', icon: Truck, description: 'Seu pedido está a caminho' },
  { key: 'delivered', label: 'Entregue', icon: Package, description: 'Pedido entregue com sucesso!' },
];

const STATUS_MESSAGES: Record<string, string> = {
  pending: '📋 Pedido recebido!',
  preparing: '👨‍🍳 Seu pedido está sendo preparado!',
  delivering: '🚚 Seu pedido saiu para entrega!',
  delivered: '✅ Seu pedido foi entregue!',
};

const TrackOrder = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const fetchOrder = async (trackingCode: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('track-order', {
        body: { tracking_code: trackingCode },
      });
      if (error) throw error;
      const orderData = data?.order || null;
      setOrder(orderData);
      if (orderData) prevStatusRef.current = orderData.status;
    } catch {
      setOrder(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (code) fetchOrder(code);
    else setLoading(false);
  }, [code]);

  // Request browser notification permission
  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      toast.info('Seu navegador não suporta notificações');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      toast.success('Notificações ativadas! 🔔');
    } else {
      toast.error('Permissão de notificação negada');
    }
  };

  // Check if notifications are already granted
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Realtime subscription for order updates
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-track-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          const oldStatus = prevStatusRef.current;

          if (newStatus && newStatus !== oldStatus) {
            prevStatusRef.current = newStatus;
            // Re-fetch via edge function to get filtered data
            fetchOrder(order.tracking_code);

            // Show toast notification
            const message = STATUS_MESSAGES[newStatus] || `Status atualizado: ${newStatus}`;
            toast.success(message, { duration: 6000 });

            // Show browser notification
            if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('AMOZI - Atualização do Pedido', {
                body: message,
                icon: '/favicon.ico',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, order?.tracking_code, notificationsEnabled]);

  // Show feedback 10min after delivered
  useEffect(() => {
    if (order?.status !== 'delivered' || feedbackSent) return;
    const deliveredAt = order?.updated_at ? new Date(order.updated_at).getTime() : Date.now();
    const elapsed = Date.now() - deliveredAt;
    const remaining = Math.max(0, 10 * 60 * 1000 - elapsed);
    const timer = setTimeout(() => setShowFeedback(true), remaining);
    return () => clearTimeout(timer);
  }, [order?.status, order?.updated_at, feedbackSent]);

  const currentStepIdx = STEPS.findIndex(s => s.key === order?.status);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) navigate(`/rastrear/${searchCode.trim()}`);
  };

  const sendFeedback = () => {
    // For now, just mark as sent (could be stored in DB later)
    setFeedbackSent(true);
    setShowFeedback(false);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-lg">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à Loja
        </Button>

        {!code && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl text-center">Rastrear Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Digite o código do pedido"
                  value={searchCode}
                  onChange={e => setSearchCode(e.target.value)}
                  className="flex-1 font-mono"
                />
                <Button type="submit" className="bg-primary">Buscar</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading && code && <p className="text-center text-muted-foreground py-8">Carregando...</p>}

        {!loading && code && !order && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Pedido não encontrado.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/rastrear')}>
                Tentar outro código
              </Button>
            </CardContent>
          </Card>
        )}

        {order && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">
                  Pedido <span className="font-mono text-primary">{order.tracking_code}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{order.customer_name} — {new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
              </CardHeader>
              <CardContent>
                {/* Status tracker with green checks */}
                <div className="relative">
                  {STEPS.map((step, i) => {
                    const isCompleted = i < currentStepIdx;
                    const isCurrent = i === currentStepIdx;
                    const isActive = i <= currentStepIdx;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isCurrent ? 'bg-primary text-primary-foreground scale-110 shadow-lg' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={`w-0.5 h-8 mt-1 transition-colors ${isCompleted ? 'bg-green-400' : isActive ? 'bg-primary/40' : 'bg-muted'}`} />
                          )}
                        </div>
                        <div className="pt-1.5">
                          <p className={`font-semibold text-sm ${isCompleted ? 'text-green-600' : isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {step.label} {isCompleted && '✓'}
                          </p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order details */}
                <div className="mt-6 pt-4 border-t space-y-1">
                  <h4 className="font-semibold text-sm mb-2">Itens do Pedido</h4>
                  {(Array.isArray(order.items) ? order.items : []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                  {Number(order.delivery_fee || 0) > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>🚚 Taxa de entrega</span>
                      <span>R$ {Number(order.delivery_fee).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback section */}
            {showFeedback && !feedbackSent && (
              <Card className="mt-4 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg font-display">Como foi sua experiência? 💬</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => setFeedbackRating(star)} className="p-1">
                        <Star className={`h-7 w-7 transition-colors ${star <= feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Deixe um comentário (opcional)"
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    rows={3}
                  />
                  <Button className="w-full bg-primary" onClick={sendFeedback} disabled={feedbackRating === 0}>
                    Enviar Avaliação
                  </Button>
                </CardContent>
              </Card>
            )}
            {feedbackSent && (
              <Card className="mt-4">
                <CardContent className="py-6 text-center">
                  <p className="text-green-600 font-semibold">✅ Obrigado pela avaliação!</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
