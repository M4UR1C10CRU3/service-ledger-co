import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Phone, Trash2 } from 'lucide-react';
import { FASES_CONFIG } from '@/types/followup';
import type { Oportunidade } from '@/types/followup';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Props {
  oportunidades: Oportunidade[];
  onViewDetail: (o: Oportunidade) => void;
  onRegisterContact: (o: Oportunidade) => void;
  onEdit: (o: Oportunidade) => void;
  onDelete: (o: Oportunidade) => void;
}

export function FollowupTable({ oportunidades, onViewDetail, onRegisterContact, onEdit, onDelete }: Props) {
  const now = new Date();

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Cliente</TableHead>
            <TableHead>Oportunidade</TableHead>
            <TableHead>Nº Proposta</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead className="text-center">Prob.</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Último Contacto</TableHead>
            <TableHead>Próx. Follow-up</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {oportunidades.length === 0 && (
            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma oportunidade encontrada</TableCell></TableRow>
          )}
          {oportunidades.map(o => {
            const faseConfig = FASES_CONFIG[o.fase];
            const overdue = o.proximoFollowupData && new Date(o.proximoFollowupData) < now && !['adjudicado', 'arquivado'].includes(o.fase);
            const isToday = o.proximoFollowupData && new Date(o.proximoFollowupData).toDateString() === now.toDateString();
            return (
              <TableRow key={o.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{o.clienteNome || '—'}</TableCell>
                <TableCell>{o.titulo}</TableCell>
                <TableCell>{o.numeroProposta || '—'}</TableCell>
                <TableCell>
                  <Badge className={faseConfig.bgClass}>{faseConfig.label}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-semibold ${o.probabilidade >= 61 ? 'text-green-600' : o.probabilidade >= 31 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {o.probabilidade}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  €{(o.totalComIva ?? o.valorEstimado ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-sm">
                  {o.dataUltimoContacto ? format(new Date(o.dataUltimoContacto), 'dd/MM/yyyy', { locale: pt }) : '—'}
                </TableCell>
                <TableCell>
                  {o.proximoFollowupData ? (
                    <span className={`text-sm ${overdue ? 'text-red-600 font-bold' : isToday ? 'text-yellow-600 font-semibold' : ''}`}>
                      {overdue && '🔴 '}{isToday && !overdue && '🟡 '}
                      {format(new Date(o.proximoFollowupData), 'dd/MM HH:mm', { locale: pt })}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRegisterContact(o)}><Phone className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDetail(o)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(o)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(o)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
