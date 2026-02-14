import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientes } from '@/hooks/useClientes';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Cliente, ClienteFormData } from '@/types/cliente';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  LogOut,
  Copy,
} from 'lucide-react';

export default function Clientes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, getLogo } = useEmpresa();
  const { clientes, isLoading, addCliente, updateCliente, deleteCliente, refreshClientes } = useClientes();
  
  const logo = getLogo();
  const empresaNome = empresa?.nome || 'Sistema';
  
  // Redirecionar se não há empresa selecionada
  useEffect(() => {
    if (!empresa) {
      const savedEmpresa = localStorage.getItem('selectedEmpresa');
      if (!savedEmpresa) {
        navigate('/empresa');
      }
    }
  }, [empresa, navigate]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>({
    nome: '',
    telefone: '',
    email: '',
    nif: '',
    moradaRua: '',
    moradaNumero: '',
    moradaComplemento: '',
    moradaConcelho: '',
    moradaCodigoPostal: '',
    moradaDistrito: '',
    moradaPais: 'Portugal',
  });

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone?.includes(searchTerm) ||
    cliente.nif?.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      nif: '',
      moradaRua: '',
      moradaNumero: '',
      moradaComplemento: '',
      moradaConcelho: '',
      moradaCodigoPostal: '',
      moradaDistrito: '',
      moradaPais: 'Portugal',
    });
    setEditingCliente(null);
  };

  const handleOpenForm = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nome: cliente.nome,
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        nif: cliente.nif || '',
        moradaRua: cliente.moradaRua || '',
        moradaNumero: cliente.moradaNumero || '',
        moradaComplemento: cliente.moradaComplemento || '',
        moradaConcelho: cliente.moradaConcelho || '',
        moradaCodigoPostal: cliente.moradaCodigoPostal || '',
        moradaDistrito: cliente.moradaDistrito || '',
        moradaPais: cliente.moradaPais || 'Portugal',
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleDuplicateCliente = (cliente: Cliente) => {
    // Preenche o formulário com os dados do cliente, mas sem ID (cria um novo)
    setEditingCliente(null); // Importante: não estamos editando, estamos criando
    setFormData({
      nome: `${cliente.nome} (Cópia)`,
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      nif: '', // NIF deve ser único, então deixamos vazio
      moradaRua: cliente.moradaRua || '',
      moradaNumero: cliente.moradaNumero || '',
      moradaComplemento: cliente.moradaComplemento || '',
      moradaConcelho: cliente.moradaConcelho || '',
      moradaCodigoPostal: cliente.moradaCodigoPostal || '',
      moradaDistrito: cliente.moradaDistrito || '',
      moradaPais: cliente.moradaPais || 'Portugal',
    });
    setIsFormOpen(true);
    toast({
      title: "Duplicar cliente",
      description: "Dados copiados. Faça as alterações necessárias e guarde.",
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do cliente é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (editingCliente) {
      const success = await updateCliente(editingCliente.id, formData);
      if (success) {
        toast({
          title: "Cliente atualizado",
          description: "Os dados do cliente foram atualizados com sucesso.",
        });
        handleCloseForm();
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o cliente.",
          variant: "destructive",
        });
      }
    } else {
      const newCliente = await addCliente(formData);
      if (newCliente) {
        toast({
          title: "Cliente cadastrado",
          description: "O cliente foi adicionado com sucesso.",
        });
        handleCloseForm();
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível cadastrar o cliente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteClick = (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (clienteToDelete) {
      const success = await deleteCliente(clienteToDelete.id);
      if (success) {
        toast({
          title: "Cliente removido",
          description: "O cliente foi removido com sucesso.",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível remover o cliente. Verifique se não há serviços vinculados.",
          variant: "destructive",
        });
      }
    }
    setIsDeleteOpen(false);
    setClienteToDelete(null);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate('/auth');
    }
  };

  const formatMorada = (cliente: Cliente) => {
    const parts = [
      cliente.moradaRua,
      cliente.moradaNumero,
      cliente.moradaComplemento,
      cliente.moradaConcelho,
      cliente.moradaCodigoPostal,
      cliente.moradaDistrito,
      cliente.moradaPais,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestão de Clientes</p>
        </div>
      </div>

      {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-primary" />
                <CardTitle>Clientes Cadastrados</CardTitle>
                <span className="text-sm text-muted-foreground">
                  ({filteredClientes.length} {filteredClientes.length === 1 ? 'cliente' : 'clientes'})
                </span>
              </div>
              <Button onClick={() => handleOpenForm()} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Pesquisar por nome, email, telefone ou NIF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando clientes...
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>NIF</TableHead>
                      <TableHead>Morada</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {cliente.telefone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <a href={`tel:${cliente.telefone}`} className="hover:text-primary">
                                  {cliente.telefone}
                                </a>
                              </div>
                            )}
                            {cliente.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                <a href={`mailto:${cliente.email}`} className="hover:text-primary">
                                  {cliente.email}
                                </a>
                              </div>
                            )}
                            {!cliente.telefone && !cliente.email && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{cliente.nif || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1 text-sm max-w-[200px]">
                            {cliente.moradaRua ? (
                              <>
                                <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <span className="truncate" title={formatMorada(cliente)}>
                                  {formatMorada(cliente)}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicateCliente(cliente)}
                              title="Duplicar"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenForm(cliente)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(cliente)}
                              title="Remover"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nif">NIF</Label>
                <Input
                  id="nif"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  placeholder="Número de contribuinte"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="+351 912 345 678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            {/* Address */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Morada
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="moradaRua">Rua / Avenida</Label>
                  <Input
                    id="moradaRua"
                    value={formData.moradaRua}
                    onChange={(e) => setFormData({ ...formData, moradaRua: e.target.value })}
                    placeholder="Nome da rua ou avenida"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moradaNumero">Número</Label>
                  <Input
                    id="moradaNumero"
                    value={formData.moradaNumero}
                    onChange={(e) => setFormData({ ...formData, moradaNumero: e.target.value })}
                    placeholder="Nº"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="moradaComplemento">Complemento</Label>
                  <Input
                    id="moradaComplemento"
                    value={formData.moradaComplemento}
                    onChange={(e) => setFormData({ ...formData, moradaComplemento: e.target.value })}
                    placeholder="Apartamento, andar, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moradaConcelho">Concelho</Label>
                  <Input
                    id="moradaConcelho"
                    value={formData.moradaConcelho}
                    onChange={(e) => setFormData({ ...formData, moradaConcelho: e.target.value })}
                    placeholder="Concelho"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="moradaCodigoPostal">Código Postal</Label>
                  <Input
                    id="moradaCodigoPostal"
                    value={formData.moradaCodigoPostal}
                    onChange={(e) => setFormData({ ...formData, moradaCodigoPostal: e.target.value })}
                    placeholder="0000-000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moradaDistrito">Distrito</Label>
                  <Input
                    id="moradaDistrito"
                    value={formData.moradaDistrito}
                    onChange={(e) => setFormData({ ...formData, moradaDistrito: e.target.value })}
                    placeholder="Distrito"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moradaPais">País</Label>
                  <Input
                    id="moradaPais"
                    value={formData.moradaPais}
                    onChange={(e) => setFormData({ ...formData, moradaPais: e.target.value })}
                    placeholder="País"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingCliente ? 'Guardar Alterações' : 'Cadastrar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cliente "{clienteToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
