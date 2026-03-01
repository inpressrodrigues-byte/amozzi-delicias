import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, Filter, Search, History, Package, Settings2, MessageSquare, Info, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Types ──
interface SelectedItem {
  product_id: string;
  name: string;
  image_url?: string | null;
  quantity: number;
}

const PAYMENT_OPTIONS = [
  { value: 'nao_pago', label: 'Não pago', variant: 'destructive' as const },
  { value: 'pago_pix', label: 'Pago PIX', variant: 'default' as const },
  { value: 'pago_dinheiro', label: 'Pago Dinheiro', variant: 'default' as const },
];

const BILLING_STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'cobrado', label: 'Cobrado', icon: Send, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'pago', label: 'Pago', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

// ── Main Component ──
const RemoteOrders = () => {
  const queryClient = useQueryClient();
  const { data: products } = useProducts(true);

  // Form state
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('nao_pago');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [filterName, setFilterName] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Billing settings state
  const [billingSettings, setBillingSettings] = useState({
    whatsapp_token: '',
    phone_number_id: '',
    pix_key: '',
    pix_name: '',
    billing_message: '',
    billing_enabled: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Queries ──
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

  const { data: settingsData } = useQuery({
    queryKey: ['billing-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settingsData) {
      setBillingSettings({
        whatsapp_token: settingsData.whatsapp_token || '',
        phone_number_id: settingsData.phone_number_id || '',
        pix_key: settingsData.pix_key || '',
        pix_name: settingsData.pix_name || '',
        billing_message: settingsData.billing_message || '',
        billing_enabled: settingsData.billing_enabled || false,
      });
    }
  }, [settingsData]);

  // ── Handlers ──
  const addItem = (product: any) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.description || product.name, image_url: product.image_url, quantity: 1, price: Number(product.price) || 0 }];
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
      customer_whatsapp: whatsapp.trim(),
      items: selectedItems as any,
      payment_status: paymentStatus,
      paid: paymentStatus !== 'nao_pago',
      notes: notes.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error('Erro ao criar pedido'); return; }
    toast.success('Pedido remoto criado!');
    setName(''); setSector(''); setWhatsapp(''); setPaymentStatus('nao_pago'); setSelectedItems([]); setNotes('');
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const updatePaymentStatus = async (id: string, status: string) => {
    const updateData: any = { payment_status: status, paid: status !== 'nao_pago' };
    if (status !== 'nao_pago') {
      updateData.billing_status = 'pago';
    }
    const { error } = await supabase.from('remote_orders').update(updateData).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const updateBillingStatus = async (id: string, status: string) => {
    const updateData: any = { billing_status: status };
    if (status === 'pago') {
      updateData.payment_status = 'pago_pix';
      updateData.paid = true;
    }
    const { error } = await supabase.from('remote_orders').update(updateData).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success(status === 'cobrado' ? 'Marcado como cobrado!' : status === 'pago' ? 'Marcado como pago!' : 'Status atualizado');
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const toggleDelivered = async (id: string, value: boolean) => {
    const { error } = await supabase.from('remote_orders').update({ delivered: value }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    if (value) toast.success('Pedido movido para o histórico!');
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const toggleSeparated = async (id: string, value: boolean) => {
    const { error } = await supabase.from('remote_orders').update({ separated: value }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const updateBillingDate = async (id: string, date: string) => {
    const { error } = await supabase.from('remote_orders').update({ billing_date: date || null }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar data'); return; }
    toast.success('Data de cobrança atualizada');
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Excluir este pedido remoto?')) return;
    const { error } = await supabase.from('remote_orders').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Pedido excluído');
    queryClient.invalidateQueries({ queryKey: ['remote-orders'] });
  };

  const saveBillingSettings = async () => {
    if (!settingsData?.id) return;
    setSavingSettings(true);
    const { error } = await supabase.from('billing_settings').update({
      whatsapp_token: billingSettings.whatsapp_token,
      phone_number_id: billingSettings.phone_number_id,
      pix_key: billingSettings.pix_key,
      pix_name: billingSettings.pix_name,
      billing_message: billingSettings.billing_message,
      billing_enabled: billingSettings.billing_enabled,
    }).eq('id', settingsData.id);
    setSavingSettings(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Configurações salvas!');
    queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
  };

  // ── Derived data ──
  const activeOrders = orders?.filter(o => !o.delivered);
  const deliveredOrders = orders?.filter(o => o.delivered);

  // Para cobrar: delivered orders with billing_date set, not yet paid
  const paraCobrar = deliveredOrders?.filter(o => 
    o.billing_date && (o as any).billing_status !== 'pago'
  ) || [];

  const cobrados = paraCobrar.filter(o => (o as any).billing_status === 'cobrado');
  const pendentes = paraCobrar.filter(o => (o as any).billing_status === 'pendente');

  const filteredOrders = activeOrders?.filter(order => {
    if (filterName && !order.customer_name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterPayment !== 'all' && order.payment_status !== filterPayment) return false;
    if (filterDateFrom && new Date(order.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(order.created_at) > to) return false;
    }
    return true;
  });

  const categories = [...new Set(products?.map(p => p.category) || [])];

  const getPaymentBadge = (status: string) => {
    const opt = PAYMENT_OPTIONS.find(o => o.value === status) || PAYMENT_OPTIONS[0];
    return <Badge variant={opt.variant} className="text-[11px] font-medium">{opt.label}</Badge>;
  };

  const getBillingStatusBadge = (status: string) => {
    const opt = BILLING_STATUS_OPTIONS.find(o => o.value === status) || BILLING_STATUS_OPTIONS[0];
    const Icon = opt.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${opt.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {opt.label}
      </span>
    );
  };

  // ── Order Card ──
  const OrderCard = ({ order, showBillingControls = false }: { order: any; showBillingControls?: boolean }) => {
    const items = Array.isArray(order.items) ? order.items as any[] : [];
    return (
      <div key={order.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm">{order.customer_name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {order.sector && <span className="text-[11px] text-muted-foreground">{order.sector}</span>}
              {order.customer_whatsapp && <span className="text-[11px] text-muted-foreground">📱 {order.customer_whatsapp}</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {format(new Date(order.created_at), "dd/MM/yy · HH:mm", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {getPaymentBadge(order.payment_status || (order.paid ? 'pago_dinheiro' : 'nao_pago'))}
            <button onClick={() => deleteOrder(order.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {items.map((item: any, i: number) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[12px] bg-muted/50 px-2 py-1 rounded-md">
              {item.image_url && <img src={item.image_url} alt={item.name} className="w-4 h-4 rounded object-cover" />}
              {item.quantity}x {item.name}
            </span>
          ))}
        </div>

        {order.notes && <p className="text-[11px] text-muted-foreground italic">Obs: {order.notes}</p>}

        {!showBillingControls ? (
          <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
            <Select
              value={order.payment_status || (order.paid ? 'pago_dinheiro' : 'nao_pago')}
              onValueChange={v => updatePaymentStatus(order.id, v)}
            >
              <SelectTrigger className="h-8 w-36 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-[12px] cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              <Checkbox checked={order.separated} onCheckedChange={v => toggleSeparated(order.id, v === true)} className="h-3.5 w-3.5" />
              Separado
            </label>
            <label className="flex items-center gap-1.5 text-[12px] cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              <Checkbox checked={order.delivered} onCheckedChange={v => toggleDelivered(order.id, v === true)} className="h-3.5 w-3.5" />
              Entregue
            </label>
          </div>
        ) : (
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getBillingStatusBadge((order as any).billing_status || 'pendente')}
              {order.billing_date && (
                <span className="text-[11px] text-muted-foreground">
                  Cobrança: {format(new Date(order.billing_date + 'T12:00:00'), "dd/MM/yy", { locale: ptBR })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                className="h-8 w-36 text-[11px]"
                value={order.billing_date || ''}
                onChange={e => updateBillingDate(order.id, e.target.value)}
              />
              {(order as any).billing_status === 'pendente' && (
                <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => updateBillingStatus(order.id, 'cobrado')}>
                  <Send className="h-3 w-3 mr-1" /> Marcar Cobrado
                </Button>
              )}
              {(order as any).billing_status === 'cobrado' && (
                <Button variant="outline" size="sm" className="h-8 text-[11px] border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => updateBillingStatus(order.id, 'pago')}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar Pago
                </Button>
              )}
              {order.payment_status === 'nao_pago' && (order as any).billing_status !== 'pago' && (
                <Select value={order.payment_status} onValueChange={v => updatePaymentStatus(order.id, v)}>
                  <SelectTrigger className="h-8 w-36 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ──
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>Pedidos Remotos</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie pedidos manuais e cobranças</p>
      </div>

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="new" className="text-xs data-[state=active]:bg-background">Novo Pedido</TabsTrigger>
          <TabsTrigger value="list" className="text-xs data-[state=active]:bg-background">
            Pedidos {activeOrders?.length ? `(${activeOrders.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-xs data-[state=active]:bg-background">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Para Cobrar {paraCobrar.length > 0 ? `(${paraCobrar.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs data-[state=active]:bg-background">
            <History className="h-3.5 w-3.5 mr-1" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-background">
            <Settings2 className="h-3.5 w-3.5 mr-1" /> Config
          </TabsTrigger>
        </TabsList>

        {/* ===== NEW ORDER TAB ===== */}
        <TabsContent value="new">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-sm font-semibold mb-3">Informações do cliente</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px]">Nome *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" className="h-9" />
                </div>
                <div>
                  <Label className="text-[11px]">Setor</Label>
                  <Input value={sector} onChange={e => setSector(e.target.value)} placeholder="Ex: Financeiro" className="h-9" />
                </div>
                <div>
                  <Label className="text-[11px]">WhatsApp</Label>
                  <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5511999999999" className="h-9" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">Observações</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alguma observação..." className="h-9" />
              </div>
              <div>
                <Label className="text-[11px]">Pagamento</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product catalog */}
            <div>
              <h2 className="text-sm font-semibold mb-3">Sabores</h2>
              {categories.map(cat => (
                <div key={cat} className="mb-4">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">{cat.replace(/_/g, ' ')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {products?.filter(p => p.category === cat).map(product => {
                      const sel = selectedItems.find(i => i.product_id === product.id);
                      return (
                        <button
                          key={product.id}
                          onClick={() => addItem(product)}
                          className={`relative flex items-center gap-2 text-left p-2 rounded-lg border transition-all text-[12px] ${
                            sel
                              ? 'border-foreground bg-foreground/5'
                              : 'border-border hover:border-foreground/30'
                          }`}
                        >
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.description || product.name} className="w-9 h-9 rounded-md object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium leading-tight">{product.description || product.name}</span>
                          {sel && (
                            <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                              {sel.quantity}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected items */}
            {selectedItems.length > 0 && (
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resumo</p>
                {selectedItems.map(item => (
                  <div key={item.product_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {item.image_url && <img src={item.image_url} alt={item.name} className="w-5 h-5 rounded object-cover" />}
                      <span className="text-[12px]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.product_id, -1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-[12px] font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product_id, 1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Criando...' : 'Criar Pedido'}
            </Button>
          </div>
        </TabsContent>

        {/* ===== LIST TAB ===== */}
        <TabsContent value="list">
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px]">Nome</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8 h-9 text-[12px]" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Buscar..." />
                </div>
              </div>
              <div>
                <Label className="text-[11px]">Pagamento</Label>
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">De</Label>
                <Input type="date" className="h-9 text-[12px]" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px]">Até</Label>
                <Input type="date" className="h-9 text-[12px]" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <div className="space-y-3">
              {filteredOrders?.map(order => <OrderCard key={order.id} order={order} />)}
              {filteredOrders?.length === 0 && (
                <p className="text-muted-foreground text-center py-8 text-sm">Nenhum pedido ativo.</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== BILLING TAB ===== */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pendentes</span>
                </div>
                <p className="text-2xl font-semibold">{pendentes.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Send className="h-4 w-4 text-blue-500" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Cobrados</span>
                </div>
                <p className="text-2xl font-semibold">{cobrados.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total p/ cobrar</span>
                </div>
                <p className="text-2xl font-semibold">{paraCobrar.length}</p>
              </div>
            </div>

            {/* Pendentes */}
            {pendentes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" /> Aguardando cobrança
                </h3>
                <div className="space-y-3">
                  {pendentes.map(order => <OrderCard key={order.id} order={order} showBillingControls />)}
                </div>
              </div>
            )}

            {/* Cobrados */}
            {cobrados.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-500" /> Cobrados — aguardando pagamento
                </h3>
                <div className="space-y-3">
                  {cobrados.map(order => <OrderCard key={order.id} order={order} showBillingControls />)}
                </div>
              </div>
            )}

            {paraCobrar.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma cobrança pendente.</p>
                <p className="text-[11px] text-muted-foreground mt-1">Defina uma data de cobrança no histórico para os pedidos aparecerem aqui.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="history">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Pedidos entregues. Defina datas de cobrança para gestão.</p>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <div className="space-y-3">
              {deliveredOrders?.map(order => <OrderCard key={order.id} order={order} showBillingControls />)}
              {deliveredOrders?.length === 0 && (
                <p className="text-muted-foreground text-center py-8 text-sm">Nenhum pedido no histórico.</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings">
          <div className="space-y-5">
            {/* Step by step */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Info className="h-4 w-4" /> Como integrar o Bot de Cobrança
              </h2>
              <ol className="space-y-3 text-[12px] text-muted-foreground">
                <li className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                  <div>
                    <p className="font-medium text-foreground">Criar conta Meta Business</p>
                    <p>Acesse <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline text-foreground">business.facebook.com</a> e crie uma conta.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                  <div>
                    <p className="font-medium text-foreground">Configurar WhatsApp Business API</p>
                    <p>Em Configurações {'>'} Contas WhatsApp, obtenha o <strong>Token</strong> e o <strong>Phone Number ID</strong>.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                  <div>
                    <p className="font-medium text-foreground">Criar Template de Mensagem</p>
                    <p>Crie um template aprovado no WhatsApp Manager.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold mt-0.5">4</span>
                  <div>
                    <p className="font-medium text-foreground">Preencha os campos abaixo e ative o bot</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* WhatsApp API */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> API WhatsApp
              </h2>
              <p className="text-[11px] text-muted-foreground mb-4">Credenciais da API oficial do WhatsApp Business (Meta).</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[11px]">Token de Acesso</Label>
                  <Input type="password" value={billingSettings.whatsapp_token} onChange={e => setBillingSettings(s => ({ ...s, whatsapp_token: e.target.value }))} placeholder="EAAxxxxxxx..." className="h-9" />
                </div>
                <div>
                  <Label className="text-[11px]">Phone Number ID</Label>
                  <Input value={billingSettings.phone_number_id} onChange={e => setBillingSettings(s => ({ ...s, phone_number_id: e.target.value }))} placeholder="123456789012345" className="h-9" />
                </div>
              </div>
            </div>

            {/* PIX */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-4">Chave PIX</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[11px]">Chave PIX</Label>
                  <Input value={billingSettings.pix_key} onChange={e => setBillingSettings(s => ({ ...s, pix_key: e.target.value }))} placeholder="email, CPF, telefone ou chave aleatória" className="h-9" />
                </div>
                <div>
                  <Label className="text-[11px]">Nome do titular</Label>
                  <Input value={billingSettings.pix_name} onChange={e => setBillingSettings(s => ({ ...s, pix_name: e.target.value }))} placeholder="Nome no PIX" className="h-9" />
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold">Mensagem de Cobrança</h2>
              <div className="flex flex-wrap gap-1.5">
                {['{nome}', '{itens}', '{pix}', '{pix_nome}'].map(v => (
                  <span key={v} className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">{v}</span>
                ))}
              </div>
              <Textarea
                rows={4}
                value={billingSettings.billing_message}
                onChange={e => setBillingSettings(s => ({ ...s, billing_message: e.target.value }))}
                placeholder="Olá {nome}! Passando para lembrar..."
                className="text-[12px]"
              />
              <div className="bg-muted/30 rounded-lg p-3 border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Preview</p>
                <p className="text-[12px] whitespace-pre-wrap">
                  {billingSettings.billing_message
                    .replace('{nome}', 'Maria Silva')
                    .replace('{itens}', '2x Morango, 1x Maracujá')
                    .replace('{pix}', billingSettings.pix_key || 'sua-chave-pix')
                    .replace('{pix_nome}', billingSettings.pix_name || 'Seu Nome')
                  }
                </p>
              </div>
            </div>

            {/* Toggle + Save */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={billingSettings.billing_enabled}
                    onCheckedChange={v => setBillingSettings(s => ({ ...s, billing_enabled: v }))}
                  />
                  <div>
                    <p className="text-sm font-medium">Ativar Bot</p>
                    <p className="text-[11px] text-muted-foreground">Cobra automaticamente na data programada</p>
                  </div>
                </div>
                <Button onClick={saveBillingSettings} disabled={savingSettings} size="sm">
                  {savingSettings ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default RemoteOrders;
