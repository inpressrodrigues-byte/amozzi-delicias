import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { data: settings } = useSiteSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', whatsapp: '', address: '', cep: '' });

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
          <Button onClick={() => navigate('/')}>Voltar à Loja</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.whatsapp || !form.address || !form.cep) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }));

      const { error } = await supabase.from('orders').insert({
        customer_name: form.name,
        customer_whatsapp: form.whatsapp,
        customer_address: form.address,
        customer_cep: form.cep,
        items: orderItems,
        total,
        status: 'pending',
      });

      if (error) throw error;

      // Send to WhatsApp
      const whatsappNumber = settings?.whatsapp_number?.replace(/\D/g, '') || '';
      const itemsList = items.map(i => `• ${i.quantity}x ${i.name} - R$${(i.price * i.quantity).toFixed(2)}`).join('\n');
      const message = `🧁 *Novo Pedido AMOZI*\n\n*Cliente:* ${form.name}\n*WhatsApp:* ${form.whatsapp}\n*Endereço:* ${form.address}\n*CEP:* ${form.cep}\n\n*Itens:*\n${itemsList}\n\n*Total: R$${total.toFixed(2)}*`;

      if (whatsappNumber) {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
      }

      clearCart();
      toast.success('Pedido realizado com sucesso!');
      navigate('/');
    } catch (err) {
      toast.error('Erro ao realizar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Finalizar Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-2 bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Resumo do Pedido</h3>
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome completo" />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro, cidade" />
              </div>
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg" disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar Pedido'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
