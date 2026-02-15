import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Upload, User } from 'lucide-react';
import { useJobPositions, useEmployees, Employee } from '@/hooks/useEmployees';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatEUR } from '@/lib/formatters';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

const DEPARTMENTS = [
  'Administrativo', 'Comercial', 'Obras', 'Engenharia',
  'Arquitetura', 'Produção', 'Financeiro', 'Recursos Humanos', 'Logística',
];

const COUNTRIES = [
  'Afeganistão','África do Sul','Albânia','Alemanha','Andorra','Angola','Antígua e Barbuda','Arábia Saudita','Argélia','Argentina','Arménia','Austrália','Áustria','Azerbaijão',
  'Bahamas','Bangladeche','Barbados','Barém','Bélgica','Belize','Benim','Bielorrússia','Bolívia','Bósnia e Herzegovina','Botsuana','Brasil','Brunei','Bulgária','Burquina Faso','Burundi','Butão',
  'Cabo Verde','Camarões','Camboja','Canadá','Catar','Cazaquistão','Chade','Chile','China','Chipre','Colômbia','Comores','Congo','Coreia do Norte','Coreia do Sul','Costa do Marfim','Costa Rica','Croácia','Cuba',
  'Dinamarca','Dominica','Egito','Emirados Árabes Unidos','Equador','Eritreia','Eslováquia','Eslovénia','Espanha','Estados Unidos','Estónia','Etiópia',
  'Fiji','Filipinas','Finlândia','França',
  'Gabão','Gâmbia','Gana','Geórgia','Granada','Grécia','Guatemala','Guiana','Guiné','Guiné-Bissau','Guiné Equatorial',
  'Haiti','Honduras','Hungria',
  'Iémen','Ilhas Marshall','Ilhas Salomão','Índia','Indonésia','Irão','Iraque','Irlanda','Islândia','Israel','Itália',
  'Jamaica','Japão','Jordânia',
  'Kiribati','Kosovo','Kuwait',
  'Laos','Lesoto','Letónia','Líbano','Libéria','Líbia','Listenstaine','Lituânia','Luxemburgo',
  'Macedónia do Norte','Madagáscar','Malásia','Maláui','Maldivas','Mali','Malta','Marrocos','Maurícia','Mauritânia','México','Mianmar','Micronésia','Moçambique','Moldávia','Mónaco','Mongólia','Montenegro',
  'Namíbia','Nauru','Nepal','Nicarágua','Níger','Nigéria','Noruega','Nova Zelândia',
  'Omã',
  'Países Baixos','Palau','Palestina','Panamá','Papua-Nova Guiné','Paquistão','Paraguai','Peru','Polónia','Portugal',
  'Quénia','Quirguistão',
  'Reino Unido','República Centro-Africana','República Checa','República Democrática do Congo','República Dominicana','Roménia','Ruanda','Rússia',
  'Samoa','San Marino','Santa Lúcia','São Cristóvão e Neves','São Tomé e Príncipe','São Vicente e Granadinas','Senegal','Serra Leoa','Sérvia','Seicheles','Singapura','Síria','Somália','Sri Lanca','Suazilândia','Sudão','Sudão do Sul','Suécia','Suíça','Suriname',
  'Tailândia','Taiwan','Tajiquistão','Tanzânia','Timor-Leste','Togo','Tonga','Trindade e Tobago','Tunísia','Turquemenistão','Turquia','Tuvalu',
  'Ucrânia','Uganda','Uruguai','Usbequistão',
  'Vanuatu','Vaticano','Venezuela','Vietname',
  'Zâmbia','Zimbábue',
];

const defaultBenefits = {
  vale_transporte: false,
  vale_alimentacao: false,
  plano_saude: false,
  seguro_vida: false,
  outros: '',
};

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  whatsapp: '',
  birth_date: '',
  photo_url: '',
  linkedin: '',
  facebook: '',
  instagram: '',
  nacionalidade: '',
  cartao_cidadao: '',
  autorizacao_residencia: '',
  passaporte: '',
  niss: '',
  utente: '',
  street: '',
  street_number: '',
  freguesia: '',
  concelho: '',
  codigo_postal: '',
  pais: 'Portugal',
  job_position_id: '',
  department: '',
  monthly_salary: '',
  nif: '',
  activities_summary: '',
  admission_date: '',
  benefits: { ...defaultBenefits },
  status: 'active',
};

