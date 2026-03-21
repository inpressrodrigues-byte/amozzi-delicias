import AdminLayout from '@/components/admin/AdminLayout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Plus, X, Users, MessageSquare, CheckCircle2, XCircle, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/hooks/useAdminLog';

const Messages = () => {
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [manualPhone, setManualPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ phone: string; success: boolean; error?: string }[] | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, whatsapp')
        .not('whatsapp', 'is', null)
        .not('whatsapp', 'eq', '')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    (c.whatsapp || '').includes(searchCustomer)
  );

  const addManualPhone = () => {
    const clean = manualPhone.replace(/\D/g, '');
    if (clean.length >= 10 && !selectedPhones.includes(clean)) {
      setSelectedPhones(prev => [...prev, clean]);
      setManualPhone('');
    } else {
      toast.error('Número inválido ou já adicionado');
    }
  };

  const toggleCustomer = (whatsapp: string) => {
    const clean = whatsapp.replace(/\D/g, '');
    if (!clean) return;
    setSelectedPhones(prev =>
      prev.includes(clean) ? prev.filter(p => p !== clean) : [...prev, clean]
    );
  };

  const selectAll = () => {
    const allPhones = customers
      .map(c => (c.whatsapp || '').replace(/\D/g, ''))
      .filter(p => p.length >= 10);
    setSelectedPhones([...new Set(allPhones)]);
  };

  const removePhone = (phone: string) => {
    setSelectedPhones(prev => prev.filter(p => p !== phone));
  };

  const sendMessages = async () => {
    if (selectedPhones.length === 0) return toast.error('Adicione pelo menos um número');
    if (!message.trim()) return toast.error('Digite uma mensagem');

    setSending(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phones: selectedPhones, message: message.trim() },
      });

      if (error) throw error;

      setResults(data.results);
      toast.success(`${data.sent} enviada(s), ${data.failed} falha(s)`);
      await logAdminAction('Envio WhatsApp em massa', `${data.sent} enviadas, ${data.failed} falhas para ${selectedPhones.length} números`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mensagens WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">Envie mensagens em massa via WhatsApp Business</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Recipients */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Destinatários
                  <Badge variant="secondary" className="ml-auto">{selectedPhones.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Manual add */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar número manual..."
                    value={manualPhone}
                    onChange={e => setManualPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addManualPhone()}
                  />
                  <Button size="icon" variant="outline" onClick={addManualPhone}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Selected phones */}
                {selectedPhones.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPhones.map(phone => (
                      <Badge key={phone} variant="secondary" className="gap-1 pr-1">
                        {phone}
                        <button onClick={() => removePhone(phone)} className="ml-0.5 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer list */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Banco de Dados</CardTitle>
                  <Button size="sm" variant="ghost" onClick={selectAll}>Selecionar todos</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchCustomer}
                    onChange={e => setSearchCustomer(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {filteredCustomers.map(c => {
                      const clean = (c.whatsapp || '').replace(/\D/g, '');
                      const checked = selectedPhones.includes(clean);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleCustomer(c.whatsapp || '')}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.whatsapp}</p>
                          </div>
                        </label>
                      );
                    })}
                    {filteredCustomers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente encontrado</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right: Message */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Mensagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Digite sua mensagem aqui... Ex: Olá! Agora temos WhatsApp Business! 🎂"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={8}
                  maxLength={4096}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{message.length}/4096</span>
                  <Button onClick={sendMessages} disabled={sending || selectedPhones.length === 0 || !message.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Enviar para {selectedPhones.length} contato{selectedPhones.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resultado do Envio</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-1.5">
                      {results.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg bg-muted/30">
                          {r.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          <span className="font-mono text-xs">{r.phone}</span>
                          {r.error && <span className="text-xs text-destructive truncate ml-auto">{r.error}</span>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Messages;
