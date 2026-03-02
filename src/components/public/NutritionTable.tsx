import { useState } from 'react';
import { ChevronDown, ChevronUp, Leaf } from 'lucide-react';
import { useProductNutrition } from '@/hooks/useProductNutrition';

const rows: { key: string; label: string; unit: string; indent?: boolean }[] = [
  { key: 'calories', label: 'Calorias', unit: 'kcal' },
  { key: 'total_fat', label: 'Gorduras Totais', unit: 'g' },
  { key: 'saturated_fat', label: 'Gordura Saturada', unit: 'g', indent: true },
  { key: 'trans_fat', label: 'Gordura Trans', unit: 'g', indent: true },
  { key: 'cholesterol', label: 'Colesterol', unit: 'mg' },
  { key: 'sodium', label: 'Sódio', unit: 'mg' },
  { key: 'total_carbs', label: 'Carboidratos', unit: 'g' },
  { key: 'dietary_fiber', label: 'Fibra Alimentar', unit: 'g', indent: true },
  { key: 'total_sugars', label: 'Açúcares', unit: 'g', indent: true },
  { key: 'protein', label: 'Proteínas', unit: 'g' },
];

const NutritionTable = ({ productId }: { productId: string }) => {
  const { data: nutrition } = useProductNutrition(productId);
  const [open, setOpen] = useState(false);

  if (!nutrition) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Leaf className="h-3.5 w-3.5" />
        Info Nutricional
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-2 border border-border rounded-lg overflow-hidden text-xs">
          <div className="bg-muted/50 px-3 py-1.5 font-semibold border-b border-border">
            Porção: {nutrition.serving_size}
          </div>
          <table className="w-full">
            <tbody>
              {rows.map(({ key, label, unit, indent }, i) => (
                <tr key={key} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className={`px-3 py-1 ${indent ? 'pl-6' : ''}`}>{label}</td>
                  <td className="px-3 py-1 text-right font-medium">
                    {Number((nutrition as any)[key]).toFixed(1)} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NutritionTable;
