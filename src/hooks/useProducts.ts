import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProducts = (onlyAvailable = true) => {
  return useQuery({
    queryKey: ['products', onlyAvailable],
    queryFn: async () => {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false });
      if (onlyAvailable) query = query.eq('available', true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
