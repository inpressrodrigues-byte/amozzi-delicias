import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Calculator, Save, DollarSign, Package } from 'lucide-react';

interface Ingredient {
  id?: string;
  ingredient_name: string;
  quantity_used: number;
  quantity_unit: string;
  package_price: number;
  package_quantity: number;
  package_unit: string;
}

const UNITS = [
  { value: 'g', label: 'gramas (g)' },
  { value: 'ml', label: 'mililitros (ml)' },
  { value: 'un', label: 'unidades (un)' },
];

const PACKAGE_UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'litros (L)' },
  { value: 'ml', label: 'ml' },
  { value: 'un', label: 'unidades' },
  { value: 'dz', label: 'dúzia (12un)' },
];

function convertToBase(value: number, unit: string): number {
  switch (unit) {
    case 'kg': return value * 1000; // to grams
    case 'L': return value * 1000; // to ml
    case 'dz': return value * 12; // to units
    default: return value;
  }
}

function getBaseUnit(unit: string): string {
  switch (unit) {
    case 'kg': case 'g': return 'g';
    case 'L': case 'ml': return 'ml';
    case 'dz': case 'un': return 'un';
    default: return unit;
  }
}

function calcIngredientCost(ing: Ingredient): number {
  const packageInBase = convertToBase(ing.package_quantity, ing.package_unit);
  if (packageInBase <= 0) return 0;
  const pricePerBaseUnit = ing.package_price / packageInBase;
  const usedInBase = convertToBase(ing.quantity_used, ing.quantity_unit);
  return pricePerBaseUnit * usedInBase;
}

