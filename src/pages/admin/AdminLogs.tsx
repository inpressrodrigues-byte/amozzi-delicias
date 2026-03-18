import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ALLOWED_EMAIL_PREFIX = 'inpress.rodrigues';

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
      ) : (
        <div className="space-y-2">
          {filtered?.map(log => (
            <Card key={log.id} className="p-3">
              <div className="flex items-start gap-3">
                <Activity className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{log.action}</span>
                    {log.table_name && (
                      <span className="text-[10px] text-muted-foreground">em {log.table_name}</span>
                    )}
                  </div>
                  {log.details && <p className="text-[12px] text-foreground mt-1">{log.details}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{log.user_email}</span>
                    <span>{format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filtered?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum log encontrado.</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminLogs;
