import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Tag, Percent, DollarSign } from 'lucide-react';
import { logAdminAction } from '@/hooks/useAdminLog';

const Coupons = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_value: '0',
    max_uses: '',
    expires_at: '',
    active: true,
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const resetForm = () => setForm({ code: '', discount_type: 'percentage', discount_value: '', min_order_value: '0', max_uses: '', expires_at: '', active: true });

  const handleSave = async () => {
    if (!form.code || !form.discount_value) { toast.error('Preencha código e valor'); return; }
    const { error } = await supabase.from('coupons' as any).insert({
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_value: parseFloat(form.min_order_value) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      active: form.active,
    });
    if (error) {
      if (error.code === '23505') toast.error('Já existe um cupom com esse código');
      else toast.error('Erro ao criar cupom');
      return;
    }
    toast.success('Cupom criado!');
    queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    setDialogOpen(false);
    resetForm();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('coupons' as any).update({ active }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Excluir este cupom?')) return;
    await supabase.from('coupons' as any).delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    toast.success('Cupom excluído');
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">🏷️ Cupons de Desconto</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" /> Novo Cupom</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Criar Cupom</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Código do Cupom</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: BEMVINDO10"
                  className="font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Desconto</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{form.discount_type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percentage' ? '10' : '5.00'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pedido Mínimo (R$)</Label>
                  <Input type="number" step="0.01" value={form.min_order_value} onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))} />
                </div>
                <div>
                  <Label>Usos Máximos (vazio = ilimitado)</Label>
                  <Input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="∞" />
                </div>
              </div>
              <div>
                <Label>Válido até (opcional)</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                <Label>Ativo</Label>
              </div>
              <Button className="w-full bg-primary" onClick={handleSave}>Criar Cupom</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p>Carregando...</p> : (
        <div className="space-y-3">
          {coupons?.map(coupon => {
            const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
            const exhausted = coupon.max_uses && coupon.uses_count >= coupon.max_uses;
            return (
              <Card key={coupon.id} className="border-0 shadow-md">
                <CardContent className="flex items-center justify-between p-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${coupon.active && !expired && !exhausted ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Tag className={`h-5 w-5 ${coupon.active && !expired && !exhausted ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{coupon.code}</span>
                        {!coupon.active && <Badge variant="secondary">Inativo</Badge>}
                        {expired && <Badge variant="destructive">Expirado</Badge>}
                        {exhausted && <Badge variant="destructive">Esgotado</Badge>}
                        {coupon.active && !expired && !exhausted && <Badge className="bg-green-100 text-green-800">Ativo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {coupon.discount_type === 'percentage' ? (
                          <span className="flex items-center gap-1"><Percent className="h-3 w-3" />{coupon.discount_value}% de desconto</span>
                        ) : (
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />R$ {Number(coupon.discount_value).toFixed(2)} de desconto</span>
                        )}
                        {coupon.min_order_value > 0 && ` · Mín. R$ ${Number(coupon.min_order_value).toFixed(2)}`}
                        {coupon.max_uses && ` · ${coupon.uses_count}/${coupon.max_uses} usos`}
                        {!coupon.max_uses && ` · ${coupon.uses_count} usos`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={coupon.active} onCheckedChange={v => toggleActive(coupon.id, v)} />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCoupon(coupon.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {coupons?.length === 0 && (
            <div className="text-center py-16">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum cupom criado ainda.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default Coupons;
