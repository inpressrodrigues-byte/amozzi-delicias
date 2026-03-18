import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, User, Clock, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

const ALLOWED_EMAIL_PREFIX = 'inpress.rodrigues';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  PRODUTO_CRIADO: { label: 'Produto criado', color: 'bg-green-100 text-green-800' },
  PRODUTO_EDITADO: { label: 'Produto editado', color: 'bg-blue-100 text-blue-800' },
  PRODUTO_EXCLUÍDO: { label: 'Produto excluído', color: 'bg-red-100 text-red-800' },
  PEDIDO_STATUS: { label: 'Status pedido', color: 'bg-purple-100 text-purple-800' },
  PEDIDO_EXCLUÍDO: { label: 'Pedido excluído', color: 'bg-red-100 text-red-800' },
  REMOTO_CRIADO: { label: 'Remoto criado', color: 'bg-green-100 text-green-800' },
  REMOTO_EDITADO: { label: 'Remoto editado', color: 'bg-blue-100 text-blue-800' },
  REMOTO_EXCLUÍDO: { label: 'Remoto excluído', color: 'bg-red-100 text-red-800' },
  CUPOM_CRIADO: { label: 'Cupom criado', color: 'bg-green-100 text-green-800' },
  CUPOM_EXCLUÍDO: { label: 'Cupom excluído', color: 'bg-red-100 text-red-800' },
  CONFIG_SALVA: { label: 'Config salva', color: 'bg-amber-100 text-amber-800' },
  BACKUP_EXPORT: { label: 'Backup exportado', color: 'bg-cyan-100 text-cyan-800' },
  BACKUP_IMPORT: { label: 'Backup importado', color: 'bg-orange-100 text-orange-800' },
};

const AdminLogs = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const userEmail = user?.email || '';
  const hasAccess = userEmail.startsWith(ALLOWED_EMAIL_PREFIX);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: hasAccess,
  });

  if (!hasAccess) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground">Apenas o administrador principal tem acesso a esta área.</p>
        </div>
      </AdminLayout>
    );
  }

  const filtered = logs?.filter(log =>
    !search ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(search.toLowerCase())) ||
    log.user_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
          Log de Atividades
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Todas as movimentações do sistema</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por ação, detalhe ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum log encontrado.</p>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">O que fez</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead className="w-[200px]">Quem fez</TableHead>
                  <TableHead className="w-[160px]">Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map(log => {
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' };
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full ${actionInfo.color}`}>
                          <Zap className="h-3 w-3" />
                          {actionInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px] text-foreground max-w-[300px] truncate">
                        {log.details || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[160px]">{log.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </AdminLayout>
  );
};

export default AdminLogs;
