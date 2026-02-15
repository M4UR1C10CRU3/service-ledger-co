import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, CreditCard, Heart } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';
import { formatEUR } from '@/lib/formatters';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface EmployeeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeeDetailDialog({ open, onOpenChange, employee }: EmployeeDetailDialogProps) {
  if (!employee) return null;

  const statusLabel = {
    active: 'Ativo',
    inactive: 'Inativo',
    on_leave: 'De Licença',
  }[employee.status] || employee.status;

  const statusColor = {
    active: 'bg-success-lighter text-success',
    inactive: 'bg-muted text-muted-foreground',
    on_leave: 'bg-warning-lighter text-warning',
  }[employee.status] || '';

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: pt }); } catch { return d; }
  };

  const benefits = (employee.benefits || {}) as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold">Detalhes do Colaborador</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] px-6 pb-6">
          <div className="space-y-6">
            {/* Header com foto e nome */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border shrink-0">
                {employee.photo_url ? (
                  <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{employee.full_name}</h2>
                <p className="text-sm text-muted-foreground">{employee.job_position?.name || '—'} • {employee.department || '—'}</p>
                <Badge className={`mt-1 ${statusColor}`}>{statusLabel}</Badge>
              </div>
            </div>

            <Separator />

            {/* Dados Pessoais */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Dados Pessoais
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{employee.email || '—'}</span></div>
                <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{employee.phone || '—'}</span></div>
                <div><span className="text-muted-foreground">WhatsApp:</span> <span className="font-medium">{employee.whatsapp || '—'}</span></div>
                <div><span className="text-muted-foreground">Nascimento:</span> <span className="font-medium">{formatDate(employee.birth_date)}</span></div>
              </div>
            </section>

            <Separator />

            {/* Morada */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Morada
              </h3>
              <p className="text-sm">
                {[employee.street, employee.street_number].filter(Boolean).join(', ') || '—'}
                {employee.freguesia && <><br />{employee.freguesia}</>}
                {employee.concelho && <>, {employee.concelho}</>}
                {employee.codigo_postal && <> — {employee.codigo_postal}</>}
              </p>
            </section>

            <Separator />

            {/* Dados Profissionais */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Dados Profissionais
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">NIF:</span> <span className="font-medium">{employee.nif || '—'}</span></div>
                <div><span className="text-muted-foreground">Salário:</span> <span className="font-medium">{employee.monthly_salary ? formatEUR(employee.monthly_salary) : '—'}</span></div>
                <div><span className="text-muted-foreground">Admissão:</span> <span className="font-medium">{formatDate(employee.admission_date)}</span></div>
              </div>
              {employee.activities_summary && (
                <div className="mt-3">
                  <span className="text-sm text-muted-foreground">Atividades:</span>
                  <p className="text-sm mt-1">{employee.activities_summary}</p>
                </div>
              )}
            </section>

            <Separator />

            {/* Benefícios */}
            <section>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4" /> Benefícios
              </h3>
              <div className="flex flex-wrap gap-2">
                {benefits.vale_transporte && <Badge variant="secondary">Vale Transporte</Badge>}
                {benefits.vale_alimentacao && <Badge variant="secondary">Vale Alimentação</Badge>}
                {benefits.plano_saude && <Badge variant="secondary">Plano de Saúde</Badge>}
                {benefits.seguro_vida && <Badge variant="secondary">Seguro de Vida</Badge>}
                {!benefits.vale_transporte && !benefits.vale_alimentacao && !benefits.plano_saude && !benefits.seguro_vida && (
                  <span className="text-sm text-muted-foreground">Nenhum benefício registado</span>
                )}
              </div>
              {benefits.outros && (
                <p className="text-sm mt-2"><span className="text-muted-foreground">Outros:</span> {benefits.outros}</p>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
