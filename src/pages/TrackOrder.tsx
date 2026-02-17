import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle2, Clock, ChefHat, Truck, Package } from 'lucide-react';

const STEPS = [
  { key: 'pending', label: 'Pedido Recebido', icon: Clock, description: 'Seu pedido foi registrado' },
  { key: 'preparing', label: 'Preparando', icon: ChefHat, description: 'Estamos preparando suas delícias' },
  { key: 'delivering', label: 'Saiu para Entrega', icon: Truck, description: 'Seu pedido está a caminho' },
  { key: 'delivered', label: 'Entregue', icon: CheckCircle2, description: 'Pedido entregue com sucesso!' },
];

const TrackOrder = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');

  const fetchOrder = async (trackingCode: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tracking_code', trackingCode)
      .maybeSingle();
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    if (code) fetchOrder(code);
    else setLoading(false);
  }, [code]);

  // Realtime updates
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order-${order.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${order.id}`,
      }, (payload) => {
        setOrder((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order?.id]);

  const currentStepIdx = STEPS.findIndex(s => s.key === order?.status);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) navigate(`/rastrear/${searchCode.trim()}`);
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
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Pedido <span className="font-mono text-primary">{(order as any).tracking_code}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{order.customer_name} — {new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
            </CardHeader>
            <CardContent>
              {/* Status tracker */}
              <div className="relative">
                {STEPS.map((step, i) => {
                  const isActive = i <= currentStepIdx;
                  const isCurrent = i === currentStepIdx;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          isCurrent ? 'bg-primary text-primary-foreground scale-110' :
                          isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${isActive ? 'bg-primary/40' : 'bg-muted'}`} />
                        )}
                      </div>
                      <div className="pt-1.5">
                        <p className={`font-semibold text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
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
                {Number((order as any).delivery_fee || 0) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>🚚 Taxa de entrega</span>
                    <span>R$ {Number((order as any).delivery_fee).toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
