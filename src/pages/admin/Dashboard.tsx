import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, DollarSign, ShoppingCart, TrendingDown } from 'lucide-react';

const Dashboard = () => {
  const { data: products } = useQuery({
    queryKey: ['admin-products-count'],
    queryFn: async () => {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('total');
      return data ?? [];
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ['admin-expenses-total'],
    queryFn: async () => {
      const { data } = await supabase.from('expenses').select('amount');
      return data ?? [];
    },
  });

  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const profit = totalRevenue - totalExpenses;

  const stats = [
    { label: 'Produtos', value: products ?? 0, icon: Package, color: 'text-primary' },
    { label: 'Pedidos', value: orders?.length ?? 0, icon: ShoppingCart, color: 'text-accent' },
    { label: 'Receita Total', value: `R$ ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-600' },
    { label: 'Gastos Totais', value: `R$ ${totalExpenses.toFixed(2)}`, icon: TrendingDown, color: 'text-destructive' },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lucro Líquido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            R$ {profit.toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Dashboard;
