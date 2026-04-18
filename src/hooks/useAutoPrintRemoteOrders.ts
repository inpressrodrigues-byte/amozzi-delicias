import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { printOrderReceipt, type PrintSettings } from '@/lib/printOrder';
import { toast } from 'sonner';

/**
 * Auto-print for remote_orders (pedidos remotos / manuais).
 * Realtime + 6s polling fallback. Mount once at the admin layout level.
 */
export const useAutoPrintRemoteOrders = () => {
  const { data: settings } = useSiteSettings();
  const printedIdsRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const initializedRef = useRef(false);

  useEffect(() => {
    const printCfg = (settings?.print_settings as PrintSettings | null) || null;
    if (!printCfg?.auto_print_enabled) return;

    const printOne = (order: any) => {
      if (!order?.id || printedIdsRef.current.has(order.id)) return;
      printedIdsRef.current.add(order.id);
      const items = Array.isArray(order.items) ? order.items : [];
      const total = items.reduce(
        (s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0),
        0
      );
      try {
        printOrderReceipt(
          {
            source: 'remoto',
            customer_name: order.customer_name,
            customer_whatsapp: order.customer_whatsapp,
            sector: order.sector,
            notes: order.notes,
            created_at: order.created_at,
            items: items.map((it: any) => ({
              name: it.name,
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || 0,
            })),
            total,
            payment_status: order.payment_status,
            status: order.payment_status,
          },
          { ...printCfg, logo_url: settings?.logo_url || null }
        );
        toast.success(`🖨️ Imprimindo pedido remoto de ${order.customer_name}`);
      } catch (e) {
        console.error('Auto-print remote failed', e);
      }
    };

    const init = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      const { data } = await supabase
        .from('remote_orders')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      (data || []).forEach((o: any) => printedIdsRef.current.add(o.id));
      lastCheckRef.current = new Date().toISOString();
      console.log('[auto-print remote] initialized');
    };
    init();

    const channel = supabase
      .channel('auto-print-remote-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'remote_orders' },
        (payload) => {
          console.log('[auto-print remote] realtime insert', payload.new);
          printOne(payload.new);
        }
      )
      .subscribe((status) => console.log('[auto-print remote] channel:', status));

    const poll = async () => {
      try {
        const { data } = await supabase
          .from('remote_orders')
          .select('*')
          .gt('created_at', lastCheckRef.current)
          .order('created_at', { ascending: true });
        if (data && data.length) {
          console.log('[auto-print remote] polling found', data.length);
          data.forEach(printOne);
          lastCheckRef.current = data[data.length - 1].created_at;
        }
      } catch (e) {
        console.warn('[auto-print remote] poll exception', e);
      }
    };
    const interval = setInterval(poll, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [settings]);
};
