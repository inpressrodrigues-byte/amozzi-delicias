import { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PaymentCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: orders } = useQuery({
    queryKey: ['remote-orders-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remote_orders')
        .select('*')
        .eq('payment_status', 'vai_pagar_em')
        .not('payment_due_date', 'is', null)
        .order('payment_due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start with previous month days
  const startDayOfWeek = monthStart.getDay();
  const paddedDays = Array.from({ length: startDayOfWeek }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startDayOfWeek - i));
    return d;
  });

  const allDays = [...paddedDays, ...days];
  // Pad end
  while (allDays.length % 7 !== 0) {
    const last = allDays[allDays.length - 1];
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    allDays.push(d);
  }

  // Fetch products for price lookup
  const { data: products } = useQuery({
    queryKey: ['products-for-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id, price');
      if (error) throw error;
      return data;
    },
  });

  const priceMap = useMemo(() => new Map((products ?? []).map(p => [p.id, Number(p.price)])), [products]);

  const calcOrderTotal = (order: any) => {
    const items = Array.isArray(order.items) ? (order.items as any[]) : [];
    return items.reduce((s: number, i: any) => {
      const price = Number(i.price) || priceMap.get(i.product_id) || 0;
      return s + price * (Number(i.quantity) || 1);
    }, 0);
  };

  const ordersByDate = useMemo(() => {
    const map: Record<string, typeof orders> = {};
    orders?.forEach(o => {
      const key = (o as any).payment_due_date;
      if (!map[key]) map[key] = [];
      map[key]!.push(o);
    });
    return map;
  }, [orders]);

  const totalsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    orders?.forEach(o => {
      const key = (o as any).payment_due_date;
      map[key] = (map[key] || 0) + calcOrderTotal(o);
    });
    return map;
  }, [orders, priceMap]);

  const selectedOrders = selectedDate
    ? ordersByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  // Summary: all unpaid with due dates
  const totalPending = orders?.length || 0;
  const overdue = orders?.filter(o => new Date((o as any).payment_due_date + 'T23:59:59') < new Date()) || [];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
          Calendário de Pagamentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe quem vai pagar e quando</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs">Pagamentos Pendentes</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold">{totalPending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs">Atrasados</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold text-destructive">{overdue.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="mb-6">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((day, i) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayOrders = ordersByDate[dateKey];
              const count = dayOrders?.length || 0;
              const inMonth = isSameMonth(day, currentMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);
              const isPast = day < new Date() && !isToday(day);

              const dayTotal = totalsByDate[dateKey] || 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center justify-center h-12 sm:h-14 rounded-lg text-[12px] transition-all ${
                    !inMonth ? 'text-muted-foreground/30' :
                    selected ? 'bg-foreground text-background' :
                    today ? 'bg-primary/10 text-primary font-bold' :
                    'hover:bg-muted'
                  }`}
                >
                  {count > 0 && (
                    <span className={`text-[8px] font-bold ${
                      selected ? 'text-emerald-300' : 'text-emerald-600'
                    }`}>
                      R${dayTotal.toFixed(0)}
                    </span>
                  )}
                  <span>{day.getDate()}</span>
                  {count > 0 && (
                    <span className={`text-[8px] font-bold px-1 rounded-full ${
                      selected ? 'bg-background text-foreground' :
                      isPast ? 'bg-destructive/20 text-destructive' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      {selectedDate && (
        <div>
          <h3 className="text-sm font-semibold mb-3">
            Pagamentos para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h3>
          {selectedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum pagamento programado para este dia.</p>
          ) : (
            <div className="space-y-3">
              {selectedOrders.map((order: any) => {
                const items = Array.isArray(order.items) ? order.items : [];
                return (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{order.customer_name}</p>
                        {order.sector && <p className="text-[11px] text-muted-foreground">{order.sector}</p>}
                        {order.customer_whatsapp && <p className="text-[11px] text-muted-foreground">📱 {order.customer_whatsapp}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px]">Vai pagar em {format(new Date(order.payment_due_date + 'T12:00:00'), 'dd/MM')}</Badge>
                    </div>
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {items.map((item: any, i: number) => (
                          <span key={i} className="text-[11px] bg-muted/50 px-2 py-0.5 rounded">{item.quantity}x {item.name}</span>
                        ))}
                      </div>
                    )}
                    {order.notes && <p className="text-[11px] text-muted-foreground mt-1 italic">Obs: {order.notes}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Overdue list */}
      {overdue.length > 0 && !selectedDate && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-destructive">⚠️ Pagamentos Atrasados</h3>
          <div className="space-y-3">
            {overdue.map((order: any) => {
              const items = Array.isArray(order.items) ? order.items : [];
              return (
                <Card key={order.id} className="p-4 border-destructive/30">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{order.customer_name}</p>
                      {order.customer_whatsapp && <p className="text-[11px] text-muted-foreground">📱 {order.customer_whatsapp}</p>}
                    </div>
                    <Badge variant="destructive" className="text-[10px]">
                      Venceu {format(new Date(order.payment_due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                    </Badge>
                  </div>
                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {items.map((item: any, i: number) => (
                        <span key={i} className="text-[11px] bg-muted/50 px-2 py-0.5 rounded">{item.quantity}x {item.name}</span>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PaymentCalendar;
