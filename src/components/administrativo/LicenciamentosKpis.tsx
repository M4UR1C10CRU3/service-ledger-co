import { Card } from '@/components/ui/card';
import { AlertTriangle, Clock, ShieldCheck, FileStack } from 'lucide-react';
import type { DocumentoLegal } from '@/types/administrativo';

/**
 * O painel abre pelo risco, não pela contagem total. Um número de documentos
 * não diz nada; o que interessa é quantos estão vencidos e quantos vencem já.
 *
 * Os documentos de rotina (certidões que se tiram de 30 em 30 dias) ficam de
 * fora destas contas de propósito — se entrassem, o painel estaria sempre
 * vermelho e deixava de significar alguma coisa.
 */
export function LicenciamentosKpis({ documentos }: { documentos: DocumentoLegal[] }) {
  const vivos = documentos.filter(d => !d.arquivado && !d.dispensado);
  const risco = vivos.filter(d => !d.rotina);

  const vencidos = risco.filter(d => d.estado === 'vencido').length;
  const aVencer = risco.filter(d => d.estado === 'a_vencer').length;
  const vigentes = risco.filter(d => d.estado === 'vigente').length;
  const rotina = vivos.filter(d => d.rotina).length;

  const kpis = [
    {
      label: 'Vencidos',
      valor: vencidos,
      icone: AlertTriangle,
      cor: vencidos > 0 ? 'text-red-600' : 'text-muted-foreground',
      fundo: vencidos > 0 ? 'bg-red-50 border-red-200' : '',
      nota: vencidos > 0 ? 'Exigem ação hoje' : 'Nenhum vencido',
    },
    {
      label: 'A vencer',
      valor: aVencer,
      icone: Clock,
      cor: aVencer > 0 ? 'text-amber-600' : 'text-muted-foreground',
      fundo: aVencer > 0 ? 'bg-amber-50 border-amber-200' : '',
      nota: 'Dentro da janela de aviso',
    },
    {
      label: 'Vigentes',
      valor: vigentes,
      icone: ShieldCheck,
      cor: 'text-green-600',
      fundo: '',
      nota: 'Sem prazo próximo',
    },
    {
      label: 'Certidões correntes',
      valor: rotina,
      icone: FileStack,
      cor: 'text-muted-foreground',
      fundo: '',
      nota: 'Renovação de rotina',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map(k => (
        <Card key={k.label} className={`p-4 ${k.fundo}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{k.label}</p>
              <p className={`text-3xl font-bold tabular-nums mt-1 ${k.cor}`}>{k.valor}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{k.nota}</p>
            </div>
            <k.icone className={`h-5 w-5 shrink-0 ${k.cor}`} />
          </div>
        </Card>
      ))}
    </div>
  );
}
