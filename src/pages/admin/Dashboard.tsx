import { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import ProfitAIChat from '@/components/admin/ProfitAIChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, DollarSign, ShoppingCart, TrendingDown, TrendingUp,
  Users, BarChart3, AlertTriangle, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths, format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

type Period = '7d' | '30d' | '90d' | '12m' | 'all';

const periodLabels: Record<Period, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '12m': 'Últimos 12 meses',
  'all': 'Todo período',
};

const getPeriodStart = (period: Period): Date | null => {
  const now = new Date();
  switch (period) {
    case '7d': return subDays(now, 7);
    case '30d': return subDays(now, 30);
    case '90d': return subDays(now, 90);
    case '12m': return subMonths(now, 12);
    case 'all': return null;
  }
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];

const Dashboard = () => {
  const [period, setPeriod] = useState<Period>('30d');
  const periodStart = getPeriodStart(period);

  // Fetch all data
  const { data: allProducts } = useQuery({
    queryKey: ['admin-all-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*');
      return data ?? [];
    },
  });

  const { data: allOrders } = useQuery({
    queryKey: ['admin-all-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*');
      return (data ?? []) as any[];
    },
  });

  const { data: allRemoteOrders } = useQuery({
    queryKey: ['admin-all-remote-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('remote_orders').select('*');
      return (data ?? []) as any[];
    },
  });

  const { data: allExpenses } = useQuery({
    queryKey: ['admin-all-expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('expenses').select('*');
      return data ?? [];
    },
  });

  const { data: allManualRecords } = useQuery({
    queryKey: ['admin-all-manual-records'],
    queryFn: async () => {
      const { data } = await supabase.from('manual_records').select('*');
      return data ?? [];
    },
  });

  // Product price map
  const priceMap = useMemo(() => {
    return new Map((allProducts ?? []).map(p => [p.id, Number(p.price)]));
  }, [allProducts]);

  const costMap = useMemo(() => {
    return new Map((allProducts ?? []).map(p => [p.id, Number(p.cost)]));
  }, [allProducts]);

  // Filter by period
  const filterByDate = <T extends { created_at: string }>(items: T[]): T[] => {
    if (!periodStart) return items;
    return items.filter(i => isAfter(parseISO(i.created_at), periodStart));
  };

  const filterExpensesByDate = (items: { date: string; amount: number; description: string; category: string | null }[]) => {
    if (!periodStart) return items;
    return items.filter(i => isAfter(parseISO(i.date), periodStart));
  };

  const orders = useMemo(() => filterByDate(allOrders ?? []), [allOrders, periodStart]);
  const remoteOrders = useMemo(() => filterByDate(allRemoteOrders ?? []), [allRemoteOrders, periodStart]);
  const expensesRaw = useMemo(() => filterExpensesByDate(allExpenses ?? []), [allExpenses, periodStart]);
  const manualRecords = useMemo(() => {
    const recs = (allManualRecords ?? []).filter(r => r.type === 'compra' || r.type === 'saida');
    if (!periodStart) return recs;
    return recs.filter(r => isAfter(parseISO(r.date), periodStart));
  }, [allManualRecords, periodStart]);
  const manualIncome = useMemo(() => {
    const recs = (allManualRecords ?? []).filter(r => r.type === 'entrada' || r.type === 'venda');
    if (!periodStart) return recs;
    return recs.filter(r => isAfter(parseISO(r.date), periodStart));
  }, [allManualRecords, periodStart]);
  const expenses = useMemo(() => [
    ...expensesRaw.map(e => ({ date: e.date, amount: e.amount, description: e.description, category: e.category })),
    ...manualRecords.map(r => ({ date: r.date, amount: r.amount, description: r.description, category: r.category })),
  ], [expensesRaw, manualRecords]);

  // Calculate remote order totals
  const remoteWithTotals = useMemo(() => {
    return remoteOrders.map(o => ({
      ...o,
      total: Array.isArray(o.items)
        ? (o.items as any[]).reduce((s: number, i: any) => {
            const price = Number(i.price) || priceMap.get(i.product_id) || 0;
            return s + price * (Number(i.quantity) || 1);
          }, 0)
        : 0,
    }));
  }, [remoteOrders, priceMap]);

  // Core metrics
  const onlineRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const remoteRevenue = remoteWithTotals.filter(o => o.paid).reduce((sum, o) => sum + o.total, 0);
  const manualRevenue = manualIncome.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalRevenue = onlineRevenue + remoteRevenue + manualRevenue;
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const profit = totalRevenue - totalExpenses;
  const totalOrders = orders.length + remoteOrders.length;

  // Cost of goods sold (COGS)
  const cogs = useMemo(() => {
    let total = 0;
    orders.forEach(o => {
      if (Array.isArray(o.items)) {
        (o.items as any[]).forEach((i: any) => {
          const cost = costMap.get(i.id || i.product_id) || 0;
          total += cost * (Number(i.quantity) || 1);
        });
      }
    });
    remoteWithTotals.filter(o => o.paid).forEach(o => {
      if (Array.isArray(o.items)) {
        (o.items as any[]).forEach((i: any) => {
          const cost = costMap.get(i.product_id) || 0;
          total += cost * (Number(i.quantity) || 1);
        });
      }
    });
    return total;
  }, [orders, remoteWithTotals, costMap]);

  const grossProfit = totalRevenue - cogs;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Unique customers
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; whatsapp: string; orders: number; total: number }>();
    orders.forEach(o => {
      const key = o.customer_whatsapp;
      const existing = map.get(key);
      if (existing) {
        existing.orders++;
        existing.total += Number(o.total);
      } else {
        map.set(key, { name: o.customer_name, whatsapp: key, orders: 1, total: Number(o.total) });
      }
    });
    remoteWithTotals.forEach(o => {
      const key = o.customer_whatsapp || o.customer_name;
      const existing = map.get(key);
      if (existing) {
        existing.orders++;
        existing.total += o.paid ? o.total : 0;
      } else {
        map.set(key, { name: o.customer_name, whatsapp: o.customer_whatsapp || '', orders: 1, total: o.paid ? o.total : 0 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [orders, remoteWithTotals]);

  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Revenue over time chart data
  const revenueChartData = useMemo(() => {
    const dayMap = new Map<string, { online: number; remote: number; expenses: number }>();
    
    orders.forEach(o => {
      const day = format(parseISO(o.created_at), 'dd/MM');
      const existing = dayMap.get(day) || { online: 0, remote: 0, expenses: 0 };
      existing.online += Number(o.total);
      dayMap.set(day, existing);
    });
    remoteWithTotals.filter(o => o.paid).forEach(o => {
      const day = format(parseISO(o.created_at), 'dd/MM');
      const existing = dayMap.get(day) || { online: 0, remote: 0, expenses: 0 };
      existing.remote += o.total;
      dayMap.set(day, existing);
    });
    expenses.forEach(e => {
      const day = format(parseISO(e.date), 'dd/MM');
      const existing = dayMap.get(day) || { online: 0, remote: 0, expenses: 0 };
      existing.expenses += Number(e.amount);
      dayMap.set(day, existing);
    });

    return Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, vals]) => ({
        date,
        'Vendas Online': Number(vals.online.toFixed(2)),
        'Vendas Remotas': Number(vals.remote.toFixed(2)),
        'Despesas': Number(vals.expenses.toFixed(2)),
      }));
  }, [orders, remoteWithTotals, expenses]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    const addItems = (items: any[]) => {
      items.forEach((i: any) => {
        const id = i.id || i.product_id;
        const name = i.name || (allProducts ?? []).find(p => p.id === id)?.name || 'Desconhecido';
        const price = Number(i.price) || priceMap.get(id) || 0;
        const qty = Number(i.quantity) || 1;
        const existing = map.get(id);
        if (existing) {
          existing.qty += qty;
          existing.revenue += price * qty;
        } else {
          map.set(id, { name, qty, revenue: price * qty });
        }
      });
    };
    orders.forEach(o => { if (Array.isArray(o.items)) addItems(o.items as any[]); });
    remoteWithTotals.filter(o => o.paid).forEach(o => { if (Array.isArray(o.items)) addItems(o.items as any[]); });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [orders, remoteWithTotals, allProducts, priceMap]);

  // Expense categories
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      const cat = e.category || 'Outros';
      map.set(cat, (map.get(cat) || 0) + Number(e.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [expenses]);

  // Unpaid amounts from remote orders
  const unpaidTotal = useMemo(() => {
    return (allRemoteOrders ?? [])
      .filter(o => !o.paid)
      .reduce((sum, o) => {
        const items = Array.isArray(o.items) ? (o.items as any[]) : [];
        const orderTotal = items.reduce((s: number, i: any) => {
          const price = Number(i.price) || priceMap.get(i.product_id) || 0;
          return s + price * (Number(i.quantity) || 1);
        }, 0);
        return sum + orderTotal;
      }, 0);
  }, [allRemoteOrders, priceMap]);

  const stats = [
    { label: 'Receita Total', value: `R$ ${totalRevenue.toFixed(2)}`, icon: TrendingUp, gradient: 'from-emerald-500 to-green-400' },
    { label: 'Despesas', value: `R$ ${totalExpenses.toFixed(2)}`, icon: TrendingDown, gradient: 'from-red-500 to-rose-400' },
    { label: 'Pedidos', value: totalOrders, icon: ShoppingCart, gradient: 'from-amber-500 to-yellow-400' },
    { label: 'A Receber', value: `R$ ${unpaidTotal.toFixed(2)}`, icon: DollarSign, gradient: 'from-orange-500 to-amber-400' },
  ];

  const financialDetails = [
    { label: 'Receita Online', value: onlineRevenue },
    { label: 'Receita Remota', value: remoteRevenue },
    { label: 'Receita Manual', value: manualRevenue },
    { label: 'Valores a Receber', value: unpaidTotal },
    { label: 'Custo dos Produtos (CMV)', value: cogs },
    { label: 'Lucro Bruto', value: grossProfit },
    { label: 'Despesas Operacionais', value: totalExpenses },
    { label: 'Lucro Líquido', value: profit },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{getGreeting()} ☀️</h1>
          <p className="text-muted-foreground mt-1">Controle interno do seu negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <Card key={stat.label} className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className={`p-2 sm:p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profit + Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="border-0 shadow-md overflow-hidden">
          <div className={`h-1.5 w-full bg-gradient-to-r ${profit >= 0 ? 'from-emerald-400 to-green-500' : 'from-red-400 to-rose-500'}`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">💰 Resultado do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold font-display ${profit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              R$ {profit.toFixed(2)}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Margem bruta: <strong className="text-foreground">{profitMargin.toFixed(1)}%</strong></span>
              <span>Ticket médio: <strong className="text-foreground">R$ {avgTicket.toFixed(2)}</strong></span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {profit >= 0 ? '📈 Seu negócio está no positivo!' : '📉 Atenção: gastos superando a receita'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">📊 Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {financialDetails.map(item => (
                <div key={item.label} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={`font-semibold ${item.value >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                    R$ {item.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Revenue over time */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Vendas × Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  />
                  <Bar dataKey="Vendas Online" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Vendas Remotas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Sem dados para o período</p>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">🏆 Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => name === 'revenue' ? `R$ ${value.toFixed(2)}` : value}
                  />
                  <Bar dataKey="qty" name="Qtd" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Sem vendas no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense categories + Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Expense pie chart */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">🧾 Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Sem despesas no período</p>
            )}
          </CardContent>
        </Card>

        {/* Customers table */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">👥 Base de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {customers.length > 0 ? (
              <div className="max-h-[260px] overflow-y-auto space-y-1">
                <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground pb-2 border-b border-border sticky top-0 bg-card">
                  <span className="col-span-1">Cliente</span>
                  <span className="text-center">WhatsApp</span>
                  <span className="text-center">Pedidos</span>
                  <span className="text-right">Total</span>
                </div>
                {customers.slice(0, 20).map((c, i) => (
                  <div key={i} className="grid grid-cols-4 text-xs py-1.5 border-b border-border/50 last:border-0">
                    <span className="col-span-1 truncate font-medium">{c.name}</span>
                    <span className="text-center text-muted-foreground">{c.whatsapp || '—'}</span>
                    <span className="text-center">{c.orders}</span>
                    <span className="text-right font-semibold">R$ {c.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhum cliente no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Products count */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Produtos Ativos</div>
            <div className="text-xl font-bold">{(allProducts ?? []).filter(p => p.available).length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Total Produtos</div>
            <div className="text-xl font-bold">{(allProducts ?? []).length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <div className="text-sm text-muted-foreground">Pendentes Pgto</div>
            <div className="text-xl font-bold">{(allRemoteOrders ?? []).filter(o => !o.paid).length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Margem Bruta</div>
            <div className="text-xl font-bold">{profitMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Profit Consultant */}
      <ProfitAIChat
        context={{
          period: periodLabels[period],
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalExpenses: Number(totalExpenses.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          profitMargin: Number(profitMargin.toFixed(2)),
          cogs: Number(cogs.toFixed(2)),
          grossProfit: Number(grossProfit.toFixed(2)),
          avgTicket: Number(avgTicket.toFixed(2)),
          totalOrders,
          unpaidTotal: Number(unpaidTotal.toFixed(2)),
          onlineRevenue: Number(onlineRevenue.toFixed(2)),
          remoteRevenue: Number(remoteRevenue.toFixed(2)),
          topProducts: topProducts.map(p => ({
            name: p.name,
            qty: p.qty,
            revenue: Number(p.revenue.toFixed(2)),
          })),
          expenseByCategory: expenseByCategory.map(e => ({ name: e.name, value: e.value })),
          productMargins: (allProducts ?? []).map(p => {
            const price = Number(p.price) || 0;
            const cost = Number(p.cost) || 0;
            const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
            return { name: p.name, price, cost, margin: Number(margin.toFixed(1)) };
          }).sort((a, b) => a.margin - b.margin).slice(0, 15),
        }}
      />
    </AdminLayout>
  );
};

export default Dashboard;
