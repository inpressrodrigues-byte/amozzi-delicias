import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Download, Upload, Shield, Database, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const ALLOWED_EMAIL_PREFIX = 'inpress.rodrigues';

const BACKUP_TABLES = [
  'products', 'customers', 'orders', 'remote_orders', 'expenses',
  'manual_records', 'coupons', 'site_settings', 'billing_settings',
  'recipe_ingredients', 'product_nutrition', 'loyalty',
] as const;

const Backup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const userEmail = user?.email || '';
  const hasAccess = userEmail.startsWith(ALLOWED_EMAIL_PREFIX);

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

  const exportBackup = async () => {
    setExporting(true);
    try {
      const backup: Record<string, any[]> = {};
      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.warn(`Erro ao exportar ${table}:`, error.message);
          backup[table] = [];
        } else {
          backup[table] = data || [];
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AMOZI_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Log the action
      await supabase.from('admin_logs').insert({
        user_email: userEmail,
        action: 'BACKUP_EXPORT',
        details: `Backup completo exportado (${BACKUP_TABLES.length} tabelas)`,
      });

      toast.success('Backup exportado com sucesso!');
    } catch (err) {
      toast.error('Erro ao exportar backup');
    } finally {
      setExporting(false);
    }
  };

  const importBackup = async (file: File) => {
    if (!confirm('⚠️ ATENÇÃO: Importar um backup irá SUBSTITUIR os dados atuais. Tem certeza?')) return;
    setImporting(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (typeof backup !== 'object' || !backup) {
        toast.error('Arquivo de backup inválido');
        setImporting(false);
        return;
      }

      let imported = 0;
      for (const table of BACKUP_TABLES) {
        const rows = backup[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        // Delete existing data
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error } = await supabase.from(table).insert(batch as any);
          if (error) {
            console.warn(`Erro ao importar ${table} (batch ${i}):`, error.message);
          }
        }
        imported++;
      }

      // Log the action
      await supabase.from('admin_logs').insert({
        user_email: userEmail,
        action: 'BACKUP_IMPORT',
        details: `Backup importado (${imported} tabelas restauradas)`,
      });

      queryClient.invalidateQueries();
      toast.success(`Backup importado! ${imported} tabelas restauradas.`);
    } catch (err) {
      toast.error('Erro ao importar backup. Verifique o arquivo.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
          Backup & Restauração
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Exporte e importe todos os dados do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4" /> Exportar Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Faz download de um arquivo JSON com todos os dados: produtos, clientes, pedidos, finanças, configurações, etc.
            </p>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Tabelas incluídas:</p>
              {BACKUP_TABLES.map(t => (
                <span key={t} className="inline-block bg-muted px-2 py-0.5 rounded mr-1 mb-1">{t}</span>
              ))}
            </div>
            <Button onClick={exportBackup} disabled={exporting} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar Backup Completo'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4" /> Importar Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-[11px] text-destructive">
                <strong>Cuidado!</strong> Importar um backup irá substituir todos os dados atuais. Faça um backup antes de importar.
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Selecione um arquivo .json de backup previamente exportado para restaurar os dados.
            </p>
            <div className="relative">
              <Input
                type="file"
                accept=".json"
                disabled={importing}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) importBackup(file);
                  e.target.value = '';
                }}
              />
            </div>
            {importing && <p className="text-[11px] text-muted-foreground text-center">Importando... isso pode levar alguns segundos.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Backup;
