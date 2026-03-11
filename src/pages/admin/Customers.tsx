import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Trash2, Users, Package, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '@/components/ui/label';

const Customers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', whatsapp: '', sector: '' });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = customers?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.whatsapp || '').includes(search) ||
    (c.sector || '').toLowerCase().includes(search.toLowerCase())
  );

  const deleteCustomer = async (id: string) => {
    if (!confirm('Excluir este cliente do banco de dados?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Cliente excluído');
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, whatsapp: c.whatsapp || '', sector: c.sector || '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from('customers').update({
      name: editForm.name,
      whatsapp: editForm.whatsapp,
      sector: editForm.sector,
    }).eq('id', editingId);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success('Cliente atualizado');
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>Banco de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">Todos os clientes e seu histórico de compras</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, WhatsApp ou setor..." />
        </div>
        <Badge variant="outline" className="text-xs gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {customers?.length || 0} clientes
        </Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {filtered?.map(customer => {
            const history = Array.isArray(customer.purchase_history) ? customer.purchase_history as any[] : [];
            const isExpanded = expandedId === customer.id;
            const isEditing = editingId === customer.id;

            return (
              <div key={customer.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold">{customer.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{customer.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {customer.sector && <span>{customer.sector}</span>}
                        {customer.whatsapp && <span>📱 {customer.whatsapp}</span>}
                        <span>{customer.total_orders || 0} pedidos</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startEdit(customer)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteCustomer(customer.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : customer.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px]">Nome</Label>
                        <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-[11px]">WhatsApp</Label>
                        <Input value={editForm.whatsapp} onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-[11px]">Setor</Label>
                        <Input value={editForm.sector} onChange={e => setEditForm(f => ({ ...f, sector: e.target.value }))} className="h-8" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}

                {isExpanded && history.length > 0 && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico de compras</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {history.slice().reverse().map((entry: any, i: number) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-2.5 text-[12px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">
                              {entry.date ? format(new Date(entry.date), "dd/MM/yy · HH:mm", { locale: ptBR }) : 'Sem data'}
                            </span>
                            <Badge variant={entry.paid ? 'default' : 'destructive'} className="text-[10px]">
                              {entry.paid ? 'Pago' : 'Não pago'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(entry.items || []).map((item: any, j: number) => (
                              <span key={j} className="bg-background px-1.5 py-0.5 rounded text-[11px]">
                                {item.quantity}x {item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isExpanded && history.length === 0 && (
                  <div className="px-4 pb-4 border-t border-border pt-3 text-center">
                    <p className="text-[11px] text-muted-foreground">Nenhuma compra registrada ainda.</p>
                  </div>
                )}
              </div>
            );
          })}
          {filtered?.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
              <p className="text-[11px] text-muted-foreground mt-1">Os clientes são salvos automaticamente ao criar pedidos remotos.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default Customers;
