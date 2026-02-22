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
import { Plus, Minus, Trash2, Filter, Search, History, Package, Settings2, MessageSquare, Info } from 'lucide-react';
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
  { value: 'nao_pago', label: '❌ Não pago', variant: 'destructive' as const },
  { value: 'pago_pix', label: '✅ Pago PIX', variant: 'default' as const },
  { value: 'pago_dinheiro', label: '💵 Pago Dinheiro', variant: 'default' as const },
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
        .single();
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
      return [...prev, { product_id: product.id, name: product.description || product.name, image_url: product.image_url, quantity: 1 }];
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
    const { error } = await supabase.from('remote_orders').update({
      payment_status: status,
      paid: status !== 'nao_pago',
    }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
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
    return <Badge variant={opt.variant} className="text-xs">{opt.label}</Badge>;
  };

  // ── Order Card Sub-Component ──
  const OrderCard = ({ order, showBillingControls = false }: { order: any; showBillingControls?: boolean }) => {
    const items = Array.isArray(order.items) ? order.items as any[] : [];
    return (
      <Card key={order.id}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold">{order.customer_name}</p>
              {order.sector && <p className="text-xs text-muted-foreground">Setor: {order.sector}</p>}
              {order.customer_whatsapp && <p className="text-xs text-muted-foreground">📱 {order.customer_whatsapp}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getPaymentBadge(order.payment_status || (order.paid ? 'pago_dinheiro' : 'nao_pago'))}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteOrder(order.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="mt-2 space-y-1">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-8 h-8 rounded object-cover" />
                )}
                <span>{item.quantity}x {item.name}</span>
              </div>
            ))}
          </div>

          {order.notes && <p className="text-xs text-muted-foreground mt-1 italic">Obs: {order.notes}</p>}

          {!showBillingControls ? (
            <div className="mt-3 flex items-center gap-4 border-t pt-3 flex-wrap">
              <Select
                value={order.payment_status || (order.paid ? 'pago_dinheiro' : 'nao_pago')}
                onValueChange={v => updatePaymentStatus(order.id, v)}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={order.separated} onCheckedChange={v => toggleSeparated(order.id, v === true)} />
                Separado
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={order.delivered} onCheckedChange={v => toggleDelivered(order.id, v === true)} />
                Entregue
              </label>
            </div>
          ) : (
            <div className="mt-3 border-t pt-3 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {getPaymentBadge(order.payment_status || 'nao_pago')}
                {order.payment_status === 'nao_pago' && (
                  <Select value={order.payment_status} onValueChange={v => updatePaymentStatus(order.id, v)}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Data cobrança:</Label>
                <Input
                  type="date"
                  className="h-8 w-40 text-xs"
                  value={order.billing_date || ''}
                  onChange={e => updateBillingDate(order.id, e.target.value)}
                />
                {order.billing_sent && <Badge variant="outline" className="text-xs">📩 Enviada</Badge>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Render ──
  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Pedidos Remotos</h1>

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="new">Novo Pedido</TabsTrigger>
          <TabsTrigger value="list">
            Pedidos {activeOrders?.length ? `(${activeOrders.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4 mr-1" /> Config
          </TabsTrigger>
        </TabsList>

        {/* ===== NEW ORDER TAB ===== */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Registrar Pedido Remoto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" />
                </div>
                <div>
                  <Label>Setor</Label>
                  <Input value={sector} onChange={e => setSector(e.target.value)} placeholder="Ex: Financeiro, RH..." />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5511999999999" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Observações</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alguma observação..." />
                </div>
                <div>
                  <Label>Pagamento</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product catalog with thumbnails */}
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
                            className={`relative flex items-center gap-2 text-left p-2 rounded-lg border transition-all text-sm ${
                              sel
                                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.description || product.name} className="w-10 h-10 rounded-md object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium leading-tight">{product.description || product.name}</span>
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
                      <div className="flex items-center gap-2">
                        {item.image_url && <img src={item.image_url} alt={item.name} className="w-6 h-6 rounded object-cover" />}
                        <span>{item.name}</span>
                      </div>
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
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filtros</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-7 h-9" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Buscar..." />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Pagamento</Label>
                  <Select value={filterPayment} onValueChange={setFilterPayment}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {PAYMENT_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
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

          {isLoading ? <p>Carregando...</p> : (
            <div className="space-y-3">
              {filteredOrders?.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {filteredOrders?.length === 0 && (
                <p className="text-muted-foreground text-center py-8">Nenhum pedido ativo encontrado.</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="history">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" /> Histórico de Entregas
              </CardTitle>
              <CardDescription>Pedidos entregues. Configure datas de cobrança e o bot envia automaticamente.</CardDescription>
            </CardHeader>
          </Card>

          {isLoading ? <p>Carregando...</p> : (
            <div className="space-y-3">
              {deliveredOrders?.map(order => (
                <OrderCard key={order.id} order={order} showBillingControls />
              ))}
              {deliveredOrders?.length === 0 && (
                <p className="text-muted-foreground text-center py-8">Nenhum pedido no histórico ainda.</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Passo a passo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" /> Como integrar o Bot de Cobrança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs">1</Badge>
                    <div>
                      <p className="font-medium text-foreground">Criar conta Meta Business</p>
                      <p>Acesse <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">business.facebook.com</a> e crie uma conta empresarial.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs">2</Badge>
                    <div>
                      <p className="font-medium text-foreground">Configurar WhatsApp Business API</p>
                      <p>No Meta Business Suite, vá em <strong>Configurações {'>'} Contas WhatsApp</strong> e configure a API. Você receberá um <strong>Token de acesso</strong> e um <strong>Phone Number ID</strong>.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs">3</Badge>
                    <div>
                      <p className="font-medium text-foreground">Criar Template de Mensagem</p>
                      <p>No WhatsApp Manager, crie um template de mensagem aprovado pela Meta. Use variáveis como <code className="bg-muted px-1 rounded">{'{'}1{'}'}</code> para nome e <code className="bg-muted px-1 rounded">{'{'}2{'}'}</code> para itens.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs">4</Badge>
                    <div>
                      <p className="font-medium text-foreground">Preencher os campos abaixo</p>
                      <p>Cole o Token, Phone Number ID, sua chave PIX e personalize a mensagem de cobrança. Ative o bot e pronto!</p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* WhatsApp API Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Configurações da API WhatsApp
                </CardTitle>
                <CardDescription>Credenciais da API oficial do WhatsApp Business (Meta).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Token de Acesso (WhatsApp API)</Label>
                    <Input
                      type="password"
                      value={billingSettings.whatsapp_token}
                      onChange={e => setBillingSettings(s => ({ ...s, whatsapp_token: e.target.value }))}
                      placeholder="EAAxxxxxxx..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">Token permanente da API do WhatsApp Business</p>
                  </div>
                  <div>
                    <Label>Phone Number ID</Label>
                    <Input
                      value={billingSettings.phone_number_id}
                      onChange={e => setBillingSettings(s => ({ ...s, phone_number_id: e.target.value }))}
                      placeholder="123456789012345"
                    />
                    <p className="text-xs text-muted-foreground mt-1">ID do número no WhatsApp Business API</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PIX Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💰 Chave PIX</CardTitle>
                <CardDescription>Chave PIX que será enviada nas mensagens de cobrança.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Chave PIX</Label>
                    <Input
                      value={billingSettings.pix_key}
                      onChange={e => setBillingSettings(s => ({ ...s, pix_key: e.target.value }))}
                      placeholder="email@email.com, CPF, telefone ou chave aleatória"
                    />
                  </div>
                  <div>
                    <Label>Nome do titular</Label>
                    <Input
                      value={billingSettings.pix_name}
                      onChange={e => setBillingSettings(s => ({ ...s, pix_name: e.target.value }))}
                      placeholder="Nome que aparece no PIX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Template */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📝 Mensagem de Cobrança</CardTitle>
                <CardDescription>Personalize a mensagem enviada pelo bot. Use as variáveis abaixo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">{'{nome}'} = nome do cliente</Badge>
                  <Badge variant="secondary" className="text-xs">{'{itens}'} = lista de itens</Badge>
                  <Badge variant="secondary" className="text-xs">{'{pix}'} = chave PIX</Badge>
                  <Badge variant="secondary" className="text-xs">{'{pix_nome}'} = titular do PIX</Badge>
                </div>
                <Textarea
                  rows={5}
                  value={billingSettings.billing_message}
                  onChange={e => setBillingSettings(s => ({ ...s, billing_message: e.target.value }))}
                  placeholder="Olá {nome}! Passando para lembrar..."
                />
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Pré-visualização:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {billingSettings.billing_message
                      .replace('{nome}', 'Maria Silva')
                      .replace('{itens}', '2x Morango, 1x Maracujá')
                      .replace('{pix}', billingSettings.pix_key || 'sua-chave-pix')
                      .replace('{pix_nome}', billingSettings.pix_name || 'Seu Nome')
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Toggle + Save */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={billingSettings.billing_enabled}
                      onCheckedChange={v => setBillingSettings(s => ({ ...s, billing_enabled: v }))}
                    />
                    <div>
                      <p className="font-medium text-sm">Ativar Bot de Cobrança</p>
                      <p className="text-xs text-muted-foreground">O bot enviará cobranças automaticamente na data programada</p>
                    </div>
                  </div>
                  <Button onClick={saveBillingSettings} disabled={savingSettings}>
                    {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default RemoteOrders;
