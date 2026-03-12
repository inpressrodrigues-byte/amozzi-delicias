import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Package, User, Pencil, Eye, EyeOff, LogOut, Loader2, ShoppingBag, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SESSION_KEY = 'amozi-customer-session';

const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveSession = (data: { customer_id: string; token: string; name: string }) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
};

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

const formatWhatsapp = (value: string) => {
  let digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 7) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length > 2) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length > 0) return `(${digits}`;
  return '';
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(getSession);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Auth form
  const [isRegister, setIsRegister] = useState(false);
  const [authWhatsapp, setAuthWhatsapp] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Data
  const [customer, setCustomer] = useState<any>(null);
  const [siteOrders, setSiteOrders] = useState<any[]>([]);
  const [remoteOrders, setRemoteOrders] = useState<any[]>([]);

  // Profile edit
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', cpf: '', cep: '', address: '' });

  const handleAuth = async () => {
    if (!authWhatsapp.replace(/\D/g, '') || authWhatsapp.replace(/\D/g, '').length < 10) {
      toast.error('WhatsApp inválido'); return;
    }
    if (!authPassword || authPassword.length < 4) {
      toast.error('Senha deve ter no mínimo 4 caracteres'); return;
    }
    if (isRegister && (!authName.trim() || authName.trim().length < 2)) {
      toast.error('Nome obrigatório'); return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-auth', {
        body: {
          action: isRegister ? 'register' : 'login',
          whatsapp: authWhatsapp.replace(/\D/g, ''),
          password: authPassword,
          name: authName.trim(),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const sessionData = { customer_id: data.customer_id, token: data.token, name: data.name || authName };
      saveSession(sessionData);
      setSession(sessionData);
      toast.success(isRegister ? 'Conta criada!' : 'Login realizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!session) return;
    setDataLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-auth', {
        body: { action: 'get_orders', customer_id: session.customer_id, token: session.token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.error === 'Sessão inválida' || data.error === 'Não autenticado') {
          clearSession(); setSession(null); toast.error('Sessão expirada. Faça login novamente.');
          return;
        }
        throw new Error(data.error);
      }
      setCustomer(data.customer);
      setSiteOrders(data.site_orders || []);
      setRemoteOrders(data.remote_orders || []);
      setProfileForm({
        name: data.customer?.name || '',
        cpf: data.customer?.cpf || '',
        cep: data.customer?.cep || '',
        address: data.customer?.address || '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dados');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { if (session) loadData(); }, [session]);

  const saveProfile = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-auth', {
        body: {
          action: 'update_profile',
          customer_id: session.customer_id,
          token: session.token,
          ...profileForm,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Perfil atualizado!');
      setEditing(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setSession(null);
    setCustomer(null);
    setSiteOrders([]);
    setRemoteOrders([]);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      preparing: { label: 'Preparando', variant: 'secondary' },
      delivering: { label: 'Em entrega', variant: 'default' },
      delivered: { label: 'Entregue', variant: 'default' },
    };
    const s = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  const getPaymentBadge = (paid: boolean, paymentStatus?: string) => {
    if (paymentStatus === 'pago_pix') return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Pago PIX</Badge>;
    if (paymentStatus === 'pago_dinheiro') return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Pago Dinheiro</Badge>;
    if (paid) return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Pago</Badge>;
    return <Badge variant="destructive" className="text-[10px]">Não pago</Badge>;
  };

  // ── AUTH SCREEN ──
  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">Meus Pedidos</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isRegister ? 'Crie sua conta para acompanhar seus pedidos' : 'Entre com seu WhatsApp e senha'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {isRegister && (
                <div>
                  <Label>Nome</Label>
                  <Input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Seu nome completo" maxLength={100} />
                </div>
              )}
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={authWhatsapp}
                  onChange={e => setAuthWhatsapp(formatWhatsapp(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div>
                <Label>Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    maxLength={50}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleAuth} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isRegister ? 'Criar Conta' : 'Entrar'}
              </Button>
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isRegister ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── AUTHENTICATED SCREEN ──
  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando seus pedidos...</p>
        </div>
      </div>
    );
  }

  const allOrders = [
    ...siteOrders.map(o => ({ ...o, source: 'site' as const })),
    ...remoteOrders.map(o => ({ ...o, source: 'remote' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Olá, {customer?.name || session.name} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe seus pedidos e gerencie seu perfil</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="orders" className="text-xs data-[state=active]:bg-background gap-1.5">
              <Package className="h-3.5 w-3.5" /> Pedidos
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-background gap-1.5">
              <User className="h-3.5 w-3.5" /> Meu Perfil
            </TabsTrigger>
          </TabsList>

          {/* ORDERS TAB */}
          <TabsContent value="orders">
            {allOrders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
                <Button onClick={() => navigate('/')} className="mt-4" variant="outline">Ver Cardápio</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {allOrders.map(order => {
                  const items = Array.isArray(order.items) ? order.items as any[] : [];
                  const isSite = order.source === 'site';
                  return (
                    <Card key={order.id} className="border-border/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[9px]">
                                {isSite ? '🌐 Site' : '📋 Encomenda'}
                              </Badge>
                              {isSite ? getStatusBadge(order.status) : getPaymentBadge(order.paid, order.payment_status)}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(order.created_at), "dd/MM/yyyy · HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {isSite && order.total != null && (
                            <span className="text-sm font-bold text-primary font-display">
                              R$ {Number(order.total).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((item: any, i: number) => (
                            <span key={i} className="text-[11px] bg-muted/50 px-2 py-1 rounded-md">
                              {item.quantity}x {item.name}
                            </span>
                          ))}
                        </div>
                        {isSite && order.tracking_code && (
                          <button
                            onClick={() => navigate(`/rastrear/${order.tracking_code}`)}
                            className="text-[11px] text-primary hover:underline flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" /> Rastrear: {order.tracking_code}
                          </button>
                        )}
                        {!isSite && order.payment_status === 'nao_pago' && (
                          <p className="text-[11px] text-destructive flex items-center gap-1">
                            ⚠️ Pagamento pendente
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Meus Dados</CardTitle>
                  {!editing && (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div>
                      <Label className="text-[11px]">Nome</Label>
                      <Input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} className="h-9" maxLength={100} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px]">CPF</Label>
                        <Input
                          value={profileForm.cpf}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                            if (v.length > 9) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
                            else if (v.length > 6) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
                            else if (v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
                            setProfileForm(f => ({ ...f, cpf: v }));
                          }}
                          placeholder="000.000.000-00"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">CEP</Label>
                        <Input
                          value={profileForm.cep}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                            if (v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
                            setProfileForm(f => ({ ...f, cep: v }));
                          }}
                          placeholder="00000-000"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px]">Endereço</Label>
                      <Input value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro..." className="h-9" maxLength={300} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveProfile} disabled={loading} size="sm">
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        Salvar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Nome</span>
                      <span className="font-medium">{customer?.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">WhatsApp</span>
                      <span className="font-medium">{customer?.whatsapp ? formatWhatsapp(customer.whatsapp) : '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">CPF</span>
                      <span className="font-medium">{customer?.cpf || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">CEP</span>
                      <span className="font-medium">{customer?.cep || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Endereço</span>
                      <span className="font-medium text-right max-w-[200px]">{customer?.address || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Total de compras</span>
                      <span className="font-bold text-primary">{customer?.total_orders || 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyOrders;
