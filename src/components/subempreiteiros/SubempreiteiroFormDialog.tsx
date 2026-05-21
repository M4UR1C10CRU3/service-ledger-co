import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubempreiteiros } from '@/hooks/useSubempreiteiros';
import { useToast } from '@/hooks/use-toast';
import type { Subempreiteiro, SubFormData } from '@/types/subempreiteiro';
import { EMPTY_SUB_FORM } from '@/types/subempreiteiro';
import { User, Building2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subempreiteiro?: Subempreiteiro | null;
  onSaved?: (id: string) => void;
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function SubempreiteiroFormDialog({ open, onOpenChange, subempreiteiro, onSaved }: Props) {
  const { save } = useSubempreiteiros();
  const { toast } = useToast();
  const [form, setForm] = useState<SubFormData>(EMPTY_SUB_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subempreiteiro) {
      setForm({
        tipo: subempreiteiro.tipo,
        nome: subempreiteiro.nome,
        email: subempreiteiro.email || '',
        telefone: subempreiteiro.telefone || '',
        telemovel: subempreiteiro.telemovel || '',
        morada: subempreiteiro.morada || '',
        codigoPostal: subempreiteiro.codigoPostal || '',
        localidade: subempreiteiro.localidade || '',
        especialidade: subempreiteiro.especialidade || '',
        notas: subempreiteiro.notas || '',
        iban: subempreiteiro.iban || '',
        swift: subempreiteiro.swift || '',
        nif: subempreiteiro.nif || '',
        ccNumero: subempreiteiro.ccNumero || '',
        ccValidade: subempreiteiro.ccValidade || '',
        dataNascimento: subempreiteiro.dataNascimento || '',
        nipc: subempreiteiro.nipc || '',
        certidaoPermanenteCodigo: subempreiteiro.certidaoPermanenteCodigo || '',
        representanteNome: subempreiteiro.representanteNome || '',
        representanteNif: subempreiteiro.representanteNif || '',
        alvaraNumero: subempreiteiro.alvaraNumero || '',
        alvaraValidade: subempreiteiro.alvaraValidade || '',
        seguroNumero: subempreiteiro.seguroNumero || '',
        seguroValidade: subempreiteiro.seguroValidade || '',
      });
    } else {
      setForm(EMPTY_SUB_FORM);
    }
  }, [subempreiteiro, open]);

  const set = (k: keyof SubFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const id = await save(form, subempreiteiro?.id);
    setSaving(false);
    if (id) {
      toast({ title: subempreiteiro ? 'Subempreiteiro atualizado' : 'Subempreiteiro criado' });
      onSaved?.(id);
      onOpenChange(false);
    } else {
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    }
  };

  const isIndividual = form.tipo === 'individual';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {subempreiteiro ? 'Editar Subempreiteiro' : 'Novo Subempreiteiro'}
          </DialogTitle>
        </DialogHeader>

        {/* Tipo selector */}
        <div className="flex gap-3 py-2">
          <button
            type="button"
            onClick={() => set('tipo', 'individual')}
            className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              isIndividual
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            <User className="h-6 w-6 shrink-0" />
            <div className="text-left">
              <div className="font-semibold text-sm">Pessoa Individual</div>
              <div className="text-xs opacity-80">Trabalhador independente, ENI</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => set('tipo', 'coletiva')}
            className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              !isIndividual
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            <Building2 className="h-6 w-6 shrink-0" />
            <div className="text-left">
              <div className="font-semibold text-sm">Pessoa Coletiva</div>
              <div className="text-xs opacity-80">Empresa, Lda, SA, Unipessoal</div>
            </div>
          </button>
        </div>

        <Tabs defaultValue="identificacao" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="identificacao">Identificação</TabsTrigger>
            <TabsTrigger value="contactos">Contactos</TabsTrigger>
            <TabsTrigger value="profissional">Profissional</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          {/* TAB: Identificação */}
          <TabsContent value="identificacao" className="space-y-4 pt-4">
            <Field label={isIndividual ? 'Nome' : 'Razão Social'} required>
              <Input
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder={isIndividual ? 'Nome completo' : 'Razão social'}
              />
            </Field>

            {isIndividual ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="NIF">
                  <Input value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000000000" />
                </Field>
                <Field label="Data de Nascimento">
                  <Input type="date" value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} />
                </Field>
                <Field label="Nº Cartão de Cidadão">
                  <Input value={form.ccNumero} onChange={e => set('ccNumero', e.target.value)} placeholder="00000000 0ZZ0" />
                </Field>
                <Field label="Validade CC">
                  <Input type="date" value={form.ccValidade} onChange={e => set('ccValidade', e.target.value)} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label="NIPC">
                  <Input value={form.nipc} onChange={e => set('nipc', e.target.value)} placeholder="000000000" />
                </Field>
                <Field label="Certidão Permanente (Código)">
                  <Input
                    value={form.certidaoPermanenteCodigo}
                    onChange={e => set('certidaoPermanenteCodigo', e.target.value)}
                    placeholder="Código de acesso"
                  />
                </Field>
                <Field label="Representante Legal">
                  <Input
                    value={form.representanteNome}
                    onChange={e => set('representanteNome', e.target.value)}
                    placeholder="Nome do representante"
                  />
                </Field>
                <Field label="NIF do Representante">
                  <Input
                    value={form.representanteNif}
                    onChange={e => set('representanteNif', e.target.value)}
                    placeholder="000000000"
                  />
                </Field>
              </div>
            )}

            <Field label="Notas">
              <Textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3} placeholder="Observações gerais..." />
            </Field>
          </TabsContent>

          {/* TAB: Contactos */}
          <TabsContent value="contactos" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.pt" />
              </Field>
              <Field label="Telefone">
                <Input value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="+351 000 000 000" />
              </Field>
              <Field label="Telemóvel">
                <Input value={form.telemovel} onChange={e => set('telemovel', e.target.value)} placeholder="+351 9XX XXX XXX" />
              </Field>
            </div>
            <Field label="Morada">
              <Input value={form.morada} onChange={e => set('morada', e.target.value)} placeholder="Rua, nº, andar..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Código Postal">
                <Input value={form.codigoPostal} onChange={e => set('codigoPostal', e.target.value)} placeholder="0000-000" />
              </Field>
              <Field label="Localidade">
                <Input value={form.localidade} onChange={e => set('localidade', e.target.value)} placeholder="Cidade" />
              </Field>
            </div>
          </TabsContent>

          {/* TAB: Profissional */}
          <TabsContent value="profissional" className="space-y-4 pt-4">
            <Field label="Especialidade">
              <Input
                value={form.especialidade}
                onChange={e => set('especialidade', e.target.value)}
                placeholder="ex: Electricidade, Canalizações, Pinturas..."
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nº Alvará / Licença">
                <Input value={form.alvaraNumero} onChange={e => set('alvaraNumero', e.target.value)} placeholder="Número do alvará" />
              </Field>
              <Field label="Validade Alvará">
                <Input type="date" value={form.alvaraValidade} onChange={e => set('alvaraValidade', e.target.value)} />
              </Field>
              <Field label="Nº Apólice Seguro">
                <Input value={form.seguroNumero} onChange={e => set('seguroNumero', e.target.value)} placeholder="Nº da apólice" />
              </Field>
              <Field label="Validade Seguro">
                <Input type="date" value={form.seguroValidade} onChange={e => set('seguroValidade', e.target.value)} />
              </Field>
            </div>
          </TabsContent>

          {/* TAB: Financeiro */}
          <TabsContent value="financeiro" className="space-y-4 pt-4">
            <Field label="IBAN">
              <Input
                value={form.iban}
                onChange={e => set('iban', e.target.value.toUpperCase())}
                placeholder="PT50 0000 0000 0000 0000 0000 0"
              />
            </Field>
            <Field label="SWIFT / BIC">
              <Input
                value={form.swift}
                onChange={e => set('swift', e.target.value.toUpperCase())}
                placeholder="XXXXPTXX"
              />
            </Field>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : subempreiteiro ? 'Atualizar' : 'Criar Subempreiteiro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubempreiteiroFormDialog;
