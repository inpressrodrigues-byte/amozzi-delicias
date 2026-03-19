import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Eye, Send, Trash2, CheckCircle2, Clock, XCircle, Calculator, Plus, PlusCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Extra {
  name: string;
  price: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  orcado: { label: 'Orçado', color: 'bg-blue-100 text-blue-800', icon: Calculator },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  recusado: { label: 'Recusado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const Quotes = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [quotedPrice, setQuotedPrice] = useState(0);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState(0);

  // Manual quote creation
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualWhatsapp, setManualWhatsapp] = useState('');
  const [manualWeight, setManualWeight] = useState(1);
  const [manualDate, setManualDate] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualFlavors, setManualFlavors] = useState<string[]>([]);
  const [manualExtras, setManualExtras] = useState<Extra[]>([]);
  const [manualNewExtraName, setManualNewExtraName] = useState('');
  const [manualNewExtraPrice, setManualNewExtraPrice] = useState(0);
  const [manualQuotedPrice, setManualQuotedPrice] = useState(0);

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

  const { data: products } = useQuery({
    queryKey: ['products', false],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('available', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const getProductByName = (name: string) => products?.find(p => p.name === name);

  const calcCost = (flavors: string[], weightKg: number) => {
    let total = 0;
    flavors.forEach(f => {
      const p = getProductByName(f);
      if (p) total += Number(p.cost) * weightKg;
    });
    return total;
  };

  const calcExtrasTotal = (items: Extra[]) => items.reduce((s, e) => s + e.price, 0);

  // ---- Edit existing order ----
  const openQuoteDialog = (order: any) => {
    setSelectedOrder(order);
    setSelectedFlavors(order.flavors || []);
    setQuotedPrice(Number(order.quoted_price) || 0);
    setExtras((order.extras as Extra[]) || []);
  };

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors(prev =>
      prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]
    );
  };

  const addExtra = () => {
    if (!newExtraName.trim()) return;
    setExtras(prev => [...prev, { name: newExtraName.trim(), price: newExtraPrice }]);
    setNewExtraName('');
    setNewExtraPrice(0);
  };

  const removeExtra = (idx: number) => setExtras(prev => prev.filter((_, i) => i !== idx));

  const costEstimate = selectedOrder
    ? calcCost(selectedFlavors, Number(selectedOrder.weight_kg) || 1) + calcExtrasTotal(extras)
    : 0;

  const margin = quotedPrice > 0 && costEstimate > 0
    ? ((quotedPrice - costEstimate) / quotedPrice * 100) : 0;

  const saveQuote = async () => {
    if (!selectedOrder) return;
    const { error } = await supabase
      .from('custom_orders')
      .update({
        flavors: selectedFlavors as any,
        quoted_price: quotedPrice,
        cost_estimate: costEstimate,
        extras: extras as any,
        status: 'orcado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedOrder.id);
    if (error) { toast.error('Erro ao salvar orçamento'); return; }
    toast.success('Orçamento salvo!');
    setSelectedOrder(null);
    queryClient.invalidateQueries({ queryKey: ['custom_orders'] });
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('custom_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success('Status atualizado');
    queryClient.invalidateQueries({ queryKey: ['custom_orders'] });
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Excluir esta encomenda?')) return;
    const { error } = await supabase.from('custom_orders').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Encomenda excluída');
    queryClient.invalidateQueries({ queryKey: ['custom_orders'] });
  };

  // ---- Manual new quote ----
  const toggleManualFlavor = (f: string) => {
    setManualFlavors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const addManualExtra = () => {
    if (!manualNewExtraName.trim()) return;
    setManualExtras(prev => [...prev, { name: manualNewExtraName.trim(), price: manualNewExtraPrice }]);
    setManualNewExtraName('');
    setManualNewExtraPrice(0);
  };

  const manualCost = calcCost(manualFlavors, manualWeight) + calcExtrasTotal(manualExtras);
  const manualMargin = manualQuotedPrice > 0 && manualCost > 0
    ? ((manualQuotedPrice - manualCost) / manualQuotedPrice * 100) : 0;

  const resetManual = () => {
    setShowNewQuote(false);
    setManualName(''); setManualWhatsapp(''); setManualWeight(1);
    setManualDate(''); setManualNotes(''); setManualFlavors([]);
    setManualExtras([]); setManualQuotedPrice(0);
  };

  const saveManualQuote = async () => {
    if (!manualName.trim()) { toast.error('Preencha o nome do cliente'); return; }
    if (manualFlavors.length === 0) { toast.error('Selecione ao menos um sabor'); return; }

    const { error } = await supabase.from('custom_orders').insert([{
      customer_name: manualName.trim().slice(0, 100),
      customer_whatsapp: manualWhatsapp.trim().slice(0, 20),
      weight_kg: manualWeight,
      flavors: manualFlavors as any,
      extras: manualExtras as any,
      desired_date: manualDate || null,
      notes: manualNotes.trim().slice(0, 300),
      status: 'orcado',
      quoted_price: manualQuotedPrice,
      cost_estimate: manualCost,
    }]);
    if (error) { toast.error('Erro ao criar orçamento'); return; }
    toast.success('Orçamento criado!');
    resetManual();
    queryClient.invalidateQueries({ queryKey: ['custom_orders'] });
  };

  // ---- Flavor Selector Component ----
  const FlavorSelector = ({ selected, onToggle }: { selected: string[]; onToggle: (f: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {(products || []).map(product => {
        const isSelected = selected.includes(product.name);
        const hasCost = Number(product.cost) > 0;
        return (
          <Badge
            key={product.id}
            variant={isSelected ? 'default' : 'outline'}
            className={`cursor-pointer text-sm px-3 py-1.5 rounded-full transition-all ${
              isSelected ? 'bg-primary text-primary-foreground shadow-md scale-105' : 'hover:bg-primary/10'
            }`}
            onClick={() => onToggle(product.name)}
          >
            {isSelected ? '✓ ' : ''}{product.name}
            {hasCost && <span className="ml-1 opacity-70 text-[10px]">(R${Number(product.cost).toFixed(2)})</span>}
          </Badge>
        );
      })}
    </div>
  );

  // ---- Extras Editor Component ----
  const ExtrasEditor = ({
    items, onRemove, extraName, setExtraName, extraPrice, setExtraPrice, onAdd
  }: {
    items: Extra[]; onRemove: (i: number) => void;
    extraName: string; setExtraName: (v: string) => void;
    extraPrice: number; setExtraPrice: (v: number) => void;
    onAdd: () => void;
  }) => (
    <div className="space-y-2">
      <Label className="font-semibold block">Acréscimos</Label>
      {items.map((ex, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="flex-1">{ex.name}</span>
          <span className="font-medium">R$ {ex.price.toFixed(2)}</span>
          <button onClick={() => onRemove(idx)} className="text-destructive hover:text-destructive/80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          placeholder="Ex: Cobertura extra"
          value={extraName}
          onChange={e => setExtraName(e.target.value)}
          className="flex-1"
          maxLength={80}
        />
        <Input
          type="number"
          step="0.01"
          min={0}
          placeholder="R$"
          value={extraPrice || ''}
          onChange={e => setExtraPrice(Number(e.target.value))}
          className="w-24"
        />
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // ---- Cost Summary Component ----
  const CostSummary = ({
    flavors, weightKg, extrasItems, quotedPriceVal, marginVal
  }: {
    flavors: string[]; weightKg: number; extrasItems: Extra[];
    quotedPriceVal: number; marginVal: number;
  }) => {
    const baseCost = calcCost(flavors, weightKg);
    const extrasTotal = calcExtrasTotal(extrasItems);
    const total = baseCost + extrasTotal;
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Resumo de Custo
          </h4>
          <div className="text-sm space-y-1">
            {flavors.map(flavor => {
              const p = getProductByName(flavor);
              const c = p ? Number(p.cost) * weightKg : 0;
              return (
                <div key={flavor} className="flex justify-between">
                  <span className="text-muted-foreground">{flavor} ({weightKg}kg)</span>
                  <span>R$ {c.toFixed(2)}</span>
                </div>
              );
            })}
            {extrasItems.map((ex, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">+ {ex.name}</span>
                <span>R$ {ex.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Custo Total</span>
              <span className="text-destructive">R$ {total.toFixed(2)}</span>
            </div>
            {quotedPriceVal > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-muted-foreground">Margem:</span>
                <Badge className={`${
                  marginVal >= 50 ? 'bg-green-100 text-green-800' :
                  marginVal >= 20 ? 'bg-amber-100 text-amber-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {marginVal.toFixed(1)}%
                </Badge>
                <span className="text-muted-foreground text-xs">
                  Lucro: R$ {(quotedPriceVal - total).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Crie e gerencie orçamentos de encomendas</p>
          </div>
          <Button onClick={() => setShowNewQuote(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Orçamento
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : !customOrders?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum orçamento ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {customOrders.map(order => {
              const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendente;
              const StatusIcon = sc.icon;
              const orderExtras = (order as any).extras as Extra[] | null;
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{order.customer_name}</h3>
                          <Badge className={`${sc.color} text-xs flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />{sc.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          {order.customer_whatsapp && <p>📱 {order.customer_whatsapp}</p>}
                          <p>🎂 {Number(order.weight_kg)}kg • {(order.flavors as string[])?.join(', ') || 'Sem sabor'}</p>
                          {orderExtras && orderExtras.length > 0 && (
                            <p>➕ {orderExtras.map(e => `${e.name} (R$${e.price.toFixed(2)})`).join(', ')}</p>
                          )}
                          {order.desired_date && (
                            <p>📅 {format(new Date(order.desired_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</p>
                          )}
                          {order.notes && <p>📝 {order.notes}</p>}
                          {Number(order.quoted_price) > 0 && (
                            <p className="font-medium text-foreground">💰 R$ {Number(order.quoted_price).toFixed(2)}</p>
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

      {/* ===== Edit Quote Dialog ===== */}
      <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Orçar Encomenda</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><strong>Cliente:</strong> {selectedOrder.customer_name}</p>
                {selectedOrder.customer_whatsapp && <p><strong>WhatsApp:</strong> {selectedOrder.customer_whatsapp}</p>}
                <p><strong>Peso:</strong> {Number(selectedOrder.weight_kg)}kg</p>
                {selectedOrder.desired_date && <p><strong>Data:</strong> {format(new Date(selectedOrder.desired_date + 'T12:00:00'), "dd/MM/yyyy")}</p>}
                {selectedOrder.notes && <p><strong>Obs:</strong> {selectedOrder.notes}</p>}
              </div>

              <div>
                <Label className="mb-2 block font-semibold">Sabores Disponíveis</Label>
                <FlavorSelector selected={selectedFlavors} onToggle={toggleFlavor} />
              </div>

              <ExtrasEditor
                items={extras} onRemove={removeExtra}
                extraName={newExtraName} setExtraName={setNewExtraName}
                extraPrice={newExtraPrice} setExtraPrice={setNewExtraPrice}
                onAdd={addExtra}
              />

              <CostSummary
                flavors={selectedFlavors}
                weightKg={Number(selectedOrder.weight_kg) || 1}
                extrasItems={extras}
                quotedPriceVal={quotedPrice}
                marginVal={margin}
              />

              <div>
                <Label htmlFor="quoted-price" className="font-semibold">Valor do Orçamento (R$)</Label>
                <Input
                  id="quoted-price" type="number" step="0.01" min={0}
                  value={quotedPrice || ''} onChange={e => setQuotedPrice(Number(e.target.value))}
                  placeholder="0.00" className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveQuote} className="flex-1">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Salvar
                </Button>
                <Button variant="outline" onClick={() => {
                  const w = selectedOrder.customer_whatsapp?.replace(/\D/g, '');
                  if (!w) { toast.error('WhatsApp não informado'); return; }
                  const extrasText = extras.length > 0
                    ? `\n➕ Acréscimos: ${extras.map(e => `${e.name} R$${e.price.toFixed(2)}`).join(', ')}`
                    : '';
                  const msg = `Olá ${selectedOrder.customer_name}! 😊\n\nSegue o orçamento:\n🎂 ${Number(selectedOrder.weight_kg)}kg\n🍰 Sabores: ${selectedFlavors.join(', ')}${extrasText}\n💰 Valor: R$ ${quotedPrice.toFixed(2)}\n\nConfirme se deseja prosseguir! 💜`;
                  window.open(`https://wa.me/55${w}?text=${encodeURIComponent(msg)}`, '_blank');
                }}>
                  <Send className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
              </div>

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

      {/* ===== New Manual Quote Dialog ===== */}
      <Dialog open={showNewQuote} onOpenChange={open => { if (!open) resetManual(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Novo Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome do Cliente</Label>
                <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Nome" maxLength={100} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={manualWhatsapp} onChange={e => setManualWhatsapp(e.target.value)} placeholder="(11) 99999-9999" maxLength={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.5" min={0.5} value={manualWeight} onChange={e => setManualWeight(Number(e.target.value))} />
              </div>
              <div>
                <Label>Data Desejada</Label>
                <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block font-semibold">Sabores Disponíveis</Label>
              <FlavorSelector selected={manualFlavors} onToggle={toggleManualFlavor} />
            </div>

            <ExtrasEditor
              items={manualExtras} onRemove={(i) => setManualExtras(prev => prev.filter((_, idx) => idx !== i))}
              extraName={manualNewExtraName} setExtraName={setManualNewExtraName}
              extraPrice={manualNewExtraPrice} setExtraPrice={setManualNewExtraPrice}
              onAdd={addManualExtra}
            />

            <CostSummary
              flavors={manualFlavors} weightKg={manualWeight}
              extrasItems={manualExtras} quotedPriceVal={manualQuotedPrice}
              marginVal={manualMargin}
            />

            <div>
              <Label className="font-semibold">Valor do Orçamento (R$)</Label>
              <Input type="number" step="0.01" min={0} value={manualQuotedPrice || ''} onChange={e => setManualQuotedPrice(Number(e.target.value))} placeholder="0.00" className="mt-1" />
            </div>

            <div>
              <Label>Observações</Label>
              <Input value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder="Observações..." maxLength={300} />
            </div>

            <Button onClick={saveManualQuote} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Criar Orçamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Quotes;
