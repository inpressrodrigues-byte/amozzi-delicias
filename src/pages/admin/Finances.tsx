import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const Finances = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'ingrediente', date: new Date().toISOString().split('T')[0] });

  const { data: expenses } = useQuery({
    queryKey: ['admin-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ['admin-orders-finance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const profit = totalRevenue - totalExpenses;

  const addExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) { toast.error('Preencha todos os campos'); return; }
    const { error } = await supabase.from('expenses').insert({
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      category: expenseForm.category,
      date: expenseForm.date,
    });
    if (error) { toast.error('Erro ao adicionar gasto'); return; }
    toast.success('Gasto adicionado!');
    queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
    setDialogOpen(false);
    setExpenseForm({ description: '', amount: '', category: 'ingrediente', date: new Date().toISOString().split('T')[0] });
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Excluir este gasto?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
    toast.success('Gasto excluído');
  };

  // Chart data - group by month
  const chartData = (() => {
    const months: Record<string, { month: string; receita: number; gastos: number }> = {};
    orders?.forEach(o => {
      const m = new Date(o.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, receita: 0, gastos: 0 };
      months[m].receita += Number(o.total);
    });
    expenses?.forEach(e => {
      const m = new Date(e.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, receita: 0, gastos: 0 };
      months[m].gastos += Number(e.amount);
    });
    return Object.values(months).slice(-12);
  })();

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Financeiro</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Receita Total</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">R$ {totalRevenue.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Gastos Totais</CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">R$ {totalExpenses.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Lucro Líquido</CardTitle>
            <DollarSign className={`h-5 w-5 ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent><div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>R$ {profit.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle className="text-lg">Receita vs Gastos</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="receita" fill="hsl(140, 50%, 40%)" name="Receita" />
                  <Bar dataKey="gastos" fill="hsl(0, 84%, 60%)" name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Evolução</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="receita" stroke="hsl(140, 50%, 40%)" name="Receita" />
                  <Line type="monotone" dataKey="gastos" stroke="hsl(0, 84%, 60%)" name="Gastos" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Gastos</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" /> Novo Gasto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Registrar Gasto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Descrição</Label><Input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Farinha de trigo" /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Data</Label><Input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} /></div>
              <Button className="w-full bg-primary" onClick={addExpense}>Adicionar Gasto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {expenses?.map(expense => (
          <Card key={expense.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{expense.description}</p>
              <p className="text-sm text-muted-foreground">{new Date(expense.date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-destructive">- R$ {Number(expense.amount).toFixed(2)}</span>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteExpense(expense.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
        {expenses?.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum gasto registrado.</p>}
      </div>
    </AdminLayout>
  );
};

export default Finances;
