import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import NutritionForm from '@/components/admin/NutritionForm';
import { useProductNutrition, useSaveNutrition, defaultNutrition, type NutritionData } from '@/hooks/useProductNutrition';
import { useProductCategories } from '@/hooks/useProductCategories';

const Products = () => {
  const { data: products, isLoading } = useProducts(false);
  const { categories, getCategoryLabel } = useProductCategories();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', cost: '', category: 'bolo_no_pote', available: true, profit_margin_type: 'percentage', profit_margin_value: '50', stock_quantity: '', tags: [] as string[] });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [nutritionForm, setNutritionForm] = useState<NutritionData>({ ...defaultNutrition });
  const { data: nutritionData } = useProductNutrition(editing?.id);
  const saveNutrition = useSaveNutrition();

  useEffect(() => {
    if (nutritionData) {
      setNutritionForm({
        calories: Number(nutritionData.calories), total_fat: Number(nutritionData.total_fat),
        saturated_fat: Number(nutritionData.saturated_fat), trans_fat: Number(nutritionData.trans_fat),
        cholesterol: Number(nutritionData.cholesterol), sodium: Number(nutritionData.sodium),
        total_carbs: Number(nutritionData.total_carbs), dietary_fiber: Number(nutritionData.dietary_fiber),
        total_sugars: Number(nutritionData.total_sugars), protein: Number(nutritionData.protein),
        serving_size: nutritionData.serving_size || '1 pote (200g)',
      });
    } else if (!editing) {
      setNutritionForm({ ...defaultNutrition });
    }
  }, [nutritionData, editing]);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', cost: '', category: 'bolo_no_pote', available: true, profit_margin_type: 'percentage', profit_margin_value: '50', stock_quantity: '', tags: [] });
    setImageFile(null);
    setEditing(null);
    setNutritionForm({ ...defaultNutrition });
  };

  const openEdit = (product: any) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      cost: String(product.cost),
      category: product.category,
      available: product.available,
      profit_margin_type: product.profit_margin_type || 'percentage',
      profit_margin_value: String(product.profit_margin_value || 50),
      stock_quantity: product.stock_quantity != null ? String(product.stock_quantity) : '',
      tags: Array.isArray(product.tags) ? product.tags as string[] : [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Nome e preço são obrigatórios'); return; }

    let image_url = editing?.image_url || null;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('product-images').upload(path, imageFile);
      if (uploadErr) { toast.error('Erro ao enviar imagem'); return; }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      cost: parseFloat(form.cost) || 0,
      category: form.category,
      available: form.available,
      image_url,
      profit_margin_type: form.profit_margin_type,
      profit_margin_value: parseFloat(form.profit_margin_value) || 0,
      stock_quantity: form.stock_quantity !== '' ? parseInt(form.stock_quantity) : null,
      tags: form.tags,
    };

    let productId = editing?.id;

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
    } else {
      const { data: newProduct, error } = await supabase.from('products').insert(payload).select('id').single();
      if (error) { toast.error('Erro ao adicionar'); return; }
      productId = newProduct.id;
    }

    // Save nutrition
    if (productId) {
      await saveNutrition.mutateAsync({ productId, nutrition: nutritionForm });
    }

    toast.success(editing ? 'Produto atualizado!' : 'Produto adicionado!');
    queryClient.invalidateQueries({ queryKey: ['products'] });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este produto?')) return;
    await supabase.from('products').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Produto excluído');
  };

  // Calculate suggested price
  const cost = parseFloat(form.cost) || 0;
  const marginVal = parseFloat(form.profit_margin_value) || 0;
  const suggestedPrice = form.profit_margin_type === 'percentage'
    ? cost * (1 + marginVal / 100)
    : cost + marginVal;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Estoque / Produtos</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div>
                <Label>Imagem do Produto</Label>
                <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Custo (R$)</Label>
                  <Input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
                </div>
                <div>
                  <Label>Preço de Venda (R$)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Margem</Label>
                  <Select value={form.profit_margin_type} onValueChange={v => setForm(f => ({ ...f, profit_margin_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Margem de Lucro</Label>
                  <Input type="number" step="0.01" value={form.profit_margin_value} onChange={e => setForm(f => ({ ...f, profit_margin_value: e.target.value }))} />
                </div>
              </div>
              {cost > 0 && (
                <p className="text-sm text-muted-foreground">
                  Preço sugerido: <strong className="text-primary">R$ {suggestedPrice.toFixed(2)}</strong>
                </p>
              )}
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estoque (quantidade)</Label>
                <Input type="number" step="1" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} placeholder="Deixe vazio = ilimitado" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.available} onCheckedChange={v => setForm(f => ({ ...f, available: v }))} />
                <Label>Disponível</Label>
              </div>
              <NutritionForm nutrition={nutritionForm} onChange={setNutritionForm} />
              <Button className="w-full bg-primary" onClick={handleSave}>{editing ? 'Atualizar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p>Carregando...</p> : (
        <div className="grid gap-4">
          {products?.map(product => (
            <Card key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🧁</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${product.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.available ? 'Disponível' : 'Indisponível'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{getCategoryLabel(product.category)}</p>
                <p className="text-sm">Custo: R$ {Number(product.cost).toFixed(2)} | Venda: <strong className="text-primary">R$ {Number(product.price).toFixed(2)}</strong>{product.stock_quantity != null && <span className="ml-2 text-muted-foreground">| Estoque: <strong>{product.stock_quantity}</strong></span>}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(product)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
          {products?.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum produto cadastrado.</p>}
        </div>
      )}
    </AdminLayout>
  );
};

export default Products;
