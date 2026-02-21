import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SelectedItem {
  product_id: string;
  name: string;
  quantity: number;
}

const RemoteOrders = () => {
  const queryClient = useQueryClient();
  const { data: products } = useProducts(true);

  // Form state
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [paid, setPaid] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [filterName, setFilterName] = useState('');
  const [filterPaid, setFilterPaid] = useState<string>('all');
  const [filterSeparated, setFilterSeparated] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['remote-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remote_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addItem = (product: any) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.description || product.name, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setSelectedItems(prev => prev
      .map(i => i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Preencha o nome'); return; }
    if (selectedItems.length === 0) { toast.error('Selecione ao menos um sabor'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('remote_orders').insert({
      customer_name: name.trim(),
      sector: sector.trim(),
      items: selectedItems as any,
      paid,
      notes: notes.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error('Erro ao criar pedido'); return; }
    toast.success('Pedido remoto criado!');
    setName(''); setSector(''); setPaid(false); setSelectedItems([]); setNotes('');
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const toggleField = async (id: string, field: 'paid' | 'separated', value: boolean) => {
    const { error } = await supabase.from('remote_orders').update({ [field]: value }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Excluir este pedido remoto?')) return;
    const { error } = await supabase.from('remote_orders').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Pedido excluído');
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  // Filter logic
  const filteredOrders = orders?.filter(order => {
    if (filterName && !order.customer_name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterPaid === 'paid' && !order.paid) return false;
    if (filterPaid === 'unpaid' && order.paid) return false;
    if (filterSeparated === 'yes' && !order.separated) return false;
    if (filterSeparated === 'no' && order.separated) return false;
    if (filterDateFrom && new Date(order.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(order.created_at) > to) return false;
    }
    return true;
  });

  const categories = [...new Set(products?.map(p => p.category) || [])];

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Pedidos Remotos</h1>

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="new">Novo Pedido</TabsTrigger>
          <TabsTrigger value="list">Lista de Pedidos</TabsTrigger>
        </TabsList>

        {/* ===== NEW ORDER TAB ===== */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Registrar Pedido Remoto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" />
                </div>
                <div>
                  <Label>Setor</Label>
                  <Input value={sector} onChange={e => setSector(e.target.value)} placeholder="Ex: Financeiro, RH..." />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alguma observação..." />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="paid-check" checked={paid} onCheckedChange={v => setPaid(v === true)} />
                <Label htmlFor="paid-check" className="cursor-pointer">Já foi pago</Label>
              </div>

              {/* Product catalog */}
              <div>
                <Label className="text-base font-semibold">Sabores</Label>
                {categories.map(cat => (
                  <div key={cat} className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-2 capitalize">{cat.replace(/_/g, ' ')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {products?.filter(p => p.category === cat).map(product => {
                        const sel = selectedItems.find(i => i.product_id === product.id);
                        return (
                          <button
                            key={product.id}
                            onClick={() => addItem(product)}
                            className={`relative text-left p-3 rounded-lg border transition-all text-sm ${
                              sel
                                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <span className="font-medium">{product.description || product.name}</span>
                            {sel && (
                              <Badge className="absolute top-1 right-1 text-[10px] px-1.5">{sel.quantity}</Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected items summary */}
              {selectedItems.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-semibold">Itens selecionados:</p>
                  {selectedItems.map(item => (
                    <div key={item.product_id} className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product_id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
                {submitting ? 'Criando...' : 'Criar Pedido Remoto'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== LIST TAB ===== */}
        <TabsContent value="list">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filtros</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-7 h-9" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Buscar..." />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Pagamento</Label>
                  <Select value={filterPaid} onValueChange={setFilterPaid}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pagos</SelectItem>
                      <SelectItem value="unpaid">Não pagos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Separado</Label>
                  <Select value={filterSeparated} onValueChange={setFilterSeparated}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Separados</SelectItem>
                      <SelectItem value="no">Não separados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data início</Label>
                  <Input type="date" className="h-9" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Data fim</Label>
                  <Input type="date" className="h-9" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders list */}
          {isLoading ? <p>Carregando...</p> : (
            <div className="space-y-3">
              {filteredOrders?.map(order => {
                const items = Array.isArray(order.items) ? order.items as any[] : [];
                return (
                  <Card key={order.id}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-semibold">{order.customer_name}</p>
                          {order.sector && <p className="text-xs text-muted-foreground">Setor: {order.sector}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={order.paid ? 'default' : 'destructive'} className="text-xs">
                            {order.paid ? '✅ Pago' : '❌ Não pago'}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteOrder(order.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 space-y-0.5">
                        {items.map((item: any, i: number) => (
                          <p key={i} className="text-sm">{item.quantity}x {item.name}</p>
                        ))}
                      </div>

                      {order.notes && <p className="text-xs text-muted-foreground mt-1 italic">Obs: {order.notes}</p>}

                      <div className="mt-3 flex items-center gap-6 border-t pt-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={order.paid}
                            onCheckedChange={v => toggleField(order.id, 'paid', v === true)}
                          />
                          Pago
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={order.separated}
                            onCheckedChange={v => toggleField(order.id, 'separated', v === true)}
                          />
                          Separado
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredOrders?.length === 0 && (
                <p className="text-muted-foreground text-center py-8">Nenhum pedido remoto encontrado.</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default RemoteOrders;
