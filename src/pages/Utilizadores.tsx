import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, ShieldCheck, UserCog, User, Plus, Pencil, Key, RotateCcw, Trash2, Search } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useUtilizadores, ALL_MODULES, PROFILE_PRESETS, LibertyUtilizador } from '@/hooks/useUtilizadores';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

const perfilBadge: Record<string, { label: string; className: string }> = {
  administrador: { label: 'Administrador', className: 'bg-destructive text-destructive-foreground' },
  gestor: { label: 'Gestor', className: 'bg-primary text-primary-foreground' },
  operacional: { label: 'Operacional', className: 'bg-green-600 text-white' },
  personalizado: { label: 'Personalizado', className: 'bg-muted text-muted-foreground' },
};

export default function Utilizadores() {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const { empresa, empresas } = useEmpresa();
  const { toast } = useToast();
  const {
    utilizadores, isLoading, createUtilizador, updateUtilizador,
    savePermissoes, deleteUtilizador, fetchUtilizadorEmpresas, fetchUtilizadorPermissoes,
  } = useUtilizadores();

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<LibertyUtilizador | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<LibertyUtilizador | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LibertyUtilizador | null>(null);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [currentAuthId, setCurrentAuthId] = useState<string | null>(null);

  // Form state
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formPerfil, setFormPerfil] = useState('operacional');
  const [formEmpresas, setFormEmpresas] = useState<string[]>([]);
  const [formEmpresaPadrao, setFormEmpresaPadrao] = useState('');

  // Permissions state
  const [perms, setPerms] = useState<Record<string, { ver: boolean; criar: boolean; editar: boolean; eliminar: boolean }>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentAuthId(user.id);
    });
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin && !isLoading) {
      toast({ variant: 'destructive', title: 'Acesso negado', description: 'Não tem permissão para aceder a esta área.' });
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate, toast]);

  const filtered = utilizadores.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const admins = utilizadores.filter(u => u.perfil === 'administrador' && u.ativo).length;
  const gestores = utilizadores.filter(u => u.perfil === 'gestor' && u.ativo).length;
  const operacionais = utilizadores.filter(u => !['administrador', 'gestor'].includes(u.perfil) && u.ativo).length;

  const resetForm = () => {
    setFormNome(''); setFormEmail(''); setFormPassword(''); setFormTelefone('');
    setFormCargo(''); setFormPerfil('operacional'); setFormEmpresas([]);
    setFormEmpresaPadrao('');
  };

  const openCreate = () => {
    resetForm();
    if (empresa) { setFormEmpresas([empresa.id]); setFormEmpresaPadrao(empresa.id); }
    setShowCreate(true);
  };

  const openEdit = async (u: LibertyUtilizador) => {
    setFormNome(u.nome); setFormEmail(u.email); setFormTelefone(u.telefone || '');
    setFormCargo(u.cargo || ''); setFormPerfil(u.perfil);
    setFormEmpresaPadrao(u.empresa_padrao || '');
    const emps = await fetchUtilizadorEmpresas(u.id);
    setFormEmpresas(emps);
    if (!u.empresa_padrao && emps.length > 0) setFormEmpresaPadrao(emps[0]);
    setEditingUser(u);
  };

  const openPermissions = async (u: LibertyUtilizador) => {
    if (!empresa) return;
    const existingPerms = await fetchUtilizadorPermissoes(u.id, empresa.id);
    const permMap: Record<string, { ver: boolean; criar: boolean; editar: boolean; eliminar: boolean }> = {};
    for (const m of ALL_MODULES) {
      const existing = existingPerms.find(p => p.modulo === m.key);
      permMap[m.key] = existing
        ? { ver: existing.perm_ver, criar: existing.perm_criar, editar: existing.perm_editar, eliminar: existing.perm_eliminar }
        : { ver: false, criar: false, editar: false, eliminar: false };
    }
    setPerms(permMap);
    setPermissionsUser(u);
  };

  const handleCreate = async () => {
    if (!formNome || !formEmail || !formPassword || formEmpresas.length === 0) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' });
      return;
    }
    try {
      await createUtilizador({
        nome: formNome, email: formEmail, password: formPassword,
        telefone: formTelefone, cargo: formCargo, perfil: formPerfil,
        empresaIds: formEmpresas, empresaPadrao: formEmpresaPadrao || formEmpresas[0],
      });
      setShowCreate(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      await updateUtilizador(editingUser.id, {
        nome: formNome, telefone: formTelefone, cargo: formCargo,
        perfil: formPerfil, empresaIds: formEmpresas,
        empresaPadrao: formEmpresaPadrao || formEmpresas[0],
      });
      setEditingUser(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  const handleToggleAtivo = async (u: LibertyUtilizador) => {
    if (u.auth_user_id === currentAuthId) return;
    if (u.perfil === 'administrador' && u.ativo && admins <= 1) {
      toast({ variant: 'destructive', title: 'Deve existir pelo menos 1 Administrador ativo.' });
      return;
    }
    await updateUtilizador(u.id, { ativo: !u.ativo });
  };

  const handleDelete = async () => {
    if (!deleteConfirm || deleteEmail !== deleteConfirm.email) {
      toast({ variant: 'destructive', title: 'Email não corresponde' });
      return;
    }
    await deleteUtilizador(deleteConfirm.id, deleteConfirm.nome);
    setDeleteConfirm(null);
    setDeleteEmail('');
  };

  const applyPreset = (preset: string) => {
    const data = PROFILE_PRESETS[preset] || PROFILE_PRESETS.operacional;
    const newPerms: typeof perms = {};
    for (const m of ALL_MODULES) {
      newPerms[m.key] = data[m.key] || { ver: false, criar: false, editar: false, eliminar: false };
    }
    setPerms(newPerms);
  };

  const togglePerm = (modulo: string, field: 'ver' | 'criar' | 'editar' | 'eliminar', value: boolean) => {
    setPerms(prev => {
      const current = prev[modulo] || { ver: false, criar: false, editar: false, eliminar: false };
      const next = { ...current, [field]: value };
      // Dependencies
      if (field === 'ver' && !value) { next.criar = false; next.editar = false; next.eliminar = false; }
      if (field === 'criar' && value && !next.ver) next.ver = true;
      if (field === 'editar' && value && !next.ver) next.ver = true;
      if (field === 'eliminar' && value) { if (!next.ver) next.ver = true; if (!next.editar) next.editar = true; }
      return { ...prev, [modulo]: next };
    });
  };

  const handleSavePermissions = async () => {
    if (!permissionsUser || !empresa) return;
    await savePermissoes(permissionsUser.id, empresa.id, perms);
    setPermissionsUser(null);
  };

  const isSelf = (u: LibertyUtilizador) => u.auth_user_id === currentAuthId;

  // Group modules by group
  const groups = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, m) => {
    if (!acc[m.group]) acc[m.group] = [];
    acc[m.group].push(m);
    return acc;
  }, {});

  if (!isAdmin) return null;

  const renderFormDialog = (isEdit: boolean) => (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Editar Utilizador' : 'Convidar Utilizador'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div>
          <Label>Nome completo *</Label>
          <Input value={formNome} onChange={e => setFormNome(e.target.value)} />
        </div>
        {!isEdit && (
          <div>
            <Label>Email *</Label>
            <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
          </div>
        )}
        {isEdit && <div><Label>Email</Label><Input value={formEmail} disabled className="opacity-60" /></div>}
        {!isEdit && (
          <div>
            <Label>Password *</Label>
            <div className="flex gap-2">
              <Input type="text" value={formPassword} onChange={e => setFormPassword(e.target.value)} />
              <Button variant="outline" size="sm" type="button" onClick={() => setFormPassword(Math.random().toString(36).slice(-10) + 'A1!')}>
                Gerar
              </Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Telefone</Label><Input value={formTelefone} onChange={e => setFormTelefone(e.target.value)} /></div>
          <div><Label>Cargo</Label><Input value={formCargo} onChange={e => setFormCargo(e.target.value)} /></div>
        </div>
        <div>
          <Label>Perfil de acesso *</Label>
          <Select value={formPerfil} onValueChange={setFormPerfil}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="administrador">👑 Administrador</SelectItem>
              <SelectItem value="gestor">📊 Gestor</SelectItem>
              <SelectItem value="operacional">⚙️ Operacional</SelectItem>
              <SelectItem value="personalizado">🎛️ Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Empresas com acesso *</Label>
          <div className="space-y-2 mt-1">
            {empresas.map(emp => (
              <label key={emp.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formEmpresas.includes(emp.id)}
                  onCheckedChange={(checked) => {
                    setFormEmpresas(prev => checked ? [...prev, emp.id] : prev.filter(e => e !== emp.id));
                  }}
                />
                {emp.nome}
              </label>
            ))}
          </div>
        </div>
        {formEmpresas.length > 0 && (
          <div>
            <Label>Empresa padrão</Label>
            <Select value={formEmpresaPadrao} onValueChange={setFormEmpresaPadrao}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {empresas.filter(e => formEmpresas.includes(e.id)).map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => { setShowCreate(false); setEditingUser(null); }}>Cancelar</Button>
          <Button onClick={isEdit ? handleUpdate : handleCreate}>
            {isEdit ? 'Guardar' : 'Criar Utilizador'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Utilizadores</h1>
          <p className="text-muted-foreground text-sm">Crie, edite e controle os acessos de cada utilizador ao Liberty</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Convidar Utilizador</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total de Utilizadores', value: utilizadores.filter(u => u.ativo).length },
          { icon: ShieldCheck, label: 'Administradores', value: admins },
          { icon: UserCog, label: 'Gestores', value: gestores },
          { icon: User, label: 'Operacionais', value: operacionais },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><kpi.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pesquisar utilizadores..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => {
                const badge = perfilBadge[u.perfil] || perfilBadge.operacional;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {u.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell><Badge className={badge.className}>{badge.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.ultimo_acesso
                        ? formatDistanceToNow(new Date(u.ultimo_acesso), { addSuffix: true, locale: pt })
                        : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch
                              checked={u.ativo}
                              disabled={isSelf(u)}
                              onCheckedChange={() => handleToggleAtivo(u)}
                            />
                          </div>
                        </TooltipTrigger>
                        {isSelf(u) && <TooltipContent>Não pode desativar o seu próprio utilizador.</TooltipContent>}
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openPermissions(u)}><Key className="h-4 w-4" /></Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button variant="ghost" size="icon" disabled={isSelf(u)} onClick={() => { setDeleteConfirm(u); setDeleteEmail(''); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {isSelf(u) && <TooltipContent>Não pode eliminar o seu próprio utilizador.</TooltipContent>}
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum utilizador encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>{renderFormDialog(false)}</Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>{renderFormDialog(true)}</Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar Utilizador</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ao eliminar este utilizador, o seu histórico de atividades será mantido mas o acesso ao sistema será permanentemente removido. Esta ação não pode ser desfeita.
          </p>
          <div className="mt-4">
            <Label>Digite o email para confirmar: <strong>{deleteConfirm?.email}</strong></Label>
            <Input className="mt-2" value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)} placeholder={deleteConfirm?.email} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteEmail !== deleteConfirm?.email} onClick={handleDelete}>Eliminar Definitivamente</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permissionsUser} onOpenChange={(open) => { if (!open) setPermissionsUser(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissões — {permissionsUser?.nome}</DialogTitle>
          </DialogHeader>
          {/* Quick presets */}
          <div className="flex gap-2 flex-wrap mb-4">
            <Button size="sm" variant="outline" onClick={() => applyPreset('administrador')}>Aplicar Administrador</Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset('gestor')}>Aplicar Gestor</Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset('operacional')}>Aplicar Operacional</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const empty: typeof perms = {};
              ALL_MODULES.forEach(m => { empty[m.key] = { ver: false, criar: false, editar: false, eliminar: false }; });
              setPerms(empty);
            }}>Limpar tudo</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Módulo</TableHead>
                <TableHead className="text-center w-20">Ver</TableHead>
                <TableHead className="text-center w-20">Criar</TableHead>
                <TableHead className="text-center w-20">Editar</TableHead>
                <TableHead className="text-center w-20">Eliminar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groups).map(([group, modules]) => (
                <>
                  <TableRow key={group} className="bg-muted/40">
                    <TableCell colSpan={5} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-2">{group}</TableCell>
                  </TableRow>
                  {modules.map(m => {
                    const p = perms[m.key] || { ver: false, criar: false, editar: false, eliminar: false };
                    return (
                      <TableRow key={m.key}>
                        <TableCell className="text-sm pl-6">{m.label}</TableCell>
                        {(['ver', 'criar', 'editar', 'eliminar'] as const).map(field => (
                          <TableCell key={field} className="text-center">
                            <Checkbox
                              checked={p[field]}
                              onCheckedChange={(checked) => togglePerm(m.key, field, !!checked)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPermissionsUser(null)}>Cancelar</Button>
            <Button onClick={handleSavePermissions}>Guardar Permissões</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
