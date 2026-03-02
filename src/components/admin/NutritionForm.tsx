import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NutritionData } from '@/hooks/useProductNutrition';

interface Props {
  nutrition: NutritionData;
  onChange: (n: NutritionData) => void;
}

const fields: { key: keyof NutritionData; label: string; unit: string }[] = [
  { key: 'serving_size', label: 'Porção', unit: '' },
  { key: 'calories', label: 'Calorias', unit: 'kcal' },
  { key: 'total_fat', label: 'Gorduras Totais', unit: 'g' },
  { key: 'saturated_fat', label: 'Gordura Saturada', unit: 'g' },
  { key: 'trans_fat', label: 'Gordura Trans', unit: 'g' },
  { key: 'cholesterol', label: 'Colesterol', unit: 'mg' },
  { key: 'sodium', label: 'Sódio', unit: 'mg' },
  { key: 'total_carbs', label: 'Carboidratos', unit: 'g' },
  { key: 'dietary_fiber', label: 'Fibra Alimentar', unit: 'g' },
  { key: 'total_sugars', label: 'Açúcares', unit: 'g' },
  { key: 'protein', label: 'Proteínas', unit: 'g' },
];

const NutritionForm = ({ nutrition, onChange }: Props) => {
  const update = (key: keyof NutritionData, value: string) => {
    if (key === 'serving_size') {
      onChange({ ...nutrition, serving_size: value });
    } else {
      onChange({ ...nutrition, [key]: parseFloat(value) || 0 });
    }
  };

  return (
    <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
      <h4 className="font-semibold text-sm">Tabela Nutricional</h4>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, unit }) => (
          <div key={key}>
            <Label className="text-xs">{label} {unit && `(${unit})`}</Label>
            <Input
              type={key === 'serving_size' ? 'text' : 'number'}
              step="0.01"
              value={String(nutrition[key])}
              onChange={e => update(key, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NutritionForm;
