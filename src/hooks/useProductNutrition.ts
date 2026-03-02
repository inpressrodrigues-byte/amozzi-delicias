import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NutritionData {
  calories: number;
  total_fat: number;
  saturated_fat: number;
  trans_fat: number;
  cholesterol: number;
  sodium: number;
  total_carbs: number;
  dietary_fiber: number;
  total_sugars: number;
  protein: number;
  serving_size: string;
}

const defaultNutrition: NutritionData = {
  calories: 0, total_fat: 0, saturated_fat: 0, trans_fat: 0,
  cholesterol: 0, sodium: 0, total_carbs: 0, dietary_fiber: 0,
  total_sugars: 0, protein: 0, serving_size: '1 pote (200g)',
};

export const useProductNutrition = (productId: string | undefined) => {
  return useQuery({
    queryKey: ['product-nutrition', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from('product_nutrition')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
};

export const useSaveNutrition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, nutrition }: { productId: string; nutrition: NutritionData }) => {
      const { data: existing } = await supabase
        .from('product_nutrition')
        .select('id')
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('product_nutrition')
          .update({ ...nutrition })
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_nutrition')
          .insert({ product_id: productId, ...nutrition });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['product-nutrition', vars.productId] });
    },
  });
};

export { defaultNutrition };