const CostCalculator = () => {
  const { data: products } = useProducts(false);
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [unitsProduced, setUnitsProduced] = useState(1);

  const { data: savedIngredients, isLoading: loadingIngredients } = useQuery({
    queryKey: ['recipe-ingredients', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data, error } = await supabase
        .from('recipe_ingredients' as any)
        .select('*')
        .eq('product_id', selectedProductId)
        .order('created_at');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedProductId,
  });

  useEffect(() => {
    if (savedIngredients) {
      setIngredients(savedIngredients.map((i: any) => ({
        id: i.id,
        ingredient_name: i.ingredient_name,
        quantity_used: Number(i.quantity_used),
        quantity_unit: i.quantity_unit,
        package_price: Number(i.package_price),
        package_quantity: Number(i.package_quantity),
        package_unit: i.package_unit,
      })));
    } else {
      setIngredients([]);
    }
  }, [savedIngredients]);

  const selectedProduct = products?.find(p => p.id === selectedProductId);

  const addIngredient = () => {
    setIngredients(prev => [...prev, {
      ingredient_name: '',
      quantity_used: 0,
      quantity_unit: 'g',
      package_price: 0,
      package_quantity: 1,
      package_unit: 'kg',
    }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  };

  const totalCostBatch = ingredients.reduce((sum, ing) => sum + calcIngredientCost(ing), 0);
  const costPerUnit = unitsProduced > 0 ? totalCostBatch / unitsProduced : 0;
  const profitPerUnit = selectedProduct ? selectedProduct.price - costPerUnit : 0;
  const profitMargin = selectedProduct && selectedProduct.price > 0 ? (profitPerUnit / selectedProduct.price) * 100 : 0;

  const handleSave = async () => {
    if (!selectedProductId) return;
    setSaving(true);
    try {
      // Delete old ingredients
      await supabase.from('recipe_ingredients' as any).delete().eq('product_id', selectedProductId);

      // Insert new ones
      if (ingredients.length > 0) {
        const rows = ingredients.map(ing => ({
          product_id: selectedProductId,
          ingredient_name: ing.ingredient_name,
          quantity_used: ing.quantity_used,
          quantity_unit: ing.quantity_unit,
          package_price: ing.package_price,
          package_quantity: ing.package_quantity,
          package_unit: ing.package_unit,
        }));
        const { error } = await supabase.from('recipe_ingredients' as any).insert(rows);
        if (error) throw error;
      }

      // Update product cost
      await supabase.from('products').update({ cost: Math.round(costPerUnit * 100) / 100 }).eq('id', selectedProductId);

      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients', selectedProductId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Receita e custo salvos!');
    } catch (err) {
      toast.error('Erro ao salvar');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7" /> Calculadora de Custo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Calcule o custo exato por unidade de produto com base nos ingredientes</p>
        </div>
      </div>

      {/* Product Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Label className="mb-2 block font-medium">Selecione o Produto</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um produto..." />
            </SelectTrigger>
            <SelectContent>
              {products?.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — R$ {Number(p.price).toFixed(2).replace('.', ',')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProductId && (
        <>
          {/* Units produced */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Quantas unidades essa receita rende?</Label>
                  <p className="text-xs text-muted-foreground">Ex: se a receita faz 5 potes, coloque 5</p>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={unitsProduced}
                  onChange={e => setUnitsProduced(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Ingredientes</CardTitle>
                <Button size="sm" variant="outline" onClick={addIngredient}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {ingredients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum ingrediente adicionado. Clique em "Adicionar" para começar.
                </p>
              )}
              {ingredients.map((ing, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Ingrediente {i + 1}</span>
                    <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeIngredient(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <Label>Nome do ingrediente</Label>
                    <Input
                      value={ing.ingredient_name}
                      onChange={e => updateIngredient(i, 'ingredient_name', e.target.value)}
                      placeholder="Ex: Farinha de trigo"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Quantidade usada na receita</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={ing.quantity_used || ''}
                          onChange={e => updateIngredient(i, 'quantity_used', parseFloat(e.target.value) || 0)}
                          placeholder="200"
                          className="flex-1"
                        />
                        <Select value={ing.quantity_unit} onValueChange={v => updateIngredient(i, 'quantity_unit', v)}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Preço da embalagem (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ing.package_price || ''}
                        onChange={e => updateIngredient(i, 'package_price', parseFloat(e.target.value) || 0)}
                        placeholder="5.90"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tamanho da embalagem</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={ing.package_quantity || ''}
                          onChange={e => updateIngredient(i, 'package_quantity', parseFloat(e.target.value) || 0)}
                          placeholder="1"
                          className="flex-1"
                        />
                        <Select value={ing.package_unit} onValueChange={v => updateIngredient(i, 'package_unit', v)}>
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PACKAGE_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="bg-background rounded-lg border border-border px-3 py-2 w-full text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo deste ingrediente</p>
                        <p className="text-lg font-bold text-primary font-display">
                          R$ {calcIngredientCost(ing).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Summary */}
          {ingredients.length > 0 && (
            <Card className="mb-6 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" /> Resumo de Custo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-muted/30 rounded-xl p-4 text-center border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Custo da Receita</p>
                    <p className="text-xl font-bold font-display">R$ {totalCostBatch.toFixed(2).replace('.', ',')}</p>
                    <p className="text-[10px] text-muted-foreground">{unitsProduced} unidade(s)</p>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-4 text-center border border-primary/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Custo por Unidade</p>
                    <p className="text-xl font-bold font-display text-primary">R$ {costPerUnit.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="bg-green-500/5 rounded-xl p-4 text-center border border-green-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Lucro por Unidade</p>
                    <p className={`text-xl font-bold font-display ${profitPerUnit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      R$ {profitPerUnit.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 text-center border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Margem de Lucro</p>
                    <p className={`text-xl font-bold font-display ${profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
                  <p><strong>Preço de venda:</strong> R$ {selectedProduct ? Number(selectedProduct.price).toFixed(2).replace('.', ',') : '0,00'}</p>
                  <p><strong>Custo calculado:</strong> R$ {costPerUnit.toFixed(2).replace('.', ',')} por unidade</p>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
                  <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Receita e Atualizar Custo do Produto'}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default CostCalculator;
