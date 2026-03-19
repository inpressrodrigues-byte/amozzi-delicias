import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Eye, Send, Trash2, CheckCircle2, Clock, XCircle, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Quotes = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [quotedPrice, setQuotedPrice] = useState(0);

  // Fetch custom orders
  const { data: customOrders, isLoading } = useQuery({
    queryKey: ['custom_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch products with recipes for cost calculation
  const { data: products } = useQuery({
    queryKey: ['products', false],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch recipe ingredients for cost base
  const { data: allIngredients } = useQuery({
    queryKey: ['all_recipe_ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recipe_ingredients').select('*');
      if (error) throw error;
      return data;
    },
  });

  const getProductCost = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    return product?.cost || 0;
  };

  const getProductByName = (name: string) => {
    return products?.find(p => p.name === name);
  };

  const availableProducts = products?.filter(p => p.available) || [];

  const calculateCostEstimate = (flavors: string[], weightKg: number) => {
    let totalCost = 0;
    flavors.forEach(flavor => {
      const product = getProductByName(flavor);
      if (product) {
        totalCost += Number(product.cost) * weightKg;
      }
    });
    return totalCost;
  };

  const openQuoteDialog = (order: any) => {
    setSelectedOrder(order);
    setSelectedFlavors(order.flavors || []);
    setQuotedPrice(Number(order.quoted_price) || 0);
  };

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors(prev =>
      prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]
    );
  };

  const costEstimate = selectedOrder
    ? calculateCostEstimate(selectedFlavors, Number(selectedOrder.weight_kg) || 1)
    : 0;

  const saveQuote = async () => {
    if (!selectedOrder) return;
    const { error } = await supabase
      .from('custom_orders')
      .update({
        flavors: selectedFlavors,
        quoted_price: quotedPrice,
        cost_estimate: costEstimate,
        status: 'orcado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedOrder.id);
    if (error) {
      toast.error('Erro ao salvar orçamento');
      return;
    }
    toast.success('Orçamento salvo!');
    setSelectedOrder(null);
    queryClient.invalidateQueries({ queryKey: ['custom_orders'] });
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('custom_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar');
      return;
    }
    toast.success('Status atualizado');
    queryClient.invalidateQueries({ queryKey: ['custom_orders'] });
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Excluir esta encomenda?')) return;
    const { error } = await supabase.from('custom_orders').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
      return;
    }
    toast.success('Encomenda excluída');
    queryClient.invalidateQueries({ queryKey: ['custom_orders'] });
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-800', icon: Clock },
    orcado: { label: 'Orçado', color: 'bg-blue-100 text-blue-800', icon: Calculator },
    aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    recusado: { label: 'Recusado', color: 'bg-red-100 text-red-800', icon: XCircle },
  };

  const margin = quotedPrice > 0 && costEstimate > 0
    ? ((quotedPrice - costEstimate) / quotedPrice * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Encomendas recebidas pelo site para orçar</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : !customOrders?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma encomenda recebida ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Quando alguém fizer uma encomenda pelo site, aparecerá aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {customOrders.map(order => {
              const sc = statusConfig[order.status] || statusConfig.pendente;
              const StatusIcon = sc.icon;
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{order.customer_name}</h3>
                          <Badge className={`${sc.color} text-xs flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {sc.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <p>📱 {order.customer_whatsapp}</p>
                          <p>🎂 {Number(order.weight_kg)}kg • Sabores: {(order.flavors as string[])?.join(', ') || 'A definir'}</p>
                          {order.desired_date && (
                            <p>📅 {format(new Date(order.desired_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</p>
                          )}
                          {order.notes && <p>📝 {order.notes}</p>}
                          {Number(order.quoted_price) > 0 && (
                            <p className="font-medium text-foreground">💰 Orçamento: R$ {Number(order.quoted_price).toFixed(2)}</p>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openQuoteDialog(order)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Orçar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteOrder(order.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quote Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Orçar Encomenda</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5">
              {/* Customer Info */}
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><strong>Cliente:</strong> {selectedOrder.customer_name}</p>
                <p><strong>WhatsApp:</strong> {selectedOrder.customer_whatsapp}</p>
                <p><strong>Peso:</strong> {Number(selectedOrder.weight_kg)}kg</p>
                {selectedOrder.desired_date && (
                  <p><strong>Data:</strong> {format(new Date(selectedOrder.desired_date + 'T12:00:00'), "dd/MM/yyyy")}</p>
                )}
                {selectedOrder.notes && <p><strong>Obs:</strong> {selectedOrder.notes}</p>}
              </div>

              {/* Flavor Selection */}
              <div>
                <Label className="mb-2 block font-semibold">Selecione os Sabores</Label>
                <div className="flex flex-wrap gap-2">
                  {availableProducts.map(product => {
                    const isSelected = selectedFlavors.includes(product.name);
                    const hasCost = Number(product.cost) > 0;
                    return (
                      <Badge
                        key={product.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer text-sm px-3 py-1.5 rounded-full transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-md scale-105'
                            : 'hover:bg-primary/10'
                        }`}
                        onClick={() => toggleFlavor(product.name)}
                      >
                        {isSelected ? '✓ ' : ''}{product.name}
                        {hasCost && (
                          <span className="ml-1 opacity-70 text-[10px]">
                            (R${Number(product.cost).toFixed(2)}/un)
                          </span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Cost Calculation */}
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" /> Cálculo de Custo
                  </h4>
                  <div className="text-sm space-y-1">
                    {selectedFlavors.map(flavor => {
                      const product = getProductByName(flavor);
                      const unitCost = product ? Number(product.cost) : 0;
                      const totalForFlavor = unitCost * (Number(selectedOrder.weight_kg) || 1);
                      return (
                        <div key={flavor} className="flex justify-between">
                          <span className="text-muted-foreground">{flavor} ({Number(selectedOrder.weight_kg)}kg)</span>
                          <span>R$ {totalForFlavor.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Custo Estimado Total</span>
                      <span className="text-destructive">R$ {costEstimate.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quoted Price */}
              <div>
                <Label htmlFor="quoted-price" className="font-semibold">Valor do Orçamento (R$)</Label>
                <Input
                  id="quoted-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={quotedPrice || ''}
                  onChange={e => setQuotedPrice(Number(e.target.value))}
                  placeholder="0.00"
                  className="mt-1"
                />
                {quotedPrice > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">Margem:</span>
                    <Badge className={`${
                      margin >= 50 ? 'bg-green-100 text-green-800' :
                      margin >= 20 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {margin.toFixed(1)}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Lucro: R$ {(quotedPrice - costEstimate).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={saveQuote} className="flex-1">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Salvar Orçamento
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const whatsapp = selectedOrder.customer_whatsapp?.replace(/\D/g, '');
                    if (!whatsapp) { toast.error('WhatsApp não informado'); return; }
                    const msg = `Olá ${selectedOrder.customer_name}! 😊\n\n` +
                      `Segue o orçamento do seu bolo:\n` +
                      `🎂 ${Number(selectedOrder.weight_kg)}kg\n` +
                      `🍰 Sabores: ${selectedFlavors.join(', ')}\n` +
                      `💰 Valor: R$ ${quotedPrice.toFixed(2)}\n\n` +
                      `Confirme se deseja prosseguir! 💜`;
                    window.open(`https://wa.me/55${whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                >
                  <Send className="h-4 w-4 mr-1" /> Enviar via WhatsApp
                </Button>
              </div>

              {/* Status Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="text-green-700" onClick={() => { updateStatus(selectedOrder.id, 'aprovado'); setSelectedOrder(null); }}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovado
                </Button>
                <Button size="sm" variant="outline" className="text-red-700" onClick={() => { updateStatus(selectedOrder.id, 'recusado'); setSelectedOrder(null); }}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Recusado
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Quotes;
