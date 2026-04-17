import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Sparkles, Brain, Trash2 } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-profit-analysis`;

const QUICK_PROMPTS = [
  '🤔 Por que meu lucro está baixo?',
  '📊 Meus preços estão corretos?',
  '💡 Como aumentar minha margem?',
  '🎯 Quais produtos são mais rentáveis?',
  '✂️ Onde posso cortar custos?',
];

interface ProfitAIChatProps {
  context: {
    period: string;
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    profitMargin: number;
    cogs: number;
    grossProfit: number;
    avgTicket: number;
    totalOrders: number;
    unpaidTotal: number;
    onlineRevenue: number;
    remoteRevenue: number;
    topProducts: Array<{ name: string; qty: number; revenue: number }>;
    expenseByCategory: Array<{ name: string; value: number }>;
    productMargins: Array<{ name: string; price: number; cost: number; margin: number }>;
  };
}

const ProfitAIChat = ({ context }: ProfitAIChatProps) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, context }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao conectar com a IA');
      }

      if (!resp.body) throw new Error('Stream não disponível');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e.message || 'Erro ao processar'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Brain className="h-4 w-4 text-white" />
            </div>
            Consultor IA — Análise de Lucro
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="text-muted-foreground h-8">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[420px]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-2">
                <Sparkles className="h-10 w-10 text-violet-500 mb-3" />
                <h3 className="font-semibold text-sm mb-1">Pergunte sobre suas finanças</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                  A IA analisa seus dados e dá sugestões práticas para melhorar sua margem.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-[11px] bg-muted hover:bg-muted/70 text-foreground px-2.5 py-1.5 rounded-full transition-colors border border-border/50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo sobre seu lucro..."
              className="flex-1 rounded-full h-9 text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:opacity-90 shrink-0 h-9 w-9"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitAIChat;
