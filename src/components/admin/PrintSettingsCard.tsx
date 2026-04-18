import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Printer, Eye } from 'lucide-react';
import { buildReceiptHtml, type PrintSettings, type PrintOrderData } from '@/lib/printOrder';

interface Props {
  value: PrintSettings;
  onChange: (next: PrintSettings) => void;
  logoUrl?: string | null;
}

const SAMPLE_ORDER: PrintOrderData = {
  source: 'site',
  customer_name: 'Maria Silva (Exemplo)',
  customer_whatsapp: '11987654321',
  customer_address: 'Rua das Flores, 123 - Apto 45 - Jardim Primavera',
  customer_cep: '01234-567',
  notes: 'Sem cobertura, por favor.',
  created_at: new Date().toISOString(),
  items: [
    { name: 'Bolo de Cenoura', quantity: 2, price: 18.5 },
    { name: 'Bolo de Chocolate', quantity: 1, price: 22 },
  ],
  total: 65,
  delivery_fee: 6,
  payment_method: 'pix',
  status: 'pending',
  tracking_code: 'AB12CD34',
};

export const PrintSettingsCard = ({ value, onChange, logoUrl }: Props) => {
  const [showPreview, setShowPreview] = useState(false);

  const update = (patch: Partial<PrintSettings>) => onChange({ ...value, ...patch });

  const previewHtml = buildReceiptHtml(SAMPLE_ORDER, { ...value, logo_url: logoUrl });

  const openPrintPreview = () => {
    const w = window.open('', '_blank', 'width=380,height=640');
    if (!w) return;
    w.document.open();
    w.document.write(previewHtml);
    w.document.close();
    w.addEventListener('load', () => setTimeout(() => w.print(), 200));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          <CardTitle>Impressão de Pedidos (Térmica 58mm)</CardTitle>
        </div>
        <CardDescription>
          Configure o cupom impresso na ZPrinter ou outra impressora térmica de 58mm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div>
            <Label className="text-sm font-semibold">🖨️ Imprimir automaticamente novos pedidos do site</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quando ativo, todo pedido novo do site será impresso sozinho enquanto o admin estiver aberto.
            </p>
          </div>
          <Switch
            checked={!!value.auto_print_enabled}
            onCheckedChange={(v) => update({ auto_print_enabled: v })}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Título do cabeçalho</Label>
            <Input
              value={value.header_title || ''}
              onChange={(e) => update({ header_title: e.target.value })}
              placeholder="AMOZI"
            />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input
              value={value.header_subtitle || ''}
              onChange={(e) => update({ header_subtitle: e.target.value })}
              placeholder="Delícias no Pote"
            />
          </div>
        </div>

        <div>
          <Label>Mensagem do rodapé</Label>
          <Input
            value={value.footer_message || ''}
            onChange={(e) => update({ footer_message: e.target.value })}
            placeholder="Obrigada pela preferência! 💕"
          />
        </div>

        <div>
          <Label>Informações extras (opcional)</Label>
          <Textarea
            value={value.extra_info || ''}
            onChange={(e) => update({ extra_info: e.target.value })}
            placeholder="Ex: CNPJ, Instagram, telefone, política de troca..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Aparece antes do rodapé. Use quebras de linha à vontade.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Tamanho da fonte (px)</Label>
            <Input
              type="number"
              min={9}
              max={16}
              value={value.font_size ?? 11}
              onChange={(e) => update({ font_size: Number(e.target.value) || 11 })}
            />
          </div>
          <div>
            <Label>Largura do papel (mm)</Label>
            <Input
              type="number"
              min={48}
              max={80}
              value={value.paper_width_mm ?? 58}
              onChange={(e) => update({ paper_width_mm: Number(e.target.value) || 58 })}
            />
          </div>
          <div>
            <Label>Margem esquerda (mm)</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={value.left_offset_mm ?? 5}
              onChange={(e) => update({ left_offset_mm: Number(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Aumente se o texto está cortando no lado esquerdo.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Espessura da fonte (escuridão)</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.font_weight ?? 600}
              onChange={(e) => update({ font_weight: Number(e.target.value) })}
            >
              <option value={400}>Normal (claro)</option>
              <option value={500}>Médio</option>
              <option value={600}>Semi-negrito (recomendado)</option>
              <option value={700}>Negrito</option>
              <option value={800}>Extra-negrito (mais escuro)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Aumente se a impressão sair muito apagada.
            </p>
          </div>
          <div>
            <Label>Tamanho da logo (mm)</Label>
            <Input
              type="number"
              min={20}
              max={56}
              value={value.logo_size_mm ?? 40}
              onChange={(e) => update({ logo_size_mm: Number(e.target.value) || 40 })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Largura máxima da logo. Padrão: 40mm.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Mostrar no cupom</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              { key: 'show_logo' as const, label: 'Logo da empresa (precisa estar carregada)' },
              { key: 'show_tracking_code' as const, label: 'Código de rastreio' },
              { key: 'show_whatsapp' as const, label: 'WhatsApp do cliente' },
              { key: 'show_address' as const, label: 'Endereço de entrega' },
              { key: 'show_notes' as const, label: 'Observações do pedido' },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center justify-between gap-3 p-2 rounded-md border bg-background">
                <span className="text-sm">{opt.label}</span>
                <Switch
                  checked={value[opt.key] !== false}
                  onCheckedChange={(v) => update({ [opt.key]: v } as any)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((p) => !p)}>
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Ocultar prévia' : 'Ver prévia'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openPrintPreview}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir cupom de teste
          </Button>
        </div>

        {showPreview && (
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              title="Prévia do cupom"
              srcDoc={previewHtml}
              className="w-full"
              style={{ height: 560, border: 0 }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
