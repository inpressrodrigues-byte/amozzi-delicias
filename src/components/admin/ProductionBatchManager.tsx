import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductionBatches,
  useCreateProductionBatch,
  useDeleteProductionBatch,
  getBatchStatus,
} from '@/hooks/useProductionBatches';
import { logAdminAction } from '@/hooks/useAdminLog';

interface Props {
  productId: string;
  productName: string;
}

const statusStyles: Record<string, string> = {
  expired: 'bg-red-100 text-red-700 border-red-300',
  critical: 'bg-orange-100 text-orange-700 border-orange-300',
  warning: 'bg-amber-100 text-amber-700 border-amber-300',
  fresh: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

const statusLabels: Record<string, string> = {
  expired: 'Vencido',
  critical: 'Vence hoje/amanhã',
  warning: 'Vence em breve',
  fresh: 'Fresco',
};

const ProductionBatchManager = ({ productId, productName }: Props) => {
  const { data: batches } = useProductionBatches(productId);
  const createBatch = useCreateProductionBatch();
  const deleteBatch = useDeleteProductionBatch();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [quantity, setQuantity] = useState('1');
  const [manufacturedAt, setManufacturedAt] = useState(todayStr);
  const [shelfLife, setShelfLife] = useState('7');
  const [notes, setNotes] = useState('');

  const previewExpiry = format(addDays(parseISO(manufacturedAt), parseInt(shelfLife) || 7), "dd 'de' MMMM", { locale: ptBR });

  const handleAdd = async () => {
    const qty = parseInt(quantity);
    const days = parseInt(shelfLife) || 7;
    if (!qty || qty <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    try {
      const batch = await createBatch.mutateAsync({
        product_id: productId,
        quantity: qty,
        manufactured_at: manufacturedAt,
        shelf_life_days: days,
        notes: notes || null,
      });
      logAdminAction('LOTE_PRODUZIDO', `${qty}x "${productName}" — fab. ${manufacturedAt}, val. ${batch.expires_at}`, 'production_batches', batch.id);
      toast.success(`Lote registrado! Vence em ${previewExpiry}`);
      setQuantity('1');
      setManufacturedAt(todayStr);
      setShelfLife('7');
      setNotes('');
    } catch (e: any) {
      toast.error('Erro ao registrar lote');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lote?')) return;
    try {
      await deleteBatch.mutateAsync(id);
      logAdminAction('LOTE_EXCLUÍDO', `Lote de "${productName}"`, 'production_batches', id);
      toast.success('Lote excluído');
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">Produção & Validade</Label>
      </div>

      {/* Add new batch */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <Label className="text-xs">Quantidade</Label>
          <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Validade (dias)</Label>
          <Input type="number" min="1" value={shelfLife} onChange={e => setShelfLife(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Data de Fabricação</Label>
          <Input type="date" value={manufacturedAt} onChange={e => setManufacturedAt(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Vence em</Label>
          <Input value={previewExpiry} readOnly className="bg-muted text-muted-foreground" />
        </div>
      </div>
      <Textarea
        placeholder="Observações do lote (opcional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        className="mb-2 text-sm"
      />
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        disabled={createBatch.isPending}
        className="w-full"
      >
        <Plus className="h-3 w-3 mr-1" /> Registrar Lote
      </Button>

      {/* Batch list */}
      {batches && batches.length > 0 && (
        <div className="mt-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Lotes ativos ({batches.length})</Label>
          {batches.map(b => {
            const { status, daysLeft } = getBatchStatus(b.expires_at);
            return (
              <div key={b.id} className="flex items-center justify-between gap-2 bg-card border border-border rounded-md p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong>{b.quantity}x</strong>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusStyles[status]}`}>
                      {status === 'expired' && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
                      {statusLabels[status]}
                      {status !== 'expired' && ` (${daysLeft}d)`}
                      {status === 'expired' && ` (${Math.abs(daysLeft)}d atrás)`}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    Fab. {format(parseISO(b.manufactured_at), 'dd/MM/yy')} · Vence {format(parseISO(b.expires_at), 'dd/MM/yy')}
                  </p>
                  {b.notes && <p className="text-muted-foreground italic truncate">{b.notes}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-7 w-7"
                  onClick={() => handleDelete(b.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductionBatchManager;