export function EmployeeFormDialog({ open, onOpenChange, employee }: EmployeeFormDialogProps) {
  const { data: positions } = useJobPositions();
  const { createEmployee, updateEmployee, createJobPosition } = useEmployees();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [uploading, setUploading] = useState(false);

  const isEditing = !!employee;

  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        whatsapp: employee.whatsapp || '',
        birth_date: employee.birth_date || '',
        photo_url: employee.photo_url || '',
        linkedin: employee.linkedin || '',
        facebook: employee.facebook || '',
        instagram: employee.instagram || '',
        nacionalidade: employee.nacionalidade || '',
        cartao_cidadao: employee.cartao_cidadao || '',
        autorizacao_residencia: employee.autorizacao_residencia || '',
        passaporte: employee.passaporte || '',
        niss: employee.niss || '',
        utente: employee.utente || '',
        street: employee.street || '',
        street_number: employee.street_number || '',
        freguesia: employee.freguesia || '',
        concelho: employee.concelho || '',
        codigo_postal: employee.codigo_postal || '',
        pais: employee.pais || 'Portugal',
        job_position_id: employee.job_position_id || '',
        department: employee.department || '',
        monthly_salary: employee.monthly_salary?.toString() || '',
        nif: employee.nif || '',
        activities_summary: employee.activities_summary || '',
        admission_date: employee.admission_date || '',
        benefits: employee.benefits || { ...defaultBenefits },
        status: employee.status || 'active',
      });
    } else {
      setForm(emptyForm);
    }
  }, [employee, open]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ficheiro muito grande', description: 'Máximo 5MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('employee-photos').upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('employee-photos').getPublicUrl(fileName);
      setForm(f => ({ ...f, photo_url: urlData.publicUrl }));
    } catch {
      toast({ title: 'Erro ao carregar foto', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    const payload: any = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      birth_date: form.birth_date || null,
      photo_url: form.photo_url || null,
      linkedin: form.linkedin || null,
      facebook: form.facebook || null,
      instagram: form.instagram || null,
      nacionalidade: form.nacionalidade || null,
      cartao_cidadao: form.cartao_cidadao || null,
      autorizacao_residencia: form.autorizacao_residencia || null,
      passaporte: form.passaporte || null,
      niss: form.niss || null,
      utente: form.utente || null,
      street: form.street || null,
      street_number: form.street_number || null,
      freguesia: form.freguesia || null,
      concelho: form.concelho || null,
      codigo_postal: form.codigo_postal || null,
      pais: form.pais || null,
      job_position_id: form.job_position_id || null,
      department: form.department || null,
      monthly_salary: form.monthly_salary ? parseFloat(form.monthly_salary) : null,
      nif: form.nif || null,
      activities_summary: form.activities_summary || null,
      admission_date: form.admission_date || null,
      benefits: form.benefits,
      status: form.status,
    };

    if (isEditing && employee) {
      await updateEmployee.mutateAsync({ id: employee.id, ...payload });
    } else {
      await createEmployee.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const handleAddPosition = async () => {
    if (!newPositionName.trim()) return;
    await createJobPosition.mutateAsync({ name: newPositionName.trim() });
    setNewPositionName('');
    setShowNewPosition(false);
  };

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));
  const setBenefit = (key: string, value: any) =>
    setForm(f => ({ ...f, benefits: { ...f.benefits, [key]: value } }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold text-foreground">
            {isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Dados Pessoais</h3>
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Foto */}
                <div className="md:col-span-2 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border shrink-0">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium">
                      <Upload className="w-4 h-4" />
                      {uploading ? 'A carregar...' : 'Carregar Foto'}
                    </Label>
                    <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                    <p className="text-xs text-muted-foreground">JPG, PNG. Máx. 5MB</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nome completo" required />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.pt" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+351 912 345 678" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+351 912 345 678" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nacionalidade</Label>
                  <Select value={form.nacionalidade} onValueChange={v => set('nacionalidade', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o país..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-2">
                  <Label>Facebook</Label>
                  <Input value={form.facebook} onChange={e => set('facebook', e.target.value)} placeholder="https://facebook.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@utilizador" />
                </div>
              </div>
            </section>

            {/* Documentação */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Documentação</h3>
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cartão de Cidadão</Label>
                  <Input value={form.cartao_cidadao} onChange={e => set('cartao_cidadao', e.target.value)} placeholder="Nº Cartão de Cidadão" />
                </div>
                <div className="space-y-2">
                  <Label>Autorização de Residência</Label>
                  <Input value={form.autorizacao_residencia} onChange={e => set('autorizacao_residencia', e.target.value)} placeholder="Nº Autorização de Residência" />
                </div>
                <div className="space-y-2">
                  <Label>Passaporte</Label>
                  <Input value={form.passaporte} onChange={e => set('passaporte', e.target.value)} placeholder="Nº Passaporte" />
                </div>
                <div className="space-y-2">
                  <Label>Contribuinte (NIF)</Label>
                  <Input value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="123456789" maxLength={9} />
                  <p className="text-xs text-muted-foreground">9 dígitos</p>
                </div>
                <div className="space-y-2">
                  <Label>NISS</Label>
                  <Input value={form.niss} onChange={e => set('niss', e.target.value)} placeholder="Nº Segurança Social" />
                </div>
                <div className="space-y-2">
                  <Label>Utente (SNS)</Label>
                  <Input value={form.utente} onChange={e => set('utente', e.target.value)} placeholder="Nº Utente SNS" />
                </div>
              </div>
            </section>

            {/* Morada */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Morada</h3>
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Rua / Avenida</Label>
                  <Input value={form.street} onChange={e => set('street', e.target.value)} placeholder="Nome da rua ou avenida" />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.street_number} onChange={e => set('street_number', e.target.value)} placeholder="Nº" />
                </div>
                <div className="space-y-2">
                  <Label>Freguesia</Label>
                  <Input value={form.freguesia} onChange={e => set('freguesia', e.target.value)} placeholder="Freguesia" />
                </div>
                <div className="space-y-2">
                  <Label>Concelho</Label>
                  <Input value={form.concelho} onChange={e => set('concelho', e.target.value)} placeholder="Concelho" />
                </div>
                <div className="space-y-2">
                  <Label>Código Postal</Label>
                  <Input value={form.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} placeholder="1000-001" maxLength={8} />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Select value={form.pais} onValueChange={v => set('pais', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o país..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Dados Profissionais */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Dados Profissionais</h3>
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo / Função</Label>
                  <div className="flex gap-2">
                    <Select value={form.job_position_id} onValueChange={v => set('job_position_id', v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {positions?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowNewPosition(!showNewPosition)} title="Nova função">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {showNewPosition && (
                    <div className="flex gap-2 mt-2">
                      <Input value={newPositionName} onChange={e => setNewPositionName(e.target.value)} placeholder="Nome da função" className="flex-1" />
                      <Button type="button" size="sm" onClick={handleAddPosition} disabled={createJobPosition.isPending}>
                        Adicionar
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select value={form.department} onValueChange={v => set('department', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Salário Mensal (€)</Label>
                  <Input type="number" step="0.01" min="0" value={form.monthly_salary} onChange={e => set('monthly_salary', e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Admissão</Label>
                  <Input type="date" value={form.admission_date} onChange={e => set('admission_date', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => set('status', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="on_leave">De Licença</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Resumo das Atividades</Label>
                  <Textarea value={form.activities_summary} onChange={e => set('activities_summary', e.target.value)} placeholder="Principais atividades desempenhadas..." rows={3} />
                </div>
              </div>
            </section>

            {/* Benefícios */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Benefícios Oferecidos</h3>
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'vale_transporte', label: 'Ajuda de Custo / Transporte' },
                  { key: 'vale_alimentacao', label: 'Subsídio Alimentação' },
                  { key: 'plano_saude', label: 'Plano de Saúde' },
                  { key: 'seguro_vida', label: 'Seguro de Vida' },
                ].map(b => (
                  <label key={b.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={(form.benefits as any)[b.key]}
                      onCheckedChange={v => setBenefit(b.key, !!v)}
                    />
                    <span className="text-sm">{b.label}</span>
                  </label>
                ))}
                <div className="md:col-span-2 space-y-2">
                  <Label>Outros Benefícios</Label>
                  <Textarea value={form.benefits.outros} onChange={e => setBenefit('outros', e.target.value)} placeholder="Descreva outros benefícios..." rows={2} />
                </div>
              </div>
            </section>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
                {(createEmployee.isPending || updateEmployee.isPending) ? 'A guardar...' : isEditing ? 'Guardar Alterações' : 'Cadastrar Colaborador'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
