import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, Key, UserCog, Plus } from 'lucide-react';

interface AdminProfile {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

const Profiles = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    // Get all admin roles
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    if (!roles) { setLoading(false); return; }

    // Get profiles for those users
    const userIds = roles.map(r => r.user_id);
    const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);

    const merged: AdminProfile[] = roles.map(r => {
      const profile = profilesData?.find(p => p.user_id === r.user_id);
      return {
        user_id: r.user_id,
        email: r.user_id === user?.id ? (user.email || '') : '',
        full_name: profile?.full_name || null,
        role: r.role,
      };
    });

    setProfiles(merged);
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast.error('Erro ao trocar senha: ' + error.message); return; }
    toast.success('Senha alterada com sucesso!');
    setPasswordDialog(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleAddAdmin = async () => {
    if (!newEmail || !newAdminPassword) { toast.error('Preencha email e senha'); return; }
    if (newAdminPassword.length < 6) { toast.error('Senha mínima: 6 caracteres'); return; }
    setAdding(true);

    // Use edge function to create admin
    const { data, error } = await supabase.functions.invoke('create-admin', {
      body: { email: newEmail, password: newAdminPassword, full_name: newAdminName },
    });

    setAdding(false);
    if (error) { toast.error('Erro ao criar admin'); return; }
    toast.success('Admin criado com sucesso!');
    setAddDialog(false);
    setNewEmail('');
    setNewAdminPassword('');
    setNewAdminName('');
    fetchProfiles();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Perfis Admin</h1>
        <Button className="bg-primary" onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Admin
        </Button>
      </div>

      {loading ? <p className="text-muted-foreground">Carregando...</p> : (
        <div className="grid gap-4">
          {profiles.map(p => (
            <Card key={p.user_id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{p.full_name || p.email || 'Admin'}</p>
                  {p.email && <p className="text-sm text-muted-foreground">{p.email}</p>}
                  <Badge variant="secondary" className="mt-1">{p.role}</Badge>
                </div>
                {p.user_id === user?.id && (
                  <Button variant="outline" size="sm" onClick={() => setPasswordDialog(true)}>
                    <Key className="h-4 w-4 mr-1" /> Trocar Senha
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {profiles.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum perfil encontrado.</p>}
        </div>
      )}

      {/* Change Password Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Trocar Senha</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label>Confirmar Senha</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <Button className="w-full bg-primary" onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Salvando...' : 'Alterar Senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Administrador</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newAdminName} onChange={e => setNewAdminName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button className="w-full bg-primary" onClick={handleAddAdmin} disabled={adding}>
              {adding ? 'Criando...' : 'Criar Admin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Profiles;
