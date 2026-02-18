import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { SupplierFormData, emptySupplierForm, GAMAS_OPTIONS } from '@/types/supplier';
import { MapPin, Landmark, Package } from 'lucide-react';

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

  const toggleGama = (gama: string) => {
    const current = formData.gamas || [];
    if (current.includes(gama)) {
      update({ gamas: current.filter(g => g !== gama) });
    } else {
      update({ gamas: [...current, gama] });
    }
  };

  const isPessoaColectiva = formData.tipoPessoa === 'juridica';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <RadioGroup
              value={formData.tipoPessoa}
              onValueChange={(v) => update({ tipoPessoa: v as 'fisica' | 'juridica' })}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="juridica" id="juridica" />
                <Label htmlFor="juridica" className="font-normal">Pessoa Colectiva</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fisica" id="fisica" />
                <Label htmlFor="fisica" className="font-normal">Pessoa Singular</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isPessoaColectiva ? 'Nome Empresarial *' : 'Nome Completo *'}</Label>
              <Input value={formData.razaoSocial} onChange={(e) => update({ razaoSocial: e.target.value })} placeholder={isPessoaColectiva ? 'Nome empresarial' : 'Nome completo'} />
            </div>
            <div className="space-y-2">
              <Label>{isPessoaColectiva ? 'NIF/NIPC *' : 'NIF *'}</Label>
              <Input value={formData.cnpjCpf} onChange={(e) => update({ cnpjCpf: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="000 000 000" maxLength={9} />
            </div>
          </div>

          {/* Contactos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Telemóvel</Label>
              <Input value={formData.telefone} onChange={(e) => update({ telefone: e.target.value })} placeholder="+351 9XX XXX XXX" />
            </div>
            <div className="space-y-2">
              <Label>Telefone Fixo</Label>
              <Input value={formData.telefoneSecundario} onChange={(e) => update({ telefoneSecundario: e.target.value })} placeholder="+351 2XX XXX XXX" />
            </div>
            <div className="space-y-2">
              <Label>Contacto Principal</Label>
              <Input value={formData.contatoPrincipal} onChange={(e) => update({ contatoPrincipal: e.target.value })} placeholder="Nome do contacto" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={formData.email} onChange={(e) => update({ email: e.target.value })} placeholder="email@exemplo.pt" />
          </div>

          {/* Morada */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Morada
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Código Postal</Label>
                <Input value={formData.cep} onChange={(e) => update({ cep: e.target.value })} placeholder="0000-000" />
              </div>
              <div className="space-y-2">
                <Label>Localidade</Label>
                <Input value={formData.cidade} onChange={(e) => update({ cidade: e.target.value })} placeholder="Localidade" />
              </div>
              <div className="space-y-2">
                <Label>Rua / Avenida</Label>
                <Input value={formData.logradouro} onChange={(e) => update({ logradouro: e.target.value })} placeholder="Nome da via" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Número / Porta</Label>
                <Input value={formData.numero} onChange={(e) => update({ numero: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Andar / Fracção</Label>
                <Input value={formData.complemento} onChange={(e) => update({ complemento: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Freguesia</Label>
                <Input value={formData.bairro} onChange={(e) => update({ bairro: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Concelho</Label>
                <Input value={formData.nomeFantasia} onChange={(e) => update({ nomeFantasia: e.target.value })} placeholder="Concelho" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Distrito</Label>
                <Input value={formData.estado} onChange={(e) => update({ estado: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>País</Label>
                <Input value={formData.pais} onChange={(e) => update({ pais: e.target.value })} placeholder="Portugal" />
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4" /> Dados Bancários
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>IBAN</Label>
                <Input value={formData.iban} onChange={(e) => update({ iban: e.target.value.toUpperCase() })} placeholder="PT50 0000 0000 0000 0000 0000 0" maxLength={25} />
              </div>
              <div className="space-y-2">
                <Label>SWIFT/BIC</Label>
                <Input value={formData.swiftBic} onChange={(e) => update({ swiftBic: e.target.value.toUpperCase() })} placeholder="XXXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-1 mt-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input value={formData.banco} onChange={(e) => update({ banco: e.target.value })} placeholder="Nome do banco" />
              </div>
            </div>
          </div>

          {/* Gamas Fornecidas */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> Gamas Fornecidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GAMAS_OPTIONS.map((gama) => (
                <div key={gama} className="flex items-center gap-2">
                  <Checkbox
                    id={`gama-${gama}`}
                    checked={(formData.gamas || []).includes(gama)}
                    onCheckedChange={() => toggleGama(gama)}
                  />
                  <Label htmlFor={`gama-${gama}`} className="font-normal text-sm cursor-pointer">{gama}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={formData.observacoes} onChange={(e) => update({ observacoes: e.target.value })} rows={3} />
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3">
            <Switch checked={formData.status === 'ativo'} onCheckedChange={(c) => update({ status: c ? 'ativo' : 'inativo' })} />
            <Label>{formData.status === 'ativo' ? 'Activo' : 'Inactivo'}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit}>{isEditing ? 'Guardar' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
