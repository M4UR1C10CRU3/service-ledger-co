import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SupplierFormData, emptySupplierForm, CATEGORIA_LABELS } from '@/types/supplier';
import { Building2, MapPin, Landmark } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: SupplierFormData;
  setFormData: (data: SupplierFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export function SupplierFormDialog({ open, onOpenChange, formData, setFormData, onSubmit, isEditing }: Props) {
  const update = (partial: Partial<SupplierFormData>) => setFormData({ ...formData, ...partial });

  const handleCepSearch = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        update({
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          complemento: data.complemento || formData.complemento,
        });
      }
    } catch {
      // silently fail
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Tipo Pessoa */}
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <RadioGroup
              value={formData.tipoPessoa}
              onValueChange={(v) => update({ tipoPessoa: v as 'fisica' | 'juridica' })}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="juridica" id="juridica" />
                <Label htmlFor="juridica" className="font-normal">Pessoa Jurídica</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fisica" id="fisica" />
                <Label htmlFor="fisica" className="font-normal">Pessoa Física</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Razão Social + CNPJ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Razão Social *</Label>
              <Input value={formData.razaoSocial} onChange={(e) => update({ razaoSocial: e.target.value })} placeholder="Razão social / Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>{formData.tipoPessoa === 'juridica' ? 'CNPJ *' : 'CPF *'}</Label>
              <Input value={formData.cnpjCpf} onChange={(e) => update({ cnpjCpf: e.target.value })} placeholder={formData.tipoPessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'} />
            </div>
          </div>

          {/* Nome Fantasia + Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={formData.nomeFantasia} onChange={(e) => update({ nomeFantasia: e.target.value })} placeholder="Nome fantasia" />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(v) => update({ categoria: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input value={formData.telefone} onChange={(e) => update({ telefone: e.target.value })} placeholder="+55 11 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label>Telefone Secundário</Label>
              <Input value={formData.telefoneSecundario} onChange={(e) => update({ telefoneSecundario: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contato Principal</Label>
              <Input value={formData.contatoPrincipal} onChange={(e) => update({ contatoPrincipal: e.target.value })} placeholder="Nome do contato" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => update({ email: e.target.value })} placeholder="email@exemplo.com" />
          </div>

          {/* Endereço */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={formData.cep} onChange={(e) => update({ cep: e.target.value })} onBlur={handleCepSearch} placeholder="00000-000" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Logradouro</Label>
                <Input value={formData.logradouro} onChange={(e) => update({ logradouro: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={formData.numero} onChange={(e) => update({ numero: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input value={formData.complemento} onChange={(e) => update({ complemento: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={formData.bairro} onChange={(e) => update({ bairro: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={formData.cidade} onChange={(e) => update({ cidade: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={formData.estado} onChange={(e) => update({ estado: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4" /> Dados Bancários
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input value={formData.banco} onChange={(e) => update({ banco: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input value={formData.agencia} onChange={(e) => update({ agencia: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <Input value={formData.conta} onChange={(e) => update({ conta: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={formData.observacoes} onChange={(e) => update({ observacoes: e.target.value })} rows={3} />
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <Switch checked={formData.status === 'ativo'} onCheckedChange={(c) => update({ status: c ? 'ativo' : 'inativo' })} />
            <Label>{formData.status === 'ativo' ? 'Ativo' : 'Inativo'}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit}>{isEditing ? 'Salvar' : 'Cadastrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
