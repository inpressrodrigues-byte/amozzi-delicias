import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Orders = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Pedidos</h1>
      {isLoading ? <p>Carregando...</p> : (
        <div className="space-y-4">
          {orders?.map(order => {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            return (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{order.customer_name}</CardTitle>
                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                      {order.status === 'pending' ? 'Pendente' : order.status === 'completed' ? 'Concluído' : order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">📱 {order.customer_whatsapp}</p>
                  <p className="text-sm text-muted-foreground">📍 {order.customer_address} - {order.customer_cep}</p>
                  <div className="mt-2 space-y-1">
                    {items.map((item: any, i: number) => (
                      <p key={i} className="text-sm">{item.quantity}x {item.name} — R$ {(item.price * item.quantity).toFixed(2)}</p>
                    ))}
                  </div>
                  <p className="mt-2 font-bold text-primary">Total: R$ {Number(order.total).toFixed(2)}</p>
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
