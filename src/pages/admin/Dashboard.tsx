import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, DollarSign, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

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
    { label: 'Produtos', value: products ?? 0, icon: Package, gradient: 'from-pink-500 to-rose-400', bg: 'bg-pink-50' },
    { label: 'Pedidos', value: orders?.length ?? 0, icon: ShoppingCart, gradient: 'from-amber-500 to-yellow-400', bg: 'bg-amber-50' },
    { label: 'Receita Total', value: `R$ ${totalRevenue.toFixed(2)}`, icon: TrendingUp, gradient: 'from-emerald-500 to-green-400', bg: 'bg-emerald-50' },
    { label: 'Gastos Totais', value: `R$ ${totalExpenses.toFixed(2)}`, icon: TrendingDown, gradient: 'from-red-500 to-rose-400', bg: 'bg-red-50' },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">{getGreeting()} ☀️</h1>
        <p className="text-muted-foreground mt-1">Aqui está o resumo do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <Card key={stat.label} className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className={`h-1.5 w-full bg-gradient-to-r ${profit >= 0 ? 'from-emerald-400 to-green-500' : 'from-red-400 to-rose-500'}`} />
        <CardHeader>
          <CardTitle className="text-lg font-display">💰 Lucro Líquido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold font-display ${profit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            R$ {profit.toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {profit >= 0 ? '📈 Seu negócio está no positivo!' : '📉 Atenção: gastos estão superando a receita'}
          </p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Dashboard;
