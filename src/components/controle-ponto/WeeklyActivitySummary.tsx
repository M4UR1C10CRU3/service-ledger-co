import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ClipboardList, Download, FileText } from 'lucide-react';
import { useWeeklyActivities, type WeeklyActivitySummary as SummaryType } from '@/hooks/useWeeklyActivities';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Props {
  employeeId: string;
  employeeName: string;
  utilizadorId: string | null;
  startDate: string;
  endDate: string;
}

export function WeeklyActivitySummarySection({ employeeId, employeeName, utilizadorId, startDate, endDate }: Props) {
  const { fetchActivities, isLoading } = useWeeklyActivities();
  const { empresa, getLogo } = useEmpresa();
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (utilizadorId) {
      fetchActivities(utilizadorId, startDate, endDate).then(s => setSummary(s));
    } else {
      setSummary(null);
    }
  }, [utilizadorId, startDate, endDate, fetchActivities]);

  if (!utilizadorId) {
    return (
      <Card className="border-border border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Este colaborador não tem utilizador Liberty associado. Associe nas configurações do colaborador.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          A carregar atividades...
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalActions === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Atividades no Sistema — Semana de {format(parseISO(startDate), 'dd/MM', { locale: pt })} a {format(parseISO(endDate), 'dd/MM/yyyy', { locale: pt })}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhuma atividade registada nesta semana.
        </CardContent>
      </Card>
    );
  }

  const toggleDay = (day: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  const dayNames: Record<number, string> = {
    0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
  };

  const moduleEntries = Object.entries(summary.moduleBreakdown).sort((a, b) => b[1] - a[1]);

  const handleExportExcel = () => {
    const rows = Object.entries(summary.activitiesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([, acts]) =>
        acts.map(a => ({
          Data: format(parseISO(a.data_hora), 'dd/MM/yyyy'),
          Hora: format(parseISO(a.data_hora), 'HH:mm'),
          Módulo: a.modulo,
          Ação: a.acao,
          Descrição: a.descricao,
        }))
      );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Atividades');
    XLSX.writeFile(wb, `atividades_${employeeName.replace(/\s+/g, '_')}_${startDate}_${endDate}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!empresa) return;
    const logoUrl = getLogo();
    const sortedDays = Object.keys(summary.activitiesByDay).sort();

    const dayRows = sortedDays.map(day => {
      const acts = summary.activitiesByDay[day];
      const dateObj = parseISO(day);
      const rows = acts.map(a => `
        <tr>
          <td>${format(parseISO(a.data_hora), 'HH:mm')}</td>
          <td>${a.modulo}</td>
          <td>${a.descricao}</td>
        </tr>`).join('');
      return `
        <h3 style="margin:12px 0 6px;font-size:11px;color:${empresa.corPrimaria}">
          📅 ${dayNames[dateObj.getDay()]}, ${format(dateObj, 'dd/MM/yyyy')} — ${acts.length} ações
        </h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
          <thead><tr style="background:${empresa.corPrimaria};color:white">
            <th style="padding:4px 6px;font-size:8px;text-align:left;width:60px">HORA</th>
            <th style="padding:4px 6px;font-size:8px;text-align:left;width:100px">MÓDULO</th>
            <th style="padding:4px 6px;font-size:8px;text-align:left">DESCRIÇÃO</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
      <title>Relatório de Atividades - ${employeeName}</title>
      <style>
        @page{size:A4;margin:15mm}*{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#1a1a2e;line-height:1.4}
        .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${empresa.corPrimaria};padding-bottom:12px;margin-bottom:16px}
        .header-left{display:flex;align-items:center;gap:14px}
        .header-left img{max-height:50px}
        .company-name{font-size:16px;font-weight:700;color:${empresa.corPrimaria}}
        .company-legal{font-size:10px;color:#666}
        td{padding:4px 6px;border-bottom:1px solid #eee;font-size:9px}
        tr:nth-child(even){background:#fafafa}
        .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:8px;color:#888}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>
      <div class="header">
        <div class="header-left">
          <img src="${logoUrl}" alt="Logo"/>
          <div><div class="company-name">${empresa.nome}</div><div class="company-legal">${empresa.nomeLegal || ''}</div></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:700">Relatório de Atividades</div>
          <div style="font-size:10px;color:#666">${employeeName}</div>
          <div style="font-size:10px;color:#666">Semana de ${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:16px">
        <div style="flex:1;background:#f8f9fa;border-radius:6px;padding:8px 12px;text-align:center">
          <div style="font-size:14px;font-weight:700;color:${empresa.corPrimaria}">${summary.totalActions}</div>
          <div style="font-size:8px;text-transform:uppercase;color:#888">Total Ações</div>
        </div>
        <div style="flex:1;background:#f8f9fa;border-radius:6px;padding:8px 12px;text-align:center">
          <div style="font-size:14px;font-weight:700;color:${empresa.corPrimaria}">${summary.activeDays.length}</div>
          <div style="font-size:8px;text-transform:uppercase;color:#888">Dias Ativos</div>
        </div>
        <div style="flex:2;background:#f8f9fa;border-radius:6px;padding:8px 12px">
          <div style="font-size:8px;text-transform:uppercase;color:#888;margin-bottom:4px">Módulos</div>
          <div style="font-size:9px">${moduleEntries.map(([m, c]) => `${m} (${c})`).join(' · ')}</div>
        </div>
      </div>
      ${dayRows}
      <div class="footer">
        <span>Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
      </div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Atividades no Sistema — Semana de {format(parseISO(startDate), 'dd/MM', { locale: pt })} a {format(parseISO(endDate), 'dd/MM/yyyy', { locale: pt })}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
              <FileText className="w-3 h-3" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1">
              <Download className="w-3 h-3" /> Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-accent/30 rounded-lg p-3">
            <span className="text-muted-foreground">Total ações</span>
            <p className="font-bold text-lg text-foreground">{summary.totalActions}</p>
          </div>
          <div className="bg-accent/30 rounded-lg p-3">
            <span className="text-muted-foreground">Módulos</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {moduleEntries.map(([mod, count]) => (
                <Badge key={mod} variant="secondary" className="text-xs">{mod} ({count})</Badge>
              ))}
            </div>
          </div>
          <div className="bg-accent/30 rounded-lg p-3">
            <span className="text-muted-foreground">Dias ativos</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {summary.activeDays.map(d => (
                <Badge key={d} variant="outline" className="text-xs">
                  {dayNames[parseISO(d).getDay()]?.slice(0, 3)}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Day by day */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Detalhe por dia</p>
          {Object.keys(summary.activitiesByDay).sort().map(day => {
            const acts = summary.activitiesByDay[day];
            const dateObj = parseISO(day);
            const isExpanded = expandedDays.has(day) || showAll;
            const displayActs = isExpanded ? acts : acts.slice(0, 5);

            return (
              <div key={day} className="border border-border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-2 bg-muted/30 cursor-pointer"
                  onClick={() => toggleDay(day)}
                >
                  <span className="text-sm font-medium">
                    📅 {dayNames[dateObj.getDay()]}, {format(dateObj, 'dd/MM')}
                  </span>
                  <Badge variant="secondary" className="text-xs">{acts.length} ações</Badge>
                </div>
                <div className="px-4 py-2 space-y-1">
                  {displayActs.map(a => (
                    <div key={a.id} className="flex items-start gap-2 text-sm py-0.5">
                      <span className="text-muted-foreground shrink-0 w-12">
                        {format(parseISO(a.data_hora), 'HH:mm')}
                      </span>
                      <span className="text-foreground">{a.descricao}</span>
                    </div>
                  ))}
                  {!isExpanded && acts.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary"
                      onClick={(e) => { e.stopPropagation(); toggleDay(day); }}
                    >
                      Ver mais ({acts.length - 5} restantes)
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!showAll && Object.keys(summary.activitiesByDay).length > 2 && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAll(true)}>
            Ver todas as atividades
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
