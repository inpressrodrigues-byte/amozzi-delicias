import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChefHat, Plus, Trash2, Sparkles, ArrowLeft, Save, Package, CheckCircle2 } from 'lucide-react';

const UNITS = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'un', label: 'Unidades' },
  { value: 'colher_sopa', label: 'Colher de sopa' },
  { value: 'colher_cha', label: 'Colher de chá' },
  { value: 'xicara', label: 'Xícara' },
];

const PACKAGE_UNITS = [
  { value: 'kg', label: 'Kg' },
  { value: 'L', label: 'Litros' },
  { value: 'dz', label: 'Dúzia' },
  { value: 'un', label: 'Unidades' },
  { value: 'pacote', label: 'Pacote' },
];

interface Ingredient {
  id?: string;
  ingredient_name: string;
  quantity_used: number;
  quantity_unit: string;
  package_price: number;
  package_quantity: number;
  package_unit: string;
}

const Recipes = () => {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [batchYield, setBatchYield] = useState(1);
  const [newIngredient, setNewIngredient] = useState<Ingredient>({
    ingredient_name: '', quantity_used: 0, quantity_unit: 'g',
    package_price: 0, package_quantity: 1, package_unit: 'kg',
  });

  const { data: products } = useQuery({
    queryKey: ['all-products-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: allIngredients } = useQuery({
    queryKey: ['all-recipe-ingredients-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recipe_ingredients').select('product_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(r => { counts[r.product_id] = (counts[r.product_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: ingredients, refetch: refetchIngredients } = useQuery({
    queryKey: ['recipe-ingredients', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const { data, error } = await supabase.from('recipe_ingredients')
        .select('*').eq('product_id', selectedProduct.id).order('ingredient_name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProduct,
  });

  const addIngredient = async () => {
    if (!newIngredient.ingredient_name || !selectedProduct) { toast.error('Preencha o nome do ingrediente'); return; }
    const { error } = await supabase.from('recipe_ingredients').insert({
      product_id: selectedProduct.id,
      ingredient_name: newIngredient.ingredient_name,
      quantity_used: newIngredient.quantity_used,
      quantity_unit: newIngredient.quantity_unit,
      package_price: newIngredient.package_price,
      package_quantity: newIngredient.package_quantity,
      package_unit: newIngredient.package_unit,
    });
    if (error) { toast.error('Erro ao adicionar'); return; }
    toast.success('Ingrediente adicionado!');
    setNewIngredient({ ingredient_name: '', quantity_used: 0, quantity_unit: 'g', package_price: 0, package_quantity: 1, package_unit: 'kg' });
    refetchIngredients();
  };

  const deleteIngredient = async (id: string) => {
    await supabase.from('recipe_ingredients').delete().eq('id', id);
    toast.success('Ingrediente removido');
    refetchIngredients();
  };

  const parseWithAI = async () => {
    if (!aiText.trim() || !selectedProduct) { toast.error('Cole o texto dos ingredientes'); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-recipes', {
        body: { text: aiText, product_name: selectedProduct.name },
      });
      if (error) throw error;
      if (data?.ingredients?.length) {
        for (const ing of data.ingredients) {
          await supabase.from('recipe_ingredients').insert({
            product_id: selectedProduct.id,
            ingredient_name: ing.ingredient_name,
            quantity_used: ing.quantity_used || 0,
            quantity_unit: ing.quantity_unit || 'g',
            package_price: ing.package_price || 0,
            package_quantity: ing.package_quantity || 1,
            package_unit: ing.package_unit || 'kg',
          });
        }
        toast.success(`${data.ingredients.length} ingredientes adicionados pela IA!`);
        setAiText('');
        refetchIngredients();
      } else {
        toast.error('IA não conseguiu extrair ingredientes');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao processar com IA');
    }
    setAiLoading(false);
  };

  const saveRecipeCost = async () => {
    if (!selectedProduct || !ingredients?.length) return;
    const convert = (qty: number, unit: string, pkgQty: number, pkgUnit: string): number => {
      let usedInBase = qty;
      let pkgInBase = pkgQty;
      if (unit === 'g' && pkgUnit === 'kg') { pkgInBase = pkgQty * 1000; }
      else if (unit === 'ml' && pkgUnit === 'L') { pkgInBase = pkgQty * 1000; }
      else if (unit === 'un' && pkgUnit === 'dz') { pkgInBase = pkgQty * 12; }
      return usedInBase / pkgInBase;
    };

    let totalCost = 0;
    ingredients.forEach(ing => {
      const fraction = convert(Number(ing.quantity_used), ing.quantity_unit, Number(ing.package_quantity), ing.package_unit);
      totalCost += fraction * Number(ing.package_price);
    });

    await supabase.from('products').update({ cost: totalCost }).eq('id', selectedProduct.id);
    toast.success(`Custo atualizado: R$ ${totalCost.toFixed(2)}`);
    queryClient.invalidateQueries({ queryKey: ['all-products-recipes'] });
  };

  // Calculate costs
  const calcCost = (ing: any) => {
    let usedInBase = Number(ing.quantity_used);
    let pkgInBase = Number(ing.package_quantity);
    if (ing.quantity_unit === 'g' && ing.package_unit === 'kg') pkgInBase *= 1000;
    else if (ing.quantity_unit === 'ml' && ing.package_unit === 'L') pkgInBase *= 1000;
    else if (ing.quantity_unit === 'un' && ing.package_unit === 'dz') pkgInBase *= 12;
    return (usedInBase / pkgInBase) * Number(ing.package_price);
  };

  const totalRecipeCost = ingredients?.reduce((s, i) => s + calcCost(i), 0) ?? 0;

  if (selectedProduct) {
    return (
      <AdminLayout>
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="font-display text-2xl font-bold">{selectedProduct.name}</h1>
              <p className="text-sm text-muted-foreground">Receita · {ingredients?.length || 0} ingredientes</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Custo da receita</p>
                <p className="text-xl font-bold">R$ {totalRecipeCost.toFixed(2)}</p>
              </div>
              <Button onClick={saveRecipeCost} disabled={!ingredients?.length}>
                <Save className="h-4 w-4 mr-1" /> Salvar Custo
              </Button>
            </div>
          </div>
        </div>

        {/* AI Parser */}
        <Card className="mb-6 border-dashed border-2 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Adicionar com IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Cole uma lista de ingredientes (texto livre, lista de compras, etc.) e a IA vai organizar automaticamente.
            </p>
            <Textarea
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              rows={4}
              placeholder="Ex: 200g de farinha de trigo, 3 ovos, 100ml de leite, 50g de manteiga..."
            />
            <Button onClick={parseWithAI} disabled={aiLoading} className="mt-2" size="sm">
              <Sparkles className="h-4 w-4 mr-1" />
              {aiLoading ? 'Processando...' : 'Organizar com IA'}
            </Button>
          </CardContent>
        </Card>

        {/* Manual add */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Adicionar ingrediente manual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-[11px]">Nome</Label>
                <Input className="h-8 text-xs" value={newIngredient.ingredient_name}
                  onChange={e => setNewIngredient(p => ({ ...p, ingredient_name: e.target.value }))}
                  placeholder="Farinha" />
              </div>
              <div>
                <Label className="text-[11px]">Qtd usada</Label>
                <Input className="h-8 text-xs" type="number" value={newIngredient.quantity_used || ''}
                  onChange={e => setNewIngredient(p => ({ ...p, quantity_used: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-[11px]">Unidade</Label>
                <Select value={newIngredient.quantity_unit} onValueChange={v => setNewIngredient(p => ({ ...p, quantity_unit: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Preço embalagem</Label>
                <Input className="h-8 text-xs" type="number" step="0.01" value={newIngredient.package_price || ''}
                  onChange={e => setNewIngredient(p => ({ ...p, package_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-[11px]">Qtd embalagem</Label>
                <Input className="h-8 text-xs" type="number" value={newIngredient.package_quantity || ''}
                  onChange={e => setNewIngredient(p => ({ ...p, package_quantity: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-[11px]">Un. embalagem</Label>
                <Select value={newIngredient.package_unit} onValueChange={v => setNewIngredient(p => ({ ...p, package_unit: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PACKAGE_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addIngredient} size="sm" className="mt-3">
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </CardContent>
        </Card>

        {/* Ingredients list */}
        <div className="space-y-2">
          {ingredients?.map(ing => (
            <Card key={ing.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{ing.ingredient_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ing.quantity_used}{ing.quantity_unit} usados · Embalagem: {ing.package_quantity}{ing.package_unit} por R$ {Number(ing.package_price).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">R$ {calcCost(ing).toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteIngredient(ing.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {ingredients?.length === 0 && (
            <p className="text-muted-foreground text-center py-8 text-sm">Nenhum ingrediente cadastrado. Use a IA ou adicione manualmente.</p>
          )}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Receitas</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie ingredientes e receitas dos seus produtos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products?.map(product => {
        const hasIngredients = (allIngredients?.[product.id] || 0) > 0;
        return (
          <Card
            key={product.id}
            className="cursor-pointer hover:shadow-md transition-shadow relative"
            onClick={() => setSelectedProduct(product)}
          >
            {hasIngredients && (
              <div className="absolute top-2 right-2 z-10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            )}
            <CardContent className="p-4 flex items-center gap-3">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category}</p>
                <p className="text-xs mt-1">
                  Custo: <span className="font-semibold">R$ {Number(product.cost).toFixed(2)}</span>
                  {' · '}Venda: <span className="font-semibold">R$ {Number(product.price).toFixed(2)}</span>
                </p>
              </div>
              <ChefHat className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
      </div>
    </AdminLayout>
  );
};

export default Recipes;
