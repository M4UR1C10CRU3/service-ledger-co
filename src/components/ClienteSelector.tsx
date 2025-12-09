import { useState } from 'react';
import { Cliente, ClienteFormData } from '@/types/cliente';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClienteSelectorProps {
  clientes: Cliente[];
  selectedCliente?: Cliente | null;
  clienteName: string;
  onClienteSelect: (cliente: Cliente | null, name: string) => void;
  onCreateCliente: (data: ClienteFormData) => Promise<Cliente | null>;
  disabled?: boolean;
}

export const ClienteSelector = ({
  clientes,
  selectedCliente,
  clienteName,
  onClienteSelect,
  onCreateCliente,
  disabled = false,
}: ClienteSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = (cliente: Cliente) => {
    onClienteSelect(cliente, cliente.nome);
    setOpen(false);
  };

  const handleCreateNew = () => {
    setFormData({
      nome: clienteName || '',
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
    setDialogOpen(true);
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) return;
    
    setIsCreating(true);
    const newCliente = await onCreateCliente(formData);
    setIsCreating(false);
    
    if (newCliente) {
      onClienteSelect(newCliente, newCliente.nome);
      setDialogOpen(false);
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
    }
  };

  const handleInputChange = (value: string) => {
    onClienteSelect(null, value);
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                disabled={disabled}
              >
                {selectedCliente ? (
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedCliente.nome}
                  </span>
                ) : clienteName ? (
                  <span>{clienteName}</span>
                ) : (
                  <span className="text-muted-foreground">Selecionar ou digitar cliente...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput 
                  placeholder="Pesquisar cliente..." 
                  value={clienteName}
                  onValueChange={handleInputChange}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="py-2 px-4 text-sm text-center">
                      <p className="text-muted-foreground mb-2">Nenhum cliente encontrado</p>
                      <Button 
                        size="sm" 
                        onClick={handleCreateNew}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar "{clienteName}"
                      </Button>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {clientes.map((cliente) => (
                      <CommandItem
                        key={cliente.id}
                        value={cliente.nome}
                        onSelect={() => handleSelect(cliente)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCliente?.id === cliente.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{cliente.nome}</span>
                          {cliente.nif && (
                            <span className="text-xs text-muted-foreground">NIF: {cliente.nif}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCreateNew}
          disabled={disabled}
          title="Criar novo cliente"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente para cadastrá-lo no sistema.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="+351 912 345 678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nif">Nº de Contribuinte (NIF)</Label>
                <Input
                  id="nif"
                  value={formData.nif}
                  onChange={(e) => setFormData(prev => ({ ...prev, nif: e.target.value }))}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Morada</h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="moradaRua">Rua/Avenida</Label>
                      <Input
                        id="moradaRua"
                        value={formData.moradaRua}
                        onChange={(e) => setFormData(prev => ({ ...prev, moradaRua: e.target.value }))}
                        placeholder="Rua Principal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moradaNumero">Nº</Label>
                      <Input
                        id="moradaNumero"
                        value={formData.moradaNumero}
                        onChange={(e) => setFormData(prev => ({ ...prev, moradaNumero: e.target.value }))}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="moradaComplemento">Complemento</Label>
                    <Input
                      id="moradaComplemento"
                      value={formData.moradaComplemento}
                      onChange={(e) => setFormData(prev => ({ ...prev, moradaComplemento: e.target.value }))}
                      placeholder="Apartamento, Loja, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moradaConcelho">Concelho</Label>
                      <Input
                        id="moradaConcelho"
                        value={formData.moradaConcelho}
                        onChange={(e) => setFormData(prev => ({ ...prev, moradaConcelho: e.target.value }))}
                        placeholder="Lisboa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moradaCodigoPostal">Código Postal</Label>
                      <Input
                        id="moradaCodigoPostal"
                        value={formData.moradaCodigoPostal}
                        onChange={(e) => setFormData(prev => ({ ...prev, moradaCodigoPostal: e.target.value }))}
                        placeholder="1000-001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moradaDistrito">Distrito</Label>
                      <Input
                        id="moradaDistrito"
                        value={formData.moradaDistrito}
                        onChange={(e) => setFormData(prev => ({ ...prev, moradaDistrito: e.target.value }))}
                        placeholder="Lisboa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moradaPais">País</Label>
                      <Input
                        id="moradaPais"
                        value={formData.moradaPais}
                        onChange={(e) => setFormData(prev => ({ ...prev, moradaPais: e.target.value }))}
                        placeholder="Portugal"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.nome.trim() || isCreating}>
              {isCreating ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
