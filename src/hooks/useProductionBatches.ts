import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export type ProductionBatch = {
  id: string;
  product_id: string;
  quantity: number;
  manufactured_at: string; // YYYY-MM-DD
  expires_at: string; // YYYY-MM-DD
  shelf_life_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const useProductionBatches = (productId?: string) => {
  return useQuery({
    queryKey: ['production_batches', productId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('production_batches').select('*').order('manufactured_at', { ascending: false });
      if (productId) q = q.eq('product_id', productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductionBatch[];
    },
  });
};

export const useCreateProductionBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      quantity: number;
      manufactured_at: string;
      shelf_life_days?: number;
      notes?: string | null;
    }) => {
      const payload = {
        product_id: input.product_id,
        quantity: input.quantity,
        manufactured_at: input.manufactured_at,
        shelf_life_days: input.shelf_life_days ?? 7,
        notes: input.notes ?? null,
        // expires_at is required by schema; trigger will overwrite it.
        expires_at: input.manufactured_at,
      };
      const { data, error } = await supabase.from('production_batches').insert(payload).select('*').single();
      if (error) throw error;
      return data as ProductionBatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production_batches'] });
    },
  });
};

export const useDeleteProductionBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production_batches'] });
    },
  });
};

export type BatchStatus = 'expired' | 'critical' | 'warning' | 'fresh';

export const getBatchStatus = (expires_at: string): { status: BatchStatus; daysLeft: number } => {
  const today = new Date();
  const exp = parseISO(expires_at);
  const daysLeft = differenceInCalendarDays(exp, today);
  if (daysLeft < 0) return { status: 'expired', daysLeft };
  if (daysLeft <= 1) return { status: 'critical', daysLeft };
  if (daysLeft <= 2) return { status: 'warning', daysLeft };
  return { status: 'fresh', daysLeft };
};
