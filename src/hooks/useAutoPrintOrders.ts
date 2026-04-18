import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { printOrderReceipt, type PrintSettings } from '@/lib/printOrder';
import { toast } from 'sonner';

/**
 * Listens to new orders inserted into the `orders` table and triggers
 * automatic printing on a 58mm thermal receipt printer when enabled.
 * Uses Realtime + a 6s polling fallback (in case Realtime drops or the
 * order is created via an edge function that bypasses the channel).
 * Mount once at the admin layout level.
 */
export const useAutoPrintOrders = () => {
  const { data: settings } = useSiteSettings();
  const printedIdsRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const initializedRef = useRef(false);

  useEffect(() => {
    const printCfg = (settings?.print_settings as PrintSettings | null) || null;
    if (!printCfg?.auto_print_enabled) return;

    const printOrder = (order: any) => {
      if (!order?.id || printedIdsRef.current.has(order.id)) return;
      printedIdsRef.current.add(order.id);

      const items = Array.isArray(order.items) ? order.items : [];
      try {
        printOrderReceipt(
          {
            source: 'site',
            customer_name: order.customer_name,
            customer_whatsapp: order.customer_whatsapp,
            customer_address: order.customer_address,
            customer_cep: order.customer_cep,
            created_at: order.created_at,
            items: items.map((it: any) => ({
              name: it.name,
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || 0,
            })),
            total: Number(order.total),
            delivery_fee: Number(order.delivery_fee || 0),
            payment_method: order.payment_method,
            status: order.status,
            tracking_code: order.tracking_code,
          },
          {
            ...printCfg,
            logo_url: settings?.logo_url || null,
          }
        );
        toast.success(`🖨️ Imprimindo pedido de ${order.customer_name}`);
      } catch (e) {
        console.error('Auto-print failed', e);
      }
    };

    // Snapshot recent orders so we don't reprint historical ones on page load
    const init = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      const { data } = await supabase
        .from('orders')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      (data || []).forEach((o: any) => printedIdsRef.current.add(o.id));
      lastCheckRef.current = new Date().toISOString();
      console.log('[auto-print] initialized, watching for new orders');
    };
    init();

    // Realtime channel (primary)
    const channel = supabase
      .channel('auto-print-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[auto-print] realtime insert', payload.new);
          printOrder(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[auto-print] channel status:', status);
      });

    // Polling fallback every 6 seconds — catches orders created via edge functions
    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gt('created_at', lastCheckRef.current)
          .order('created_at', { ascending: true });
        if (error) {
          console.warn('[auto-print] poll error', error);
          return;
        }
        if (data && data.length) {
          console.log('[auto-print] polling found', data.length, 'new order(s)');
          data.forEach(printOrder);
          lastCheckRef.current = data[data.length - 1].created_at;
        }
      } catch (e) {
        console.warn('[auto-print] poll exception', e);
      }
    };
    const interval = setInterval(poll, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [settings]);
};
