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
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, ShoppingBag, FileSpreadsheet, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';

type RecordType = 'compra' | 'venda' | 'entrada' | 'saida';

const typeLabels: Record<RecordType, string> = { compra: 'Compra', venda: 'Venda', entrada: 'Entrada', saida: 'Saída' };
const typeColors: Record<RecordType, string> = { compra: 'text-orange-600', venda: 'text-green-600', entrada: 'text-blue-600', saida: 'text-destructive' };

const CATEGORIES = ['ingrediente', 'embalagem', 'transporte', 'equipamento', 'marketing', 'pessoal', 'aluguel', 'geral'];
const PERIODS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '12 meses', days: 365 },
  { label: 'Tudo', days: 0 },
];
const CHART_COLORS = ['hsl(25, 80%, 55%)', 'hsl(140, 50%, 40%)', 'hsl(210, 70%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(270, 60%, 55%)', 'hsl(45, 80%, 50%)', 'hsl(180, 50%, 40%)', 'hsl(320, 60%, 50%)'];

const Finances = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [period, setPeriod] = useState(30);
  const [filterType, setFilterType] = useState<string>('all');

  // Manual record form
  const [form, setForm] = useState({
    type: 'compra' as RecordType, description: '', amount: '', category: 'geral',
    supplier: '', customer_name: '', date: new Date().toISOString().split('T')[0], notes: '',
  });

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', category: 'ingrediente', date: new Date().toISOString().split('T')[0],
  });

  const cutoffDate = period > 0 ? new Date(Date.now() - period * 86400000).toISOString().split('T')[0] : undefined;

  // Queries
  const { data: records } = useQuery({
    queryKey: ['manual-records', cutoffDate],
    queryFn: async () => {
      let query = supabase.from('manual_records').select('*').order('date', { ascending: false });
      if (cutoffDate) query = query.gte('date', cutoffDate);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ['admin-expenses', cutoffDate],
    queryFn: async () => {
      let query = supabase.from('expenses').select('*').order('date', { ascending: false });
      if (cutoffDate) query = query.gte('date', cutoffDate);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ['admin-orders-finance', cutoffDate],
    queryFn: async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (cutoffDate) query = query.gte('created_at', cutoffDate);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Combined data
  const allExpenseItems = [
    ...(expenses?.map(e => ({ ...e, source: 'expense' as const, type: 'saida' as RecordType })) ?? []),
    ...(records ?? []),
  ];

  const filtered = filterType === 'all' ? allExpenseItems : allExpenseItems.filter(r => r.type === filterType);

  // Calculations
  const totalCompras = records?.filter(r => r.type === 'compra').reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalVendasManual = records?.filter(r => r.type === 'venda').reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalEntradas = records?.filter(r => r.type === 'entrada').reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalSaidasManual = records?.filter(r => r.type === 'saida').reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalExpensesTable = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
  const totalOrderRevenue = orders?.reduce((s, o) => s + Number(o.total), 0) ?? 0;

  const totalReceitas = totalOrderRevenue + totalVendasManual + totalEntradas;
  const totalGastos = totalCompras + totalSaidasManual + totalExpensesTable;
  const lucro = totalReceitas - totalGastos;

  // Add manual record
  const addRecord = async () => {
    if (!form.description || !form.amount) { toast.error('Preencha descrição e valor'); return; }
    const { error } = await supabase.from('manual_records').insert({
      type: form.type, description: form.description, amount: parseFloat(form.amount),
      category: form.category, supplier: form.supplier, customer_name: form.customer_name,
      date: form.date, notes: form.notes,
    });
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Registro adicionado!');
    queryClient.invalidateQueries({ queryKey: ['manual-records'] });
    setDialogOpen(false);
    setForm({ type: 'compra', description: '', amount: '', category: 'geral', supplier: '', customer_name: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  // Add expense
  const addExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) { toast.error('Preencha todos os campos'); return; }
    const { error } = await supabase.from('expenses').insert({
      description: expenseForm.description, amount: parseFloat(expenseForm.amount),
      category: expenseForm.category, date: expenseForm.date,
    });
    if (error) { toast.error('Erro ao adicionar gasto'); return; }
    toast.success('Gasto adicionado!');
    queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
    setExpenseDialogOpen(false);
    setExpenseForm({ description: '', amount: '', category: 'ingrediente', date: new Date().toISOString().split('T')[0] });
  };

  const deleteRecord = async (id: string, source?: string) => {
    if (!confirm('Excluir este registro?')) return;
    if (source === 'expense') {
      await supabase.from('expenses').delete().eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
    } else {
      await supabase.from('manual_records').delete().eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['manual-records'] });
    }
    toast.success('Registro excluído');
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Receitas
    const revenueData = orders?.map(o => ({
      'Data': new Date(o.created_at).toLocaleDateString('pt-BR'),
      'Cliente': o.customer_name, 'Total (R$)': Number(o.total).toFixed(2), 'Status': o.status,
    })) || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(revenueData), 'Pedidos');

    // Gastos
    const expenseData = expenses?.map(e => ({
      'Data': new Date(e.date).toLocaleDateString('pt-BR'), 'Descrição': e.description,
      'Categoria': e.category || 'ingrediente', 'Valor (R$)': Number(e.amount).toFixed(2),
    })) || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseData), 'Gastos');

    // Controle manual
    const manualData = records?.map(r => ({
      'Data': new Date(r.date).toLocaleDateString('pt-BR'),
      'Tipo': typeLabels[r.type as RecordType] || r.type,
      'Descrição': r.description, 'Categoria': r.category,
      'Valor (R$)': Number(r.amount).toFixed(2), 'Obs': r.notes,
    })) || [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(manualData), 'Controle Manual');

    // Resumo
    const summary = [
      { 'Item': 'Receita Pedidos', 'Valor (R$)': totalOrderRevenue.toFixed(2) },
      { 'Item': 'Vendas Manuais', 'Valor (R$)': totalVendasManual.toFixed(2) },
      { 'Item': 'Entradas', 'Valor (R$)': totalEntradas.toFixed(2) },
      { 'Item': 'Gastos (despesas)', 'Valor (R$)': totalExpensesTable.toFixed(2) },
      { 'Item': 'Compras', 'Valor (R$)': totalCompras.toFixed(2) },
      { 'Item': 'Saídas', 'Valor (R$)': totalSaidasManual.toFixed(2) },
      { 'Item': 'LUCRO', 'Valor (R$)': lucro.toFixed(2) },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Resumo');
    XLSX.writeFile(wb, `AMOZI_Financeiro_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Planilha exportada!');
  };

  // Chart data
  const monthlyData = (() => {
    const months: Record<string, { month: string; receitas: number; gastos: number }> = {};
    orders?.forEach(o => {
      const m = new Date(o.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, receitas: 0, gastos: 0 };
      months[m].receitas += Number(o.total);
    });
    records?.forEach(r => {
      const m = new Date(r.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, receitas: 0, gastos: 0 };
      if (r.type === 'venda' || r.type === 'entrada') months[m].receitas += Number(r.amount);
      else months[m].gastos += Number(r.amount);
    });
    expenses?.forEach(e => {
      const m = new Date(e.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, receitas: 0, gastos: 0 };
      months[m].gastos += Number(e.amount);
    });
    return Object.values(months).slice(-12);
  })();

  const categoryData = (() => {
    const cats: Record<string, number> = {};
    records?.forEach(r => { if (r.type === 'compra' || r.type === 'saida') cats[r.category || 'geral'] = (cats[r.category || 'geral'] || 0) + Number(r.amount); });
    expenses?.forEach(e => { cats[e.category || 'ingrediente'] = (cats[e.category || 'ingrediente'] || 0) + Number(e.amount); });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="font-display text-3xl font-bold">Financeiro</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar
          </Button>
          <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Gasto Rápido</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle className="font-display">Novo Gasto</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Descrição</Label><Input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Farinha de trigo" /></div>
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} /></div>
                <Button className="w-full" onClick={addExpense}>Adicionar Gasto</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Registro Manual</Button>
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
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.type === 'compra' && <div><Label>Fornecedor</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>}
                {form.type === 'venda' && <div><Label>Cliente</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-bold text-green-600">R$ {totalReceitas.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Gastos Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-bold text-destructive">R$ {totalGastos.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Lucro</CardTitle>
            <DollarSign className={`h-4 w-4 ${lucro >= 0 ? 'text-green-600' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className={`text-lg font-bold ${lucro >= 0 ? 'text-green-600' : 'text-destructive'}`}>R$ {lucro.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs">Pedidos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-bold">{orders?.length ?? 0}</div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      {monthlyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Receitas vs Gastos</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="receitas" fill="hsl(140, 50%, 40%)" name="Receitas" />
                  <Bar dataKey="gastos" fill="hsl(0, 84%, 60%)" name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {categoryData.length > 0 && (
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Gastos por Categoria</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name} fontSize={11}>
                      {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
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
              <SelectItem value="saida">Saídas/Gastos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered?.map(record => {
          const t = record.type as RecordType;
          const isPositive = t === 'venda' || t === 'entrada';
          const source = (record as any).source;
          return (
            <Card key={record.id} className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${typeColors[t] || 'text-destructive'}`}>
                    {source === 'expense' ? 'Gasto' : (typeLabels[t] || t)}
                  </span>
                  <p className="font-medium truncate">{record.description}</p>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                  {record.category && record.category !== 'geral' && <span>• {record.category}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className={`font-bold whitespace-nowrap ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
                  {isPositive ? '+' : '-'} R$ {Number(record.amount).toFixed(2)}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRecord(record.id, source)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
        {filtered?.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Nenhum registro encontrado.</p>}
      </div>
    </AdminLayout>
  );
};

export default Finances;
