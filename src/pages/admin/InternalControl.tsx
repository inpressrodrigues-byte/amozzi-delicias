import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, FileSpreadsheet, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';

type RecordType = 'compra' | 'venda' | 'entrada' | 'saida';

const typeLabels: Record<RecordType, string> = {
  compra: 'Compra',
  venda: 'Venda',
  entrada: 'Entrada',
  saida: 'Saída',
};

const typeColors: Record<RecordType, string> = {
  compra: 'text-orange-600',
  venda: 'text-green-600',
  entrada: 'text-blue-600',
  saida: 'text-destructive',
};

const CATEGORIES = ['ingrediente', 'embalagem', 'transporte', 'equipamento', 'marketing', 'pessoal', 'aluguel', 'geral'];
const PERIODS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '12 meses', days: 365 },
  { label: 'Tudo', days: 0 },
];

const CHART_COLORS = ['hsl(25, 80%, 55%)', 'hsl(140, 50%, 40%)', 'hsl(210, 70%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(270, 60%, 55%)', 'hsl(45, 80%, 50%)', 'hsl(180, 50%, 40%)', 'hsl(320, 60%, 50%)'];

const InternalControl = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [period, setPeriod] = useState(30);
  const [filterType, setFilterType] = useState<string>('all');
  const [form, setForm] = useState({
    type: 'compra' as RecordType,
    description: '',
    amount: '',
    category: 'geral',
    supplier: '',
    customer_name: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const cutoffDate = period > 0
    ? new Date(Date.now() - period * 86400000).toISOString()
    : undefined;

  const { data: records } = useQuery({
    queryKey: ['manual-records', cutoffDate],
    queryFn: async () => {
      let query = supabase.from('manual_records').select('*').order('date', { ascending: false });
      if (cutoffDate) query = query.gte('date', cutoffDate.split('T')[0]);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filtered = filterType === 'all' ? records : records?.filter(r => r.type === filterType);

  // Calculations
  const totalCompras = records?.filter(r => r.type === 'compra').reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalVendas = records?.filter(r => r.type === 'venda').reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalEntradas = records?.filter(r => r.type === 'entrada').reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalSaidas = records?.filter(r => r.type === 'saida').reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const saldo = (totalVendas + totalEntradas) - (totalCompras + totalSaidas);

  const uniqueCustomers = new Set(records?.filter(r => r.customer_name).map(r => r.customer_name)).size;

  const addRecord = async () => {
    if (!form.description || !form.amount) { toast.error('Preencha descrição e valor'); return; }
    const { error } = await supabase.from('manual_records').insert({
      type: form.type,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      supplier: form.supplier,
      customer_name: form.customer_name,
      date: form.date,
      notes: form.notes,
    });
    if (error) { toast.error('Erro ao salvar registro'); return; }
    toast.success('Registro adicionado!');
    queryClient.invalidateQueries({ queryKey: ['manual-records'] });
    setDialogOpen(false);
    setForm({ type: 'compra', description: '', amount: '', category: 'geral', supplier: '', customer_name: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('manual_records').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['manual-records'] });
    toast.success('Registro excluído');
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = records?.map(r => ({
      'Data': new Date(r.date).toLocaleDateString('pt-BR'),
      'Tipo': typeLabels[r.type as RecordType] || r.type,
      'Descrição': r.description,
      'Categoria': r.category,
      'Fornecedor': r.supplier,
      'Cliente': r.customer_name,
      'Valor (R$)': Number(r.amount).toFixed(2),
      'Obs': r.notes,
    })) || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Registros');

    const summary = [
      { 'Item': 'Total Compras', 'Valor (R$)': totalCompras.toFixed(2) },
      { 'Item': 'Total Vendas', 'Valor (R$)': totalVendas.toFixed(2) },
      { 'Item': 'Total Entradas', 'Valor (R$)': totalEntradas.toFixed(2) },
      { 'Item': 'Total Saídas', 'Valor (R$)': totalSaidas.toFixed(2) },
      { 'Item': 'Saldo', 'Valor (R$)': saldo.toFixed(2) },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Resumo');
    XLSX.writeFile(wb, `Controle_Interno_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Planilha exportada!');
  };

  // Chart: monthly evolution
  const monthlyData = (() => {
    const months: Record<string, { month: string; entradas: number; saidas: number }> = {};
    records?.forEach(r => {
      const m = new Date(r.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, entradas: 0, saidas: 0 };
      if (r.type === 'venda' || r.type === 'entrada') months[m].entradas += Number(r.amount);
      else months[m].saidas += Number(r.amount);
    });
    return Object.values(months).slice(-12);
  })();

  // Chart: by category
  const categoryData = (() => {
    const cats: Record<string, number> = {};
    records?.forEach(r => {
      const cat = r.category || 'geral';
      cats[cat] = (cats[cat] || 0) + Number(r.amount);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();

  // Chart: by type
  const typeData = [
    { name: 'Compras', value: totalCompras },
    { name: 'Vendas', value: totalVendas },
    { name: 'Entradas', value: totalEntradas },
    { name: 'Saídas', value: totalSaidas },
  ].filter(d => d.value > 0);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="font-display text-3xl font-bold">Controle Interno</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Novo Registro</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display">Novo Registro</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as RecordType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compra">🛒 Compra</SelectItem>
                      <SelectItem value="venda">💰 Venda</SelectItem>
                      <SelectItem value="entrada">📥 Entrada</SelectItem>
                      <SelectItem value="saida">📤 Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: 5kg de farinha" /></div>
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(form.type === 'compra') && (
                  <div><Label>Fornecedor</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nome do fornecedor" /></div>
                )}
                {(form.type === 'venda') && (
                  <div><Label>Cliente</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Nome do cliente" /></div>
                )}
                <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Opcional" /></div>
                <Button className="w-full" onClick={addRecord}>Salvar Registro</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PERIODS.map(p => (
          <Button key={p.days} variant={period === p.days ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p.days)}>
            {p.label}
          </Button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Compras</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-bold text-orange-600">R$ {totalCompras.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-bold text-green-600">R$ {totalVendas.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-bold text-blue-600">R$ {totalEntradas.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-bold text-destructive">R$ {totalSaidas.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Saldo</CardTitle>
            <DollarSign className={`h-4 w-4 ${saldo >= 0 ? 'text-green-600' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className={`text-lg font-bold ${saldo >= 0 ? 'text-green-600' : 'text-destructive'}`}>R$ {saldo.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-bold">{uniqueCustomers}</div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      {records && records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Evolução Mensal</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="entradas" fill="hsl(140, 50%, 40%)" name="Entradas" />
                  <Bar dataKey="saidas" fill="hsl(0, 84%, 60%)" name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Por Tipo</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                    {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {categoryData.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Distribuição por Categoria</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" name="Valor (R$)">
                  {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Records list */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display text-xl font-bold">Registros</h2>
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="compra">Compras</SelectItem>
              <SelectItem value="venda">Vendas</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered?.map(record => {
          const t = record.type as RecordType;
          const isPositive = t === 'venda' || t === 'entrada';
          return (
            <Card key={record.id} className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${typeColors[t]}`}>
                    {typeLabels[t]}
                  </span>
                  <p className="font-medium truncate">{record.description}</p>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                  {record.category && record.category !== 'geral' && <span>• {record.category}</span>}
                  {record.supplier && <span>• {record.supplier}</span>}
                  {record.customer_name && <span>• {record.customer_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className={`font-bold whitespace-nowrap ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
                  {isPositive ? '+' : '-'} R$ {Number(record.amount).toFixed(2)}
                </span>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteRecord(record.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
        {filtered?.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>}
      </div>
    </AdminLayout>
  );
};

export default InternalControl;
