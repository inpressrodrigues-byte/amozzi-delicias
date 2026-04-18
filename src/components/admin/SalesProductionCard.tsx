import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { startOfDay, startOfWeek, startOfMonth, isAfter, parseISO } from 'date-fns';
import { Cake, Factory, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBatchStatus } from '@/hooks/useProductionBatches';

const SalesProductionCard = () => {
  const { data: orders } = useQuery({
    queryKey: ['sales-prod-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('items, created_at');
      return (data ?? []) as any[];
    },
  });

  const { data: remoteOrders } = useQuery({
    queryKey: ['sales-prod-remote'],
    queryFn: async () => {
      const { data } = await supabase.from('remote_orders').select('items, created_at');
      return (data ?? []) as any[];
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['sales-prod-batches'],
    queryFn: async () => {
      const { data } = await supabase.from('production_batches').select('*');
      return (data ?? []) as any[];
    },
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const countItems = (list: any[], since: Date | null) => {
    let total = 0;
    list.forEach(o => {
      if (since && !isAfter(parseISO(o.created_at), since)) return;
      if (Array.isArray(o.items)) {
        (o.items as any[]).forEach((i: any) => {
          total += Number(i.quantity) || 1;
        });
      }
    });
    return total;
  };

  const sales = useMemo(() => {
    const all = [...(orders ?? []), ...(remoteOrders ?? [])];
    return {
      today: countItems(all, todayStart),
      week: countItems(all, weekStart),
      month: countItems(all, monthStart),
      total: countItems(all, null),
    };
  }, [orders, remoteOrders]);

  const sumBatches = (since: Date | null) => {
    return (batches ?? []).reduce((s, b) => {
      if (since && !isAfter(parseISO(b.manufactured_at), since)) return s;
      return s + (Number(b.quantity) || 0);
    }, 0);
  };

  const production = useMemo(() => ({
    today: sumBatches(todayStart),
    week: sumBatches(weekStart),
    month: sumBatches(monthStart),
    total: sumBatches(null),
  }), [batches]);

  const expiringSoon = useMemo(() => {
    return (batches ?? []).filter(b => {
      const { status } = getBatchStatus(b.expires_at);
      return status === 'expired' || status === 'critical';
    }).length;
  }, [batches]);

  const Cell = ({ label, value }: { label: string; value: number }) => (
    <div className="text-center">
      <div className="text-2xl font-bold font-display">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-pink-400 to-rose-500" />
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Cake className="h-5 w-5 text-rose-500" /> Bolos Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <Cell label="Hoje" value={sales.today} />
            <Cell label="Semana" value={sales.week} />
            <Cell label="Mês" value={sales.month} />
            <Cell label="Total" value={sales.total} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Factory className="h-5 w-5 text-amber-600" /> Bolos Produzidos
          </CardTitle>
          {expiringSoon > 0 && (
            <Link to="/admin/products" className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 border border-orange-300 px-2 py-1 rounded-full hover:bg-orange-200 transition">
              <AlertTriangle className="h-3 w-3" /> {expiringSoon} vencendo
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <Cell label="Hoje" value={production.today} />
            <Cell label="Semana" value={production.week} />
            <Cell label="Mês" value={production.month} />
            <Cell label="Total" value={production.total} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesProductionCard;
