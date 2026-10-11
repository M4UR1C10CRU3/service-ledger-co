import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Trash2, CheckCircle2 } from 'lucide-react';

/**
 * A empresa indica quem vai à formação, depois de a turma estar confirmada.
 *
 * É a segunda metade do pedido. Na primeira, ao pedir orçamento, a empresa só
 * diz QUANTOS — na altura ainda não sabe quem manda. Confirmada a turma e a
 * data, volta aqui e preenche nome e documento de cada colaborador, e é isso
 * que o pedagógico do ITC passa a ver.
 *
 * Cada linha cria um formando da empresa e matricula-o na turma. As regras da
 * base só deixam criar formandos DESTA empresa e matriculá-los NESTA turma —
 * ver as políticas `corp_cria_formandos` e `corp_matricula_na_turma_confirmada`.
 */
export function IndicarFormandos({
  pedidoId, turmaId, clienteId, empresaId, quantos, jaIndicados, onConcluido,
}: {
  pedidoId: string;
  turmaId: string;
  clienteId: string;
  empresaId: string;
  quantos: number;
  jaIndicados: number;
  onConcluido?: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const faltam = Math.max(0, quantos - jaIndicados);

  const [linhas, setLinhas] = useState(
    Array.from({ length: Math.max(1, faltam) }, () => ({ nome: '', cpf: '' })),
  );

  const preenchidas = linhas.filter(l => l.nome.trim());

  const gravar = useMutation({
    mutationFn: async () => {
      if (!preenchidas.length) throw new Error('Preencha pelo menos um nome.');

      const semDocumento = preenchidas.filter(l => !l.cpf.trim());
      if (semDocumento.length) {
        throw new Error(
          `Falta o documento de ${semDocumento.length} formando(s). ` +
          `O documento vai impresso no certificado e não se corrige depois da emissão.`);
      }

      // Cria os formandos. `.select()` obrigatório: uma escrita recusada pelas
      // regras devolve sucesso com zero linhas, e os nomes desapareciam sem
      // ninguém dar por isso.
      const { data: criados, error: e1 } = await (supabase.from('school_alunos') as any)
        .insert(preenchidas.map(l => ({
          empresa_id: empresaId,
          cliente_corp_id: clienteId,
          nome: l.nome.trim(),
          cpf: l.cpf.trim(),
          ativo: true,
        })))
        .select('id');
      if (e1) throw e1;
      if (!criados?.length) throw new Error('Os formandos não foram gravados. Contacte o ITC.');

      const { data: mats, error: e2 } = await (supabase.from('school_matriculas') as any)
        .insert((criados as any[]).map(a => ({
          empresa_id: empresaId,
          aluno_id: a.id,
          turma_id: turmaId,
          status: 'confirmada',
        })))
        .select('id');
      if (e2) throw e2;
      if (!mats?.length) throw new Error('Os formandos foram criados mas não ficaram matriculados. Contacte o ITC.');

      // Pedido dado por concluído só quando o número pedido estiver completo.
      if (jaIndicados + preenchidas.length >= quantos) {
        await (supabase.from('school_pedidos_formacao') as any)
          .update({ estado: 'concluido' }).eq('id', pedidoId);
      }
      return preenchidas.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['portal_corporativo'] });
      qc.invalidateQueries({ queryKey: ['school-pedidos'] });
      toast({ title: `${n} formando(s) indicado(s)` });
      onConcluido?.();
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Não foi possível indicar', description: e.message }),
  });

  if (faltam === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
        <CheckCircle2 className="h-4 w-4" />
        Os {quantos} formandos já estão indicados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
      <div>
        <p className="text-sm font-medium">Indicar formandos</p>
        <p className="text-xs text-muted-foreground">
          {jaIndicados > 0
            ? `Já indicou ${jaIndicados} de ${quantos}. Faltam ${faltam}.`
            : `Pediu formação para ${quantos} colaboradores. Indique quem vai.`}
          {' '}O nome e o documento vão impressos no certificado.
        </p>
      </div>

      {linhas.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_170px_auto] gap-2 items-end">
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">Nome completo</Label>}
            <Input value={l.nome} placeholder="Como vai no certificado"
              onChange={e => setLinhas(p => p.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} />
          </div>
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">Documento (CPF)</Label>}
            <Input value={l.cpf} placeholder="000.000.000-00"
              onChange={e => setLinhas(p => p.map((x, j) => j === i ? { ...x, cpf: e.target.value } : x))} />
          </div>
          <Button variant="ghost" size="icon" title="Remover linha"
            onClick={() => setLinhas(p => p.length > 1 ? p.filter((_, j) => j !== i) : p)}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" size="sm"
          onClick={() => setLinhas(p => [...p, { nome: '', cpf: '' }])}>
          <UserPlus className="h-4 w-4 mr-1.5" />Acrescentar linha
        </Button>
        <Button size="sm" disabled={!preenchidas.length || gravar.isPending}
          onClick={() => gravar.mutate()}>
          {gravar.isPending
            ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />A gravar...</>
            : `Indicar ${preenchidas.length || ''} formando${preenchidas.length === 1 ? '' : 's'}`}
        </Button>
      </div>

      {preenchidas.length > faltam && (
        <p className="text-xs text-amber-600">
          Está a indicar {preenchidas.length} e só faltam {faltam}. O ITC pode ter
          de rever o orçamento.
        </p>
      )}
    </div>
  );
}
