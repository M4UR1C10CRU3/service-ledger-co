import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarCheck, ClipboardList, Loader2, Save, Plus, Users } from 'lucide-react';

/**
 * Chamada e notas de uma turma.
 *
 * É o que faltava para o ciclo fechar: sem isto o certificado imprime
 * "aprovação mínima 70%" sem que nada verifique esses 70%, e o portal do aluno
 * mostra secções de assiduidade e avaliação permanentemente vazias.
 *
 * O mesmo ecrã serve a secretaria e o instrutor — as regras da base de dados é
 * que decidem quem pode escrever onde, não o ecrã.
 */
export function LancamentoTurma({ turmaId }: { turmaId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const [dataAula, setDataAula] = useState(hoje);
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});
  const [novaAval, setNovaAval] = useState({ tipo: 'prova', descricao: '', nota_maxima: '20', data: hoje });
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [avalSelecionada, setAvalSelecionada] = useState<string>('');

  // ── Alunos da turma ────────────────────────────────────────────────────────
  const { data: turma } = useQuery({
    queryKey: ['lancamento_turma', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data: t } = await (supabase as any)
        .from('school_turmas').select('id, empresa_id, titulo').eq('id', turmaId).maybeSingle();

      const { data: mats } = await (supabase as any)
        .from('school_matriculas')
        .select('id, aluno_id, status').eq('turma_id', turmaId);

      const ids = (mats ?? []).map((m: any) => m.aluno_id);
      let nomes: Record<string, string> = {};
      if (ids.length) {
        const { data: als } = await (supabase as any)
          .from('school_alunos').select('id, nome').in('id', ids);
        nomes = Object.fromEntries((als ?? []).map((a: any) => [a.id, a.nome]));
      }

      return {
        ...t,
        matriculas: (mats ?? [])
          .map((m: any) => ({ ...m, nome: nomes[m.aluno_id] ?? '—' }))
          .sort((a: any, b: any) => a.nome.localeCompare(b.nome)),
      };
    },
  });

  // ── Presenças já lançadas na data escolhida ────────────────────────────────
  const { data: frequenciaDoDia = [] } = useQuery({
    queryKey: ['frequencia_dia', turmaId, dataAula],
    enabled: !!turma?.matriculas?.length,
    queryFn: async () => {
      const ids = turma!.matriculas.map((m: any) => m.id);
      const { data } = await (supabase as any)
        .from('school_frequencia')
        .select('id, matricula_id, presente').in('matricula_id', ids).eq('data_aula', dataAula);
      const registos = data ?? [];
      // Pré-preenche as caixas com o que já está gravado.
      setPresencas(Object.fromEntries(registos.map((r: any) => [r.matricula_id, r.presente])));
      return registos;
    },
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes_turma', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('school_avaliacoes')
        .select('id, matricula_id, tipo, descricao, nota, nota_maxima, data_avaliacao')
        .eq('turma_id', turmaId).order('data_avaliacao', { ascending: false });
      return data ?? [];
    },
  });

  // Avaliações agrupadas: uma "prova" é uma linha por aluno com a mesma
  // descrição e data. Agrupamos para o instrutor lançar a turma toda de uma vez.
  const provas = Array.from(
    new Map(
      (avaliacoes as any[]).map(a => [
        `${a.descricao ?? a.tipo}|${a.data_avaliacao}`,
        { chave: `${a.descricao ?? a.tipo}|${a.data_avaliacao}`, descricao: a.descricao ?? a.tipo, data: a.data_avaliacao, nota_maxima: a.nota_maxima },
      ])
    ).values()
  );

  // ── Gravar presenças ───────────────────────────────────────────────────────
  const gravarPresencas = useMutation({
    mutationFn: async () => {
      if (!turma) return;
      const linhas = turma.matriculas.map((m: any) => ({
        empresa_id: turma.empresa_id,
        matricula_id: m.id,
        data_aula: dataAula,
        presente: presencas[m.id] ?? false,
      }));
      // O índice único (matricula, data) faz do upsert a operação certa:
      // relançar a chamada do mesmo dia corrige, não duplica.
      const { data, error } = await (supabase as any)
        .from('school_frequencia')
        .upsert(linhas, { onConflict: 'matricula_id,data_aula' })
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Nada foi gravado — sem permissão sobre esta turma.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frequencia_dia', turmaId] });
      qc.invalidateQueries({ queryKey: ['portal_aluno'] });
      toast({ title: 'Chamada gravada', description: `${dataAula.split('-').reverse().join('/')}` });
    },
    onError: (e: Error) => toast({ title: 'Erro ao gravar a chamada', description: e.message, variant: 'destructive' }),
  });

  // ── Criar avaliação para a turma ───────────────────────────────────────────
  const criarAvaliacao = useMutation({
    mutationFn: async () => {
      if (!turma) return;
      const linhas = turma.matriculas.map((m: any) => ({
        empresa_id: turma.empresa_id,
        turma_id: turmaId,
        matricula_id: m.id,
        tipo: novaAval.tipo,
        descricao: novaAval.descricao.trim() || null,
        nota_maxima: Number(novaAval.nota_maxima) || 20,
        data_avaliacao: novaAval.data,
        nota: null,
      }));
      const { data, error } = await (supabase as any)
        .from('school_avaliacoes').insert(linhas).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Nada foi gravado — sem permissão sobre esta turma.');
    },
    onSuccess: () => {
      setNovaAval({ tipo: 'prova', descricao: '', nota_maxima: '20', data: hoje });
      qc.invalidateQueries({ queryKey: ['avaliacoes_turma', turmaId] });
      toast({ title: 'Avaliação criada', description: 'Agora pode lançar as notas.' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao criar a avaliação', description: e.message, variant: 'destructive' }),
  });

  // ── Gravar notas de uma avaliação ──────────────────────────────────────────
  const gravarNotas = useMutation({
    mutationFn: async () => {
      const alvo = (avaliacoes as any[]).filter(
        a => `${a.descricao ?? a.tipo}|${a.data_avaliacao}` === avalSelecionada
      );
      for (const a of alvo) {
        const valor = notas[a.matricula_id];
        if (valor === undefined || valor === '') continue;
        const { error } = await (supabase as any)
          .from('school_avaliacoes').update({ nota: Number(valor) }).eq('id', a.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avaliacoes_turma', turmaId] });
      qc.invalidateQueries({ queryKey: ['portal_aluno'] });
      toast({ title: 'Notas gravadas' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao gravar as notas', description: e.message, variant: 'destructive' }),
  });

  if (!turma) {
    return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;
  }

  if (!turma.matriculas.length) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Esta turma ainda não tem alunos matriculados.</p>
      </div>
    );
  }

  const notasDaProva = (avaliacoes as any[]).filter(
    a => `${a.descricao ?? a.tipo}|${a.data_avaliacao}` === avalSelecionada
  );

  return (
    <Tabs defaultValue="presencas" className="mt-2">
      <TabsList>
        <TabsTrigger value="presencas"><CalendarCheck className="h-4 w-4 mr-1.5" />Chamada</TabsTrigger>
        <TabsTrigger value="notas"><ClipboardList className="h-4 w-4 mr-1.5" />Avaliações</TabsTrigger>
      </TabsList>

      {/* ── Chamada ──────────────────────────────────────────────────────── */}
      <TabsContent value="presencas" className="space-y-4 mt-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Data da aula</Label>
            <Input type="date" value={dataAula} onChange={e => setDataAula(e.target.value)} className="w-44" />
          </div>
          <Button variant="outline" size="sm"
            onClick={() => setPresencas(Object.fromEntries(turma.matriculas.map((m: any) => [m.id, true])))}>
            Marcar todos presentes
          </Button>
          {frequenciaDoDia.length > 0 && (
            <Badge variant="outline" className="border-blue-500/40 text-blue-600 bg-blue-500/10">
              Chamada já lançada neste dia — vai ser corrigida
            </Badge>
          )}
        </div>

        <div className="rounded border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead className="w-32 text-center">Presente</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {turma.matriculas.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={presencas[m.id] ?? false}
                      onCheckedChange={v => setPresencas(p => ({ ...p, [m.id]: !!v }))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button onClick={() => gravarPresencas.mutate()} disabled={gravarPresencas.isPending}>
          {gravarPresencas.isPending
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gravar...</>
            : <><Save className="h-4 w-4 mr-2" />Gravar chamada</>}
        </Button>
      </TabsContent>

      {/* ── Avaliações ───────────────────────────────────────────────────── */}
      <TabsContent value="notas" className="space-y-5 mt-4">
        <div className="rounded border p-4 space-y-3">
          <p className="text-sm font-medium">Nova avaliação</p>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={novaAval.tipo} onValueChange={v => setNovaAval(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prova">Prova teórica</SelectItem>
                  <SelectItem value="pratica">Avaliação prática</SelectItem>
                  <SelectItem value="trabalho">Trabalho</SelectItem>
                  <SelectItem value="final">Nota final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Descrição</Label>
              <Input value={novaAval.descricao} placeholder="ex: Prova NR 35 — módulo 1"
                onChange={e => setNovaAval(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nota máxima</Label>
              <Input type="number" value={novaAval.nota_maxima}
                onChange={e => setNovaAval(p => ({ ...p, nota_maxima: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={novaAval.data}
                onChange={e => setNovaAval(p => ({ ...p, data: e.target.value }))} />
            </div>
          </div>
          <Button size="sm" onClick={() => criarAvaliacao.mutate()} disabled={criarAvaliacao.isPending}>
            <Plus className="h-4 w-4 mr-2" />Criar para toda a turma
          </Button>
        </div>

        {provas.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-1 max-w-sm">
              <Label className="text-xs">Lançar notas de</Label>
              <Select value={avalSelecionada} onValueChange={setAvalSelecionada}>
                <SelectTrigger><SelectValue placeholder="Escolha a avaliação" /></SelectTrigger>
                <SelectContent>
                  {provas.map(p => (
                    <SelectItem key={p.chave} value={p.chave}>
                      {p.descricao} — {p.data?.split('-').reverse().join('/')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {avalSelecionada && (
              <>
                <div className="rounded border">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="w-40">Nota</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {notasDaProva.map((a: any) => {
                        const m = turma.matriculas.find((x: any) => x.id === a.matricula_id);
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{m?.nome ?? '—'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number" step="0.1" className="w-24"
                                  value={notas[a.matricula_id] ?? (a.nota ?? '')}
                                  onChange={e => setNotas(p => ({ ...p, [a.matricula_id]: e.target.value }))}
                                />
                                <span className="text-sm text-muted-foreground">/ {a.nota_maxima}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <Button onClick={() => gravarNotas.mutate()} disabled={gravarNotas.isPending}>
                  {gravarNotas.isPending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gravar...</>
                    : <><Save className="h-4 w-4 mr-2" />Gravar notas</>}
                </Button>
              </>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
