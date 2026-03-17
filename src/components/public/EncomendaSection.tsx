import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Cake, Send, Loader2 } from 'lucide-react';

const EncomendaSection = () => {
  const { data: products } = useProducts();
  const { data: settings } = useSiteSettings();
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', whatsapp: '', date: '', notes: '' });
  const [sending, setSending] = useState(false);

  // Get flavors from product names (bolo category)
  const flavors = products
    ?.filter(p => p.available)
    .map(p => p.name) ?? [];

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors(prev =>
      prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.whatsapp.trim()) {
      toast.error('Preencha nome e WhatsApp');
      return;
    }
    if (selectedFlavors.length === 0) {
      toast.error('Selecione pelo menos um sabor');
      return;
    }

    setSending(true);
    try {
      const whatsappNumber = settings?.whatsapp_number?.replace(/\D/g, '') || '';
      if (!whatsappNumber) {
        toast.error('WhatsApp da loja não configurado');
        return;
      }

      const flavorsList = selectedFlavors.join(', ');
      const msg = `🎂 *Nova Encomenda de Bolo*\n\n` +
        `*Nome:* ${form.name}\n` +
        `*WhatsApp:* ${form.whatsapp}\n` +
        `*Sabores:* ${flavorsList}\n` +
        `*Data desejada:* ${form.date || 'A combinar'}\n` +
        `*Observações:* ${form.notes || 'Nenhuma'}\n\n` +
        `Enviado pelo site AMOZI 💜`;

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
      toast.success('Redirecionando para o WhatsApp...');
      setSelectedFlavors([]);
      setForm({ name: '', whatsapp: '', date: '', notes: '' });
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="encomendas" className="py-20 bg-background relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-[0.3em]">Sob Medida</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-2 text-foreground">
            Encomendas
          </h2>
          <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
            Monte seu bolo personalizado escolhendo os sabores que mais ama. Encomendas sob medida para sua ocasião especial.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-3">
                <Cake className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-display text-xl">Faça sua Encomenda</CardTitle>
              <p className="text-sm text-muted-foreground">Escolha os sabores e entre em contato pelo WhatsApp</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="enc-name">Seu Nome</Label>
                    <Input
                      id="enc-name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nome completo"
                      className="rounded-lg"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="enc-whatsapp">WhatsApp</Label>
                    <Input
                      id="enc-whatsapp"
                      value={form.whatsapp}
                      onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="rounded-lg"
                      maxLength={20}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="enc-date">Data Desejada</Label>
                  <Input
                    id="enc-date"
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="rounded-lg"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label className="mb-3 block">Escolha os Sabores</Label>
                  <div className="flex flex-wrap gap-2">
                    {flavors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum sabor disponível no momento.</p>
                    ) : (
                      flavors.map(flavor => (
                        <Badge
                          key={flavor}
                          variant={selectedFlavors.includes(flavor) ? 'default' : 'outline'}
                          className={`cursor-pointer text-sm px-4 py-2 rounded-full transition-all ${
                            selectedFlavors.includes(flavor)
                              ? 'bg-primary text-primary-foreground shadow-md scale-105'
                              : 'hover:bg-primary/10'
                          }`}
                          onClick={() => toggleFlavor(flavor)}
                        >
                          {selectedFlavors.includes(flavor) ? '✓ ' : ''}{flavor}
                        </Badge>
                      ))
                    )}
                  </div>
                  {selectedFlavors.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedFlavors.length} sabor(es) selecionado(s)
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="enc-notes">Observações (opcional)</Label>
                  <Input
                    id="enc-notes"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Ex: bolo de 1kg, sem glúten, decoração especial..."
                    className="rounded-lg"
                    maxLength={300}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-primary hover:bg-primary/90 py-6 text-base font-bold"
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Enviar Encomenda via WhatsApp</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default EncomendaSection;
