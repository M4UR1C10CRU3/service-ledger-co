import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock, Calendar, User, Plus, Timer, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Coffee, Pencil, Trash2, FileText, Star,
} from 'lucide-react';
import { useEmployees, Employee } from '@/hooks/useEmployees';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { useFeriados } from '@/hooks/useFeriados';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isToday, getDay, eachDayOfInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const DAY_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'feriado', label: 'Feriado' },
  { value: 'ferias', label: 'Férias' },
  { value: 'folga', label: 'Folga' },
  { value: 'falta', label: 'Falta' },
  { value: 'liberacao', label: 'Liberação' },
];

const FOLGA_TIPOS = [
  { value: 'total', label: 'Dia Inteiro' },
  { value: 'manha', label: 'Manhã (liberação da manhã)' },
  { value: 'tarde', label: 'Tarde (liberação da tarde)' },
];

const DAY_NAMES: Record<string, string> = {
  sunday: 'Domingo', monday: 'Segunda', tuesday: 'Terça',
  wednesday: 'Quarta', thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado',
};

const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

const ControlePonto = () => {
  const { employees } = useEmployees();
  const { empresa, getLogo } = useEmpresa();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState({
    entry_time: '08:00',
    lunch_exit_time: '12:00',
    lunch_return_time: '13:00',
    exit_time: '17:00',
    overtime_hours: '0',
    day_type: 'normal',
    folga_tipo: 'total',
    observations: '',
  });

  // Feriados state
  const { feriados, addFeriado, deleteFeriado, isFeriado } = useFeriados();
  const [feriadoFormOpen, setFeriadoFormOpen] = useState(false);
  const [newFeriadoData, setNewFeriadoData] = useState({ data: '', descricao: '' });
  const [deleteFeriadoId, setDeleteFeriadoId] = useState<string | null>(null);

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

  const selectedEmployee = useMemo(
    () => activeEmployees.find(e => e.id === selectedEmployeeId) || null,
    [activeEmployees, selectedEmployeeId]
  );

  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: format(startOfWeek(currentDate, { weekStartsOn: 6 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(currentDate, { weekStartsOn: 6 }), 'yyyy-MM-dd'),
      };
    }
    return {
      start: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      end: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
    };
  }, [currentDate, viewMode]);

  // Generate days in current period for the date selector
  const periodDays = useMemo(() => {
    return eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) });
  }, [dateRange]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const { records, isLoading, upsertRecord, deleteRecord } = useTimeRecords(
    selectedEmployeeId || undefined,
    dateRange.start,
    dateRange.end
  );

  const shouldWorkDay = (date: Date): boolean => {
    if (!selectedEmployee) return false;
    const schedule = selectedEmployee.work_schedule;
    const dayName = DAY_INDEX_TO_NAME[getDay(date)];
    if (schedule && dayName in schedule) return schedule[dayName];
    const dow = getDay(date);
    return dow >= 1 && dow <= 5;
  };

  const stats = useMemo(() => {
    const totalWorked = records.reduce((s, r) => s + (r.worked_hours || 0), 0);
    const totalExpected = records.reduce((s, r) => s + (r.expected_hours || 0), 0);
    const totalBalance = records.reduce((s, r) => s + (r.balance || 0), 0);
    const totalOvertime = records.reduce((s, r) => s + (r.overtime_hours || 0), 0);
    const daysWorked = records.filter(r => r.worked_hours > 0).length;
    return { totalWorked, totalExpected, totalBalance, totalOvertime, daysWorked };
  }, [records]);

  const handleOpenForm = (date?: string, recordId?: string) => {
    const d = date || format(new Date(), 'yyyy-MM-dd');
    setFormDate(d);

    const existing = recordId
      ? records.find(r => r.id === recordId)
      : records.find(r => r.record_date === d);

    if (existing) {
      setEditingRecordId(existing.id);
      setFormData({
        entry_time: existing.entry_time?.slice(0, 5) || '',
        lunch_exit_time: existing.lunch_exit_time?.slice(0, 5) || '',
        lunch_return_time: existing.lunch_return_time?.slice(0, 5) || '',
        exit_time: existing.exit_time?.slice(0, 5) || '',
        overtime_hours: String(existing.overtime_hours || 0),
        day_type: existing.day_type || 'normal',
        observations: existing.observations || '',
      });
    } else {
      setEditingRecordId(null);
      setFormData({
        entry_time: '08:00', lunch_exit_time: '12:00',
        lunch_return_time: '13:00', exit_time: '17:00',
        overtime_hours: '0', day_type: 'normal', observations: '',
      });
    }
    setFormOpen(true);
  };

  // When user changes date in the form, check if there's an existing record
  const handleFormDateChange = (newDate: string) => {
    setFormDate(newDate);
    const existing = records.find(r => r.record_date === newDate);
    if (existing) {
      setEditingRecordId(existing.id);
      setFormData({
        entry_time: existing.entry_time?.slice(0, 5) || '',
        lunch_exit_time: existing.lunch_exit_time?.slice(0, 5) || '',
        lunch_return_time: existing.lunch_return_time?.slice(0, 5) || '',
        exit_time: existing.exit_time?.slice(0, 5) || '',
        overtime_hours: String(existing.overtime_hours || 0),
        day_type: existing.day_type || 'normal',
        observations: existing.observations || '',
      });
    } else {
      setEditingRecordId(null);
      setFormData({
        entry_time: '08:00', lunch_exit_time: '12:00',
        lunch_return_time: '13:00', exit_time: '17:00',
        overtime_hours: '0', day_type: 'normal', observations: '',
      });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRecord.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId) return;
    await upsertRecord.mutateAsync({
      employee_id: selectedEmployeeId,
      record_date: formDate,
      entry_time: formData.day_type === 'normal' ? formData.entry_time || null : null,
      lunch_exit_time: formData.day_type === 'normal' ? formData.lunch_exit_time || null : null,
      lunch_return_time: formData.day_type === 'normal' ? formData.lunch_return_time || null : null,
      exit_time: formData.day_type === 'normal' ? formData.exit_time || null : null,
      overtime_hours: parseFloat(formData.overtime_hours) || 0,
      day_type: formData.day_type,
      observations: formData.observations || null,
    } as any);
    setFormOpen(false);
  };

  const formatTime = (t: string | null) => t ? t.slice(0, 5) : '—';
  const formatHours = (h: number) => {
    const abs = Math.abs(h);
    const wholeHours = Math.floor(abs);
    const minutes = Math.round((abs - wholeHours) * 60);
    const sign = h < 0 ? '-' : '';
    if (minutes === 0) return `${sign}${wholeHours}h`;
    return `${sign}${wholeHours}h${minutes.toString().padStart(2, '0')}`;
  };

  const dayTypeConfig: Record<string, { label: string; className: string }> = {
    normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
    feriado: { label: 'Feriado', className: 'bg-info/10 text-info' },
    ferias: { label: 'Férias', className: 'bg-success/10 text-success' },
    folga: { label: 'Folga', className: 'bg-muted text-muted-foreground' },
    falta: { label: 'Falta', className: 'bg-destructive/10 text-destructive' },
    liberacao: { label: 'Liberação', className: 'bg-warning/10 text-warning' },
  };

  // ========== PDF Report Generation ==========
  const generateReport = async () => {
    if (!selectedEmployee || !empresa) return;

    // Get current user name
    const { data: { user } } = await supabase.auth.getUser();
    let emitterName = 'Utilizador';
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle();
      if (profile?.nome) emitterName = profile.nome;
    }

    const now = new Date();
    const periodLabel = viewMode === 'week'
      ? `${format(parseISO(dateRange.start), "dd 'de' MMMM", { locale: pt })} a ${format(parseISO(dateRange.end), "dd 'de' MMMM 'de' yyyy", { locale: pt })}`
      : format(currentDate, "MMMM 'de' yyyy", { locale: pt });

    const periodType = viewMode === 'week' ? 'Semanal' : 'Mensal';
    const logoUrl = getLogo();
    const emp = selectedEmployee;
    const workdaysPerWeek = emp.workdays_per_week || 5;
    const hoursPerDay = (40 / workdaysPerWeek).toFixed(1);
    const schedule = workdaysPerWeek === 5 ? 'Seg-Sex' : workdaysPerWeek === 6 ? 'Seg-Sáb' : 'Personalizada';

    const sortedRecords = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));

    const dayTypeLabels: Record<string, string> = {
      normal: 'Normal', feriado: 'Feriado', ferias: 'Férias',
      folga: 'Folga', falta: 'Falta', liberacao: 'Liberação',
    };

    const fmtH = (h: number) => {
      const abs = Math.abs(h);
      const wh = Math.floor(abs);
      const mins = Math.round((abs - wh) * 60);
      const sign = h < 0 ? '-' : '';
      return mins === 0 ? `${sign}${wh}h` : `${sign}${wh}h${mins.toString().padStart(2, '0')}`;
    };

    const tableRows = sortedRecords.map(r => {
      const dateObj = parseISO(r.record_date);
      return `<tr>
        <td>${format(dateObj, 'dd/MM/yyyy')}</td>
        <td>${format(dateObj, 'EEEE', { locale: pt })}</td>
        <td style="text-align:center">${r.entry_time ? r.entry_time.slice(0, 5) : '—'}</td>
        <td style="text-align:center">${r.lunch_exit_time ? r.lunch_exit_time.slice(0, 5) : '—'}</td>
        <td style="text-align:center">${r.lunch_return_time ? r.lunch_return_time.slice(0, 5) : '—'}</td>
        <td style="text-align:center">${r.exit_time ? r.exit_time.slice(0, 5) : '—'}</td>
        <td style="text-align:right">${fmtH(r.worked_hours || 0)}</td>
        <td style="text-align:right">${fmtH(r.expected_hours || 0)}</td>
        <td style="text-align:right;color:${(r.balance || 0) >= 0 ? '#16a34a' : '#dc2626'}">${(r.balance || 0) >= 0 ? '+' : ''}${fmtH(r.balance || 0)}</td>
        <td style="text-align:center">${dayTypeLabels[r.day_type] || r.day_type}</td>
        <td style="font-size:8px">${r.observations || ''}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Ponto - ${emp.full_name}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a2e; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${empresa.corPrimaria}; padding-bottom: 12px; margin-bottom: 16px; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .header-left img { max-height: 50px; }
    .company-name { font-size: 16px; font-weight: 700; color: ${empresa.corPrimaria}; }
    .company-legal { font-size: 10px; color: #666; }
    .report-title { font-size: 14px; font-weight: 700; text-align: right; color: #1a1a2e; }
    .report-subtitle { font-size: 10px; color: #666; text-align: right; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .info-box { background: #f8f9fa; border-radius: 6px; padding: 10px 14px; border-left: 3px solid ${empresa.corPrimaria}; }
    .info-box h4 { font-size: 9px; text-transform: uppercase; color: #888; margin-bottom: 4px; letter-spacing: 0.5px; }
    .info-box p { font-size: 11px; font-weight: 600; color: #1a1a2e; }
    .stats-row { display: flex; gap: 10px; margin-bottom: 16px; }
    .stat-card { flex: 1; background: #f8f9fa; border-radius: 6px; padding: 8px 12px; text-align: center; }
    .stat-card .value { font-size: 14px; font-weight: 700; color: ${empresa.corPrimaria}; }
    .stat-card .label { font-size: 8px; text-transform: uppercase; color: #888; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: ${empresa.corPrimaria}; color: white; padding: 6px 5px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; }
    td { padding: 5px; border-bottom: 1px solid #eee; font-size: 9px; }
    tr:nth-child(even) { background: #fafafa; }
    .totals-row { background: #f0f0f0 !important; font-weight: 700; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 8px; color: #888; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoUrl}" alt="Logo" />
      <div>
        <div class="company-name">${empresa.nome}</div>
        <div class="company-legal">${empresa.nomeLegal || ''}</div>
      </div>
    </div>
    <div>
      <div class="report-title">Relatório de Ponto ${periodType}</div>
      <div class="report-subtitle">${periodLabel} · ${sortedRecords.length} registo(s)</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Colaborador</h4>
      <p>${emp.full_name}</p>
    </div>
    <div class="info-box">
      <h4>Departamento / Função</h4>
      <p>${emp.department || 'N/D'} ${emp.job_position?.name ? '/ ' + emp.job_position.name : ''}</p>
    </div>
    <div class="info-box">
      <h4>NIF</h4>
      <p>${emp.nif || 'N/D'}</p>
    </div>
    <div class="info-box">
      <h4>Escala de Trabalho</h4>
      <p>${workdaysPerWeek} dias/semana · ${hoursPerDay}h/dia · ${schedule}</p>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="value">${fmtH(stats.totalWorked)}</div>
      <div class="label">Trabalhado</div>
    </div>
    <div class="stat-card">
      <div class="value">${fmtH(stats.totalExpected)}</div>
      <div class="label">Esperado</div>
    </div>
    <div class="stat-card">
      <div class="value" style="color:${stats.totalBalance >= 0 ? '#16a34a' : '#dc2626'}">${stats.totalBalance >= 0 ? '+' : ''}${fmtH(stats.totalBalance)}</div>
      <div class="label">Saldo</div>
    </div>
    <div class="stat-card">
      <div class="value">${fmtH(stats.totalOvertime)}</div>
      <div class="label">H. Extra</div>
    </div>
    <div class="stat-card">
      <div class="value">${stats.daysWorked}</div>
      <div class="label">Dias Trab.</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Dia</th>
        <th style="text-align:center">Entrada</th>
        <th style="text-align:center">S. Almoço</th>
        <th style="text-align:center">Retorno</th>
        <th style="text-align:center">Saída</th>
        <th style="text-align:right">Trab.</th>
        <th style="text-align:right">Esp.</th>
        <th style="text-align:right">Saldo</th>
        <th style="text-align:center">Tipo</th>
        <th>Obs.</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="totals-row">
        <td colspan="6" style="text-align:right">Totais:</td>
        <td style="text-align:right">${fmtH(stats.totalWorked)}</td>
        <td style="text-align:right">${fmtH(stats.totalExpected)}</td>
        <td style="text-align:right;color:${stats.totalBalance >= 0 ? '#16a34a' : '#dc2626'}">${stats.totalBalance >= 0 ? '+' : ''}${fmtH(stats.totalBalance)}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Emitido por: ${emitterName}</span>
    <span>Data de emissão: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Controlo de Ponto</h1>
          <p className="text-sm text-muted-foreground">Registo de horários e jornadas</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generateReport}
            disabled={!selectedEmployeeId || records.length === 0}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Relatório PDF
          </Button>
          <Button onClick={() => handleOpenForm()} disabled={!selectedEmployeeId} className="gap-2">
            <Plus className="w-4 h-4" />
            Registar Ponto
          </Button>
        </div>
      </div>

      {/* Employee Selector */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-1 block">Colaborador</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name} {e.department ? `(${e.department})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-end">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semanal
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mensal
              </Button>
            </div>
          </div>

          {/* Employee schedule info */}
          {selectedEmployee && (
            <div className="bg-accent/30 rounded-lg p-3 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{selectedEmployee.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Dias/Semana: </span>
                <span className="font-semibold">{selectedEmployee.workdays_per_week || 5}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Horas/Dia: </span>
                <span className="font-semibold">{(40 / (selectedEmployee.workdays_per_week || 5)).toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Escala: </span>
                <span className="font-semibold">
                  {(selectedEmployee.workdays_per_week || 5) === 5 ? 'Seg-Sex' : 
                   (selectedEmployee.workdays_per_week || 5) === 6 ? 'Seg-Sáb' : 'Personalizada'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => {
          const d = new Date(currentDate);
          if (viewMode === 'week') d.setDate(d.getDate() - 7);
          else d.setMonth(d.getMonth() - 1);
          setCurrentDate(d);
        }}>
          ← Anterior
        </Button>
        <div className="text-center">
          <p className="font-medium text-foreground">
            {viewMode === 'week'
              ? `${format(parseISO(dateRange.start), "dd 'de' MMMM", { locale: pt })} — ${format(parseISO(dateRange.end), "dd 'de' MMMM yyyy", { locale: pt })}`
              : format(currentDate, "MMMM 'de' yyyy", { locale: pt })
            }
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const d = new Date(currentDate);
          if (viewMode === 'week') d.setDate(d.getDate() + 7);
          else d.setMonth(d.getMonth() + 1);
          setCurrentDate(d);
        }}>
          Próximo →
        </Button>
      </div>

      {/* Stats Cards */}
      {selectedEmployeeId && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{formatHours(stats.totalWorked)}</p>
                <p className="text-xs text-muted-foreground">Trabalhado</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Timer className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{formatHours(stats.totalExpected)}</p>
                <p className="text-xs text-muted-foreground">Esperado</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.totalBalance >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {stats.totalBalance >= 0 ? <TrendingUp className="w-5 h-5 text-success" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
              </div>
              <div>
                <p className={`text-lg font-bold ${stats.totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.totalBalance >= 0 ? '+' : ''}{formatHours(stats.totalBalance)}
                </p>
                <p className="text-xs text-muted-foreground">Saldo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{formatHours(stats.totalOvertime)}</p>
                <p className="text-xs text-muted-foreground">H. Extra</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Calendar className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stats.daysWorked}</p>
                <p className="text-xs text-muted-foreground">Dias Trab.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {!selectedEmployeeId ? (
            <div className="p-12 text-center space-y-2">
              <User className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground">Selecione um colaborador</p>
              <p className="text-sm text-muted-foreground">Escolha um colaborador para ver os registos de ponto</p>
            </div>
          ) : isLoading ? (
            <div className="p-12 text-center text-muted-foreground">A carregar registos...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground">Nenhum registo encontrado</p>
              <p className="text-sm text-muted-foreground">Clique em "Registar Ponto" para adicionar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Dia</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída Almoço</TableHead>
                    <TableHead>Retorno</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead className="text-right">Trabalhado</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                     <TableHead>Tipo</TableHead>
                     <TableHead className="text-center">Ações</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {records.map(r => {
                    const dtc = dayTypeConfig[r.day_type] || dayTypeConfig.normal;
                    const dateObj = parseISO(r.record_date);
                    return (
                      <TableRow key={r.id} className="hover:bg-accent/30">
                        <TableCell className="font-medium">{format(dateObj, 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm">
                          {format(dateObj, 'EEEE', { locale: pt })}
                        </TableCell>
                        <TableCell>{formatTime(r.entry_time)}</TableCell>
                        <TableCell>{formatTime(r.lunch_exit_time)}</TableCell>
                        <TableCell>{formatTime(r.lunch_return_time)}</TableCell>
                        <TableCell>{formatTime(r.exit_time)}</TableCell>
                        <TableCell className="text-right font-medium">{formatHours(r.worked_hours)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatHours(r.expected_hours)}</TableCell>
                        <TableCell className={`text-right font-medium ${r.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {r.balance >= 0 ? '+' : ''}{formatHours(r.balance)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={dtc.className}>{dtc.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenForm(r.record_date, r.id)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(r.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals row */}
                   <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={6} className="text-right">Totais:</TableCell>

                    <TableCell className="text-right">{formatHours(stats.totalWorked)}</TableCell>
                    <TableCell className="text-right">{formatHours(stats.totalExpected)}</TableCell>
                    <TableCell className={`text-right ${stats.totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {stats.totalBalance >= 0 ? '+' : ''}{formatHours(stats.totalBalance)}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingRecordId ? 'Editar' : 'Registar'} Ponto
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (() => {
            const dateObj = parseISO(formDate);
            const works = shouldWorkDay(dateObj);
            return (
              <div className="space-y-4">
                {/* Employee info */}
                <div className="bg-accent/30 rounded-lg p-3 text-sm">
                  <p className="font-medium">{selectedEmployee.full_name}</p>
                  <p className="text-muted-foreground">
                    {(selectedEmployee.workdays_per_week || 5)} dias/semana • {(40 / (selectedEmployee.workdays_per_week || 5)).toFixed(1)}h/dia
                  </p>
                </div>

                {/* Date Selector */}
                <div className="space-y-2">
                  <Label>Data do Registo</Label>
                  <Select value={formDate} onValueChange={handleFormDateChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodDays.map(day => {
                        const val = format(day, 'yyyy-MM-dd');
                        const hasRecord = records.some(r => r.record_date === val);
                        return (
                          <SelectItem key={val} value={val}>
                            {format(day, "dd/MM/yyyy - EEEE", { locale: pt })}
                            {hasRecord ? ' ✓' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {!works && formData.day_type === 'normal' && (
                  <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Este colaborador não trabalha neste dia da semana.</span>
                  </div>
                )}

                {/* Day Type */}
                <div className="space-y-2">
                  <Label>Tipo do Dia</Label>
                  <Select value={formData.day_type} onValueChange={v => setFormData(f => ({ ...f, day_type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_TYPES.map(dt => (
                        <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.day_type === 'normal' && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Entrada</Label>
                        <Input type="time" value={formData.entry_time} onChange={e => setFormData(f => ({ ...f, entry_time: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Saída Almoço</Label>
                        <Input type="time" value={formData.lunch_exit_time} onChange={e => setFormData(f => ({ ...f, lunch_exit_time: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Retorno Almoço</Label>
                        <Input type="time" value={formData.lunch_return_time} onChange={e => setFormData(f => ({ ...f, lunch_return_time: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Saída</Label>
                        <Input type="time" value={formData.exit_time} onChange={e => setFormData(f => ({ ...f, exit_time: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Horas Extras</Label>
                      <Input type="number" step="0.5" min="0" value={formData.overtime_hours} onChange={e => setFormData(f => ({ ...f, overtime_hours: e.target.value }))} />
                    </div>
                  </>
                )}

                {/* Observations */}
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observations}
                    onChange={e => setFormData(f => ({ ...f, observations: e.target.value }))}
                    placeholder="Notas adicionais..."
                    rows={2}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-2">
                  <div>
                    {editingRecordId && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setFormOpen(false);
                          setDeleteConfirmId(editingRecordId);
                        }}
                        className="gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={upsertRecord.isPending}>
                      {upsertRecord.isPending ? 'A guardar...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registo de ponto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRecord.isPending ? 'A excluir...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ControlePonto;
