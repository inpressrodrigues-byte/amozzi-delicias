import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, KeyRound, Pencil, Plus } from 'lucide-react';

interface AdminProfile {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string | null;
}

const Profiles = () => {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AdminProfile | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameTarget, setNameTarget] = useState<AdminProfile | null>(null);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('create-admin', {
      body: { action: 'list' },
    });

    if (error) {
      toast.error('Erro ao carregar perfis admin');
      setLoading(false);
      return;
    }

    setProfiles((data?.admins || []) as AdminProfile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateAdmin = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      toast.error('Preencha e-mail e senha');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Senha mínima: 6 caracteres');
      return;
    }

    setAdding(true);
    const { error } = await supabase.functions.invoke('create-admin', {
      body: {
        action: 'create',
        email: newEmail.trim(),
        password: newPassword,
        full_name: newName.trim(),
      },
    });
    setAdding(false);

    if (error) {
      toast.error('Erro ao criar admin');
      return;
    }

    toast.success('Conta admin criada');
    setAddDialogOpen(false);
    setNewEmail('');
    setNewPassword('');
    setNewName('');
    fetchProfiles();
  };

  const openPasswordDialog = (profile: AdminProfile) => {
    setPasswordTarget(profile);
    setResetPassword('');
    setResetPasswordConfirm('');
    setPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!passwordTarget) return;
    if (resetPassword.length < 6) {
      toast.error('Senha mínima: 6 caracteres');
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      toast.error('As senhas não conferem');
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.functions.invoke('create-admin', {
      body: {
        action: 'update_password',
        user_id: passwordTarget.user_id,
        password: resetPassword,
      },
    });
    setSavingPassword(false);

    if (error) {
      toast.error('Erro ao trocar senha');
      return;
    }

    toast.success('Senha atualizada com sucesso');
    setPasswordDialogOpen(false);
  };

  const openNameDialog = (profile: AdminProfile) => {
    setNameTarget(profile);
    setEditedName(profile.full_name || '');
    setNameDialogOpen(true);
  };

  const handleSaveName = async () => {
    if (!nameTarget) return;
    setSavingName(true);

    const { error } = await supabase.functions.invoke('create-admin', {
      body: {
        action: 'update_profile',
        user_id: nameTarget.user_id,
        full_name: editedName.trim(),
      },
    });
    setSavingName(false);

    if (error) {
      toast.error('Erro ao salvar nome');
      return;
    }

    toast.success('Nome atualizado');
    setNameDialogOpen(false);
    fetchProfiles();
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Perfis Admin</h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Admin
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando perfis...</p>
      ) : (
        <div className="grid gap-3">
          {profiles.map((profile) => (
            <Card key={profile.user_id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{profile.full_name || 'Sem nome'}</p>
                    <p className="truncate text-sm text-muted-foreground">{profile.email || 'Sem email'}</p>
                    <Badge variant="secondary" className="mt-1">{profile.role}</Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openNameDialog(profile)}>
                    <Pencil className="mr-1 h-4 w-4" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openPasswordDialog(profile)}>
                    <KeyRound className="mr-1 h-4 w-4" /> Trocar Senha
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {profiles.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">Nenhum administrador encontrado.</p>
          )}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo administrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="admin@empresa.com" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button className="w-full" onClick={handleCreateAdmin} disabled={adding}>
              {adding ? 'Criando...' : 'Criar Admin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Conta: {passwordTarget?.email || '-'}</p>
            <div>
              <Label>Nova senha</Label>
              <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
            </div>
            <div>
              <Label>Confirmar senha</Label>
              <Input type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Conta: {nameTarget?.email || '-'}</p>
            <div>
              <Label>Nome completo</Label>
              <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSaveName} disabled={savingName}>
              {savingName ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Profiles;
