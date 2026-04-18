import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { printOrderReceipt, type PrintSettings } from '@/lib/printOrder';
import { toast } from 'sonner';

/**
 * Listens to new orders inserted into the `orders` table and triggers
 * automatic printing on a 58mm thermal receipt printer when enabled.
 * Mount once at the admin layout level.
 */
export const useAutoPrintOrders = () => {
  const { data: settings } = useSiteSettings();
  const printedIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    const printCfg = (settings?.print_settings as PrintSettings | null) || null;
    if (!printCfg?.auto_print_enabled) return;

    // Track recently created orders so we only print truly new ones
    if (!initializedRef.current) {
      initializedRef.current = true;
      supabase
        .from('orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          (data || []).forEach((o) => printedIdsRef.current.add(o.id));
        });
    }

    const channel = supabase
      .channel('auto-print-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order: any = payload.new;
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [settings]);
};
