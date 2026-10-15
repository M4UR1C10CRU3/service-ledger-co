import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Award, Trash2, ExternalLink, Plus, AlertTriangle, CheckCircle2, FileText, Loader2, Download, PackageOpen, ShieldCheck, Copy, Check, RefreshCw } from 'lucide-react';
import { useSchoolCertificados, SchoolCertificadoInput } from '@/hooks/useSchoolCertificados';
import { useSchoolAlunos } from '@/hooks/useSchoolAlunos';
import { useSchoolTurmas } from '@/hooks/useSchoolTurmas';
import { useSchoolDocentes } from '@/hooks/useSchoolDocentes';
import { useSchoolCursos } from '@/hooks/useSchoolCursos';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { format, addMonths, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  carregarConfigCertificado,
  produzirPDF,
  instantaneo,
  guardarPDF,
  urlAssinadaPDF,
  gerarCodigoCertificado,
  urlVerificacao,
  calcularValidade,
  type CertConfigEmpresa,
  type FonteCertificado,
} from '@/lib/certificadoEmissao';
import { eDirecaoDefensiva } from '@/lib/generateCertificadoPDF';
import { aproveitamentoDoAluno } from '@/lib/aproveitamentoAluno';
import { qualificacaoParaCertificado } from '@/lib/qualificacaoInstrutor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';

const EMPTY: Omit<SchoolCertificadoInput, 'codigo'> & { sigla?: string } = {
  aluno_id: '', turma_id: '', docente_id: null,
  emitido_em: new Date().toISOString().split('T')[0],
  validade_em: null, url_pdf: null, sigla: '',
};

export default function SchoolCertificados() {
  const [searchParams] = useSearchParams();
  const turmaFiltro = searchParams.get('turma');
  const { certificados, isLoading, emitirCertificado, deleteCertificado } = useSchoolCertificados();
  const { alunos } = useSchoolAlunos();
  const { turmas } = useSchoolTurmas();
  const { docentes } = useSchoolDocentes();
  const { cursos } = useSchoolCursos();
  const { empresa } = useEmpresa();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, turma_id: turmaFiltro ?? '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  // Gerar de novo os PDFs guardados da lista visível (15/10/2026): aplica a versão atual do
  // certificado a certificados já emitidos, com a mesma codificação e data de emissão.
  const [regerarOpen, setRegerarOpen] = useState(false);
  const [regerarProgresso, setRegerarProgresso] = useState<{ feitos: number; total: number; erros: string[] } | null>(null);
  /** Certificado cujo link acabou de ser copiado — confirma que a cópia deu. */
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null);

  // Emissão em lote
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchTurmaId, setBatchTurmaId] = useState(turmaFiltro ?? '');
  const [batchDocenteId, setBatchDocenteId] = useState<string>('');
  const [batchDataEmissao, setBatchDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [batchAlunos, setBatchAlunos] = useState<{ aluno_id: string; nome: string; cpf: string | null }[]>([]);
  const [batchLoadingAlunos, setBatchLoadingAlunos] = useState(false);

  useEffect(() => {
    if (!batchTurmaId) { setBatchAlunos([]); return; }
    setBatchLoadingAlunos(true);
    (supabase as any).from('school_matriculas')
      .select('aluno_id')
      .eq('turma_id', batchTurmaId)
      // A base de dados grava 'concluida'. Pedir 'concluido' devolvia sempre zero
      // e a emissao em lote dizia "nenhum aluno concluido nesta turma".
      .eq('status', 'concluida')
      .then(({ data }: any) => {
        const list = (data || []).map((m: any) => {
          const a = alunos.find(x => x.id === m.aluno_id);
          return { aluno_id: m.aluno_id, nome: a?.nome ?? m.aluno_id, cpf: (a as any)?.cpf ?? null };
        });
        setBatchAlunos(list);
        setBatchLoadingAlunos(false);
      });
  }, [batchTurmaId, alunos]);

  const filtered = useMemo(() => {
    let list = certificados;
    if (turmaFiltro) list = list.filter(c => c.turma_id === turmaFiltro);
    if (search) list = list.filter(c =>
      (c.aluno_nome ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.curso_nome ?? '').toLowerCase().includes(search.toLowerCase()) ||
      c.codigo.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [certificados, search, turmaFiltro]);

  const turmaAtual = turmaFiltro ? turmas.find(t => t.id === turmaFiltro) : null;

  const getCurso = (turmaId: string) => {
    const turma = turmas.find(t => t.id === turmaId);
    return turma ? cursos.find(c => c.id === turma.curso_id) : undefined;
  };

  // Configuração de certificados da empresa (artes, diretor, site de
  // verificação). Lida uma vez; sem ela o PDF sairia sem logótipos.
  const [certConfig, setCertConfig] = useState<CertConfigEmpresa | null>(null);
  useEffect(() => {
    if (!empresa?.id) { setCertConfig(null); return; }
    let cancelado = false;
    carregarConfigCertificado(empresa.id)
      .then(c => { if (!cancelado) setCertConfig(c); })
      .catch(e => toast({ title: 'Erro ao ler a configuração de certificados', description: e.message, variant: 'destructive' }));
    return () => { cancelado = true; };
  }, [empresa?.id]);

  const codigoJaEmitido = (codigo: string) => certificados.some(c => c.codigo === codigo);

  /** Junta aluno, turma, curso e docente numa fonte única para o gerador. */
  const montarFonte = async (
    codigo: string,
    alunoId: string,
    turmaId: string,
    docenteId: string | null,
    emitido_em: string,
    validade_em: string | null,
  ): Promise<FonteCertificado> => {
    if (!empresa) throw new Error('Sem empresa ativa.');
    // Tudo lido da base NO MOMENTO de gerar, e não das listas que a página tem
    // em memória. Um separador aberto há uma hora gerava certificados com a
    // validade e a marca de água que o curso tinha há uma hora — e, ao gravar,
    // escrevia essa versão antiga por cima da boa (15/09/2026, Direção Defensiva).
    const [{ data: turmaBD }, { data: alunoBD }, configFresca] = await Promise.all([
      (supabase.from('school_turmas' as any) as any).select('*').eq('id', turmaId).maybeSingle(),
      (supabase.from('school_alunos' as any) as any).select('*').eq('id', alunoId).maybeSingle(),
      carregarConfigCertificado(empresa.id),
    ]);
    const turma = (turmaBD ?? turmas.find(t => t.id === turmaId)) as typeof turmas[number] | undefined;
    const aluno = (alunoBD ?? alunos.find(a => a.id === alunoId)) as typeof alunos[number] | undefined;
    const config = configFresca ?? certConfig;
    if (!config) throw new Error('Configuração de certificados ainda não carregada.');
    // Cliente do aluno — decide o reconhecimento (Equatorial / Ipiranga / só CEE-AP). Sem cliente na ficha,
    // vale a «empresa de aplicação» da turma; sem nenhum, é aluno particular.
    const clienteId = (aluno as any)?.cliente_corp_id as string | null | undefined;
    const { data: clienteBD } = clienteId
      ? await (supabase.from('school_clientes_corp' as any) as any).select('nome, segmento').eq('id', clienteId).maybeSingle()
      : { data: null };
    const cliente = clienteBD
      ? { nome: clienteBD.nome ?? null, segmento: clienteBD.segmento ?? null }
      : ((turma as any)?.empresa_aplicacao ? { nome: (turma as any).empresa_aplicacao, segmento: null } : null);
    const [{ data: cursoBD }, { data: docenteBD }] = await Promise.all([
      turma?.curso_id ? (supabase.from('school_cursos' as any) as any).select('*').eq('id', turma.curso_id).maybeSingle() : Promise.resolve({ data: null }),
      (docenteId ?? turma?.docente_id) ? (supabase.from('school_docentes' as any) as any).select('*').eq('id', docenteId ?? turma?.docente_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const curso = (cursoBD ?? cursos.find(cu => cu.id === turma?.curso_id)) as typeof cursos[number] | undefined;
    // Sem docente escolhido no certificado, vale o docente da turma.
    const docente = (docenteBD ?? docentes.find(d => d.id === (docenteId ?? turma?.docente_id))) as typeof docentes[number] | undefined;

    if (!curso) throw new Error('A turma não tem curso associado — não é possível emitir.');
    // A validade recalcula-se com o curso acabado de ler: o valor recebido vinha
    // do curso em cache da página. Numa regeneração (Gerar PDF) mantém-se a data
    // já guardada no registo — recalcular mudaria a validade de um documento emitido.
    const validadeFresca = calcularValidade(emitido_em, (curso as any).validade_meses);
    validade_em = codigoJaEmitido(codigo) ? validade_em : (validadeFresca ?? validade_em);

    // Direção Defensiva: o DETRAN exige RENACH e categoria da CNH no certificado.
    // Sem eles o documento sai inválido, por isso não se emite — preenche-se a
    // ficha do aluno e repete-se.
    if (eDirecaoDefensiva(curso.nome)) {
      const falta = [!(aluno as any)?.cnh_renach && 'RENACH', !(aluno as any)?.cnh_categoria && 'categoria da CNH'].filter(Boolean).join(' e ');
      if (falta) throw new Error(`Direção Defensiva: falta ${falta} na ficha de ${aluno?.nome ?? 'aluno'}. Preencha em Gestão de Alunos › Habilitação e volte a emitir.`);
    }

    // Nota e frequência saem de school_avaliacoes e school_frequencia; a
    // qualificação é filtrada pela norma deste curso — de nada serve dizer
    // "Bombeiro Civil" num NR-10.
    const [aproveitamento, qualif] = await Promise.all([
      aproveitamentoDoAluno(alunoId, turmaId),
      qualificacaoParaCertificado(docente?.id ?? null, {
        nome: curso.nome,
        categoria: (curso as any).categoria ?? null,
      }),
    ]);

    return {
      codigo,
      cliente,
      aluno: { nome: aluno?.nome ?? '—', cpf: aluno?.cpf ?? null, cnh_renach: (aluno as any)?.cnh_renach ?? null, cnh_categoria: (aluno as any)?.cnh_categoria ?? null },
      curso: {
        nome: curso.nome,
        categoria: (curso as any).categoria ?? null,
        carga_horaria: curso.carga_horaria,
        horas_teoricas: curso.horas_teoricas,
        horas_praticas: curso.horas_praticas,
        conteudo_programatico: Array.isArray(curso.conteudo_programatico) ? curso.conteudo_programatico : [],
        objetivo: (curso as any).objetivo ?? null,
        metodologia: (curso as any).metodologia ?? null,
        reconhecimento: (curso as any).reconhecimento ?? null,
        aprovacao_minima: (curso as any).aprovacao_minima ?? null,
        validade_meses: curso.validade_meses,
        template_cert_path: (curso as any).template_cert_path ?? null,
      },
      docente: docente
        ? {
            nome: docente.nome,
            assinatura_path: (docente as any).assinatura_path ?? null,
            // Só o que credencia a norma deste curso. Vazio quando nada
            // credencia — aí o certificado imprime o nome sozinho.
            qualificacao: qualif.linha,
          }
        : null,
      turma: turma
        ? {
            inicio: turma.inicio,
            fim: turma.fim,
            empresa_aplicacao: (turma as any).empresa_aplicacao ?? null,
            local: (turma as any).local ?? null,
            tipo_treinamento: (turma as any).tipo_treinamento ?? null,
          }
        : null,
      aproveitamento: { nota: aproveitamento.nota, frequencia: aproveitamento.frequencia },
      emitido_em,
      validade_em,
      config,
    };
  };

  const handleEmitir = async () => {
    if (!form.aluno_id || !form.turma_id || !empresa) return;
    setFormOpen(false);
    try {
      const curso = getCurso(form.turma_id);
      let validade_em = calcularValidade(form.emitido_em, curso?.validade_meses) ?? form.validade_em;

      // A ordem importa: só reservamos codificação depois de sabermos que
      // conseguimos montar o certificado, para não queimar códigos.
      const { codigo } = await gerarCodigoCertificado(empresa.id);
      const fonte = await montarFonte(codigo, form.aluno_id, form.turma_id, form.docente_id, form.emitido_em, validade_em);
      validade_em = fonte.validade_em ?? validade_em;
      const { blob, dados } = await produzirPDF(fonte);

      await emitirCertificado.mutateAsync({
        aluno_id: form.aluno_id,
        turma_id: form.turma_id,
        docente_id: form.docente_id,
        emitido_em: form.emitido_em,
        validade_em,
        url_pdf: null,
        codigo,
        pdfBlob: blob,
        snapshot: instantaneo(fonte, dados),
      } as any);

      descarregar(blob, `${codigo}.pdf`);
    } catch (e: any) {
      toast({ title: 'Erro ao emitir', description: e.message, variant: 'destructive' });
    }
  };

  const descarregar = (blob: Blob, nome: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome; a.click();
    URL.revokeObjectURL(url);
  };

  /** Regera o PDF de um certificado já emitido, mantendo a mesma codificação. */
  const handleGerarPDF = async (cert: typeof certificados[0]) => {
    if (!empresa) return;
    setGeneratingPdf(cert.id);
    try {
      const fonte = await montarFonte(cert.codigo, cert.aluno_id, cert.turma_id, cert.docente_id, cert.emitido_em, cert.validade_em);
      const { blob } = await produzirPDF(fonte);
      const path = await guardarPDF(empresa.id, cert.codigo, blob);
      const { data, error } = await (supabase as any)
        .from('school_certificados').update({ url_pdf: path }).eq('id', cert.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Não foi possível atualizar o certificado.');
      descarregar(blob, `${cert.codigo}.pdf`);
      toast({ title: 'PDF gerado', description: cert.codigo });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingPdf(null);
    }
  };

  /** Gera de novo, um a um, os PDFs dos certificados da lista visível (sem descarregar). */
  const handleRegerarLista = async () => {
    if (!empresa) return;
    const lista = [...filtered];
    const erros: string[] = [];
    setRegerarProgresso({ feitos: 0, total: lista.length, erros });
    for (let i = 0; i < lista.length; i++) {
      const cert = lista[i];
      try {
        const fonte = await montarFonte(cert.codigo, cert.aluno_id, cert.turma_id, cert.docente_id, cert.emitido_em, cert.validade_em);
        const { blob } = await produzirPDF(fonte);
        const path = await guardarPDF(empresa.id, cert.codigo, blob);
        const { data, error } = await (supabase as any)
          .from('school_certificados').update({ url_pdf: path }).eq('id', cert.id).select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('sem permissão para atualizar');
      } catch (e: any) {
        erros.push(`${cert.codigo}: ${e?.message ?? e}`);
      }
      setRegerarProgresso({ feitos: i + 1, total: lista.length, erros: [...erros] });
    }
    toast({
      title: erros.length ? `PDFs gerados de novo, com ${erros.length} erro(s)` : 'PDFs gerados de novo',
      description: `${lista.length - erros.length} de ${lista.length} certificados atualizados.`,
      variant: erros.length ? 'destructive' : undefined,
    });
  };

  /** Abre o PDF guardado. O bucket é privado, logo precisa de URL assinada. */
  const handleAbrirPDF = async (cert: typeof certificados[0]) => {
    if (!cert.url_pdf) return;
    try {
      const url = await urlAssinadaPDF(cert.url_pdf);
      if (url) window.open(url, '_blank', 'noopener');
      else toast({ title: 'PDF indisponível', description: 'O ficheiro não foi encontrado no arquivo.', variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'Erro ao abrir o PDF', description: e.message, variant: 'destructive' });
    }
  };

  const handleEmissaoEmLote = async () => {
    if (!batchTurmaId) return;

    const turma = turmas.find(t => t.id === batchTurmaId);
    const curso = cursos.find(c => c.id === turma?.curso_id);
    const validadeMeses = curso?.validade_meses ?? 24;

    // Alunos da turma (via matrículas) — buscar certificados existentes para não duplicar
    const { data: matriculas } = await (supabase as any)
      .from('school_matriculas')
      .select('aluno_id')
      .eq('turma_id', batchTurmaId)
      .eq('status', 'concluida');

    if (!matriculas?.length) {
      toast({ title: 'Nenhum aluno concluído nesta turma', variant: 'destructive' });
      return;
    }

    const jaEmitidos = new Set(
      certificados.filter(c => c.turma_id === batchTurmaId).map(c => c.aluno_id)
    );
    const pendentes = matriculas.filter((m: any) => !jaEmitidos.has(m.aluno_id));

    if (!pendentes.length) {
      toast({ title: 'Todos os alunos já têm certificado nesta turma' });
      return;
    }

    const zip = new JSZip();
    setBatchProgress({ done: 0, total: pendentes.length, label: 'A preparar...' });
    const falhas: string[] = [];

    for (let i = 0; i < pendentes.length; i++) {
      const alunoId = pendentes[i].aluno_id;
      const aluno = alunos.find(a => a.id === alunoId);
      const nomeAluno = aluno?.nome ?? alunoId;

      setBatchProgress({ done: i, total: pendentes.length, label: nomeAluno });

      try {
        const emitido_em = batchDataEmissao;
        let validade_em = calcularValidade(emitido_em, validadeMeses);

        // Mesmo caminho da emissão individual — um só sítio a decidir o que
        // vai impresso, para os dois modos não voltarem a divergir.
        const { codigo } = await gerarCodigoCertificado(empresa!.id);
        const fonte = await montarFonte(codigo, alunoId, batchTurmaId, batchDocenteId || null, emitido_em, validade_em);
        validade_em = fonte.validade_em ?? validade_em;
        const { blob, dados } = await produzirPDF(fonte);
        const path = await guardarPDF(empresa!.id, codigo, blob);

        const { data: novoCert, error: insertErr } = await (supabase as any)
          .from('school_certificados')
          .insert({
            empresa_id: empresa!.id,
            aluno_id: alunoId,
            turma_id: batchTurmaId,
            docente_id: batchDocenteId || null,
            codigo,
            emitido_em,
            validade_em,
            url_pdf: path,
            ...instantaneo(fonte, dados),
          })
          .select('id');

        if (insertErr) throw insertErr;
        if (!novoCert?.length) throw new Error('gravação sem linhas devolvidas');

        const arrayBuf = await blob.arrayBuffer();
        zip.file(`${codigo}_${nomeAluno.replace(/\s+/g, '_')}.pdf`, arrayBuf);
      } catch (e: any) {
        // Um aluno que falhe não trava os restantes, mas fica registado — antes
        // desaparecia em silêncio e o lote dizia-se completo.
        console.error('Erro ao gerar cert para', alunoId, e);
        falhas.push(`${nomeAluno}: ${e?.message ?? 'erro desconhecido'}`);
      }
    }

    const emitidos = pendentes.length - falhas.length;

    // Nenhum emitido: não se descarrega um ZIP vazio nem se anuncia «concluída»
    // — era o que acontecia, e o aviso de erro ficava tapado pelo de sucesso.
    if (!emitidos) {
      setBatchProgress(null);
      toast({
        title: `Nenhum certificado emitido (${falhas.length} falharam)`,
        description: falhas.slice(0, 3).join(' · '),
        variant: 'destructive',
      });
      return;
    }

    setBatchProgress({ done: pendentes.length, total: pendentes.length, label: 'A gerar ZIP...' });

    // Gerar e descarregar ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `certificados_${turma?.titulo?.replace(/\s+/g, '_') ?? batchTurmaId}.zip`;
    a.click();
    URL.revokeObjectURL(zipUrl);

    setBatchProgress(null);
    setBatchOpen(false);
    if (falhas.length) {
      toast({
        title: `${emitidos} emitidos · ${falhas.length} falharam`,
        description: falhas.slice(0, 3).join(' · '),
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Emissão em lote concluída', description: `${emitidos} certificado(s) gerado(s)` });
    }
  };

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try {
      const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
      if (isNaN(dt.getTime())) return '—';
      return format(dt, 'dd/MM/yyyy', { locale: pt });
    } catch { return '—'; }
  };

  const vencimentoBadge = (validade: string | null) => {
    if (!validade) return null;
    const dt = new Date(validade + 'T23:59:59');
    if (isNaN(dt.getTime())) return null;
    const vencido = isPast(dt);
    return vencido
      ? <Badge variant="outline" className="border-red-500/40 text-red-600 bg-red-500/10 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>
      : <Badge variant="outline" className="border-green-500/40 text-green-600 bg-green-500/10 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Válido</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Certificados{turmaAtual ? ` — ${turmaAtual.titulo}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} certificado{filtered.length !== 1 ? 's' : ''} emitido{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Validar um certificado qualquer, pelo código.
              Abre a MESMA página pública que uma empresa contratante ou um
              auditor usa — de propósito. A secretaria vê exatamente o que o
              outro lado vê, em vez de um ecrã interno que diz "válido" com
              base noutra coisa. */}
          <Button variant="outline" asChild>
            <a href="/verificar" target="_blank" rel="noreferrer"
               title="Confirmar a autenticidade de um certificado pelo código">
              <ShieldCheck className="h-4 w-4 mr-2" />Validar Certificado
            </a>
          </Button>
          <Button variant="outline" onClick={() => { setRegerarProgresso(null); setRegerarOpen(true); }} disabled={filtered.length === 0}
                  title="Gerar de novo os PDFs da lista visível com a versão atual do certificado">
            <RefreshCw className="h-4 w-4 mr-2" />Gerar PDFs de novo
          </Button>
          <Button variant="outline" onClick={() => { setBatchTurmaId(turmaFiltro ?? ''); setBatchOpen(true); }}>
            <PackageOpen className="h-4 w-4 mr-2" />Emissão em Lote
          </Button>
          <Button onClick={() => { setForm({ ...EMPTY, turma_id: turmaFiltro ?? '' }); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Emitir Certificado
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Aluno, curso, código..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Emitido em</TableHead>
                <TableHead>Válido até</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Verificação online</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhum certificado encontrado' : 'Nenhum certificado emitido'}
                </TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{c.codigo}</code></TableCell>
                  <TableCell className="font-medium">{c.aluno_nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.curso_nome}</TableCell>
                  <TableCell className="text-sm">{fmtDate(c.emitido_em)}</TableCell>
                  <TableCell className="text-sm">{fmtDate(c.validade_em)}</TableCell>
                  <TableCell>{vencimentoBadge(c.validade_em)}</TableCell>

                  {/* Verificação online.
                      É a coluna que a secretaria mais usa e estava reduzida a
                      um ícone igual aos outros quatro — ninguém a encontrava.
                      O botão diz o que faz, e o link fica à vista para se poder
                      copiar e enviar a quem peça prova: a empresa que pagou a
                      formação, um auditor, um fiscal.

                      O botão abre no ambiente onde se está — serve para a
                      secretaria conferir onde está a trabalhar. O que se copia
                      é sempre o endereço público definitivo, porque esse vai
                      sair daqui para fora. */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-8" asChild>
                        <a href={`/verificar/${encodeURIComponent(c.codigo)}`} target="_blank" rel="noreferrer"
                           title="Abrir a página pública de autenticidade">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Verificar
                        </a>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        title={`Copiar ${urlVerificacao(c.codigo, (empresa as any)?.cert_url_verificacao)}`}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(urlVerificacao(c.codigo, (empresa as any)?.cert_url_verificacao));
                            setLinkCopiado(c.id);
                            setTimeout(() => setLinkCopiado(l => (l === c.id ? null : l)), 2000);
                            toast({ title: 'Link copiado', description: urlVerificacao(c.codigo, (empresa as any)?.cert_url_verificacao) });
                          } catch {
                            toast({ title: 'Não foi possível copiar', variant: 'destructive' });
                          }
                        }}>
                        {linkCopiado === c.id
                          ? <Check className="h-3.5 w-3.5 text-green-600" />
                          : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Gerar PDF" onClick={() => handleGerarPDF(c)} disabled={generatingPdf === c.id}>
                        {generatingPdf === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      </Button>
                      {c.url_pdf && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver PDF" onClick={() => handleAbrirPDF(c)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog — Emitir individual */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Emitir Certificado</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Aluno *</Label>
              <Select value={form.aluno_id} onValueChange={v => setForm(p => ({ ...p, aluno_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar aluno" /></SelectTrigger>
                <SelectContent>{alunos.filter(a => a.ativo).map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Turma *</Label>
              <Select value={form.turma_id} onValueChange={v => setForm(p => ({ ...p, turma_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar turma" /></SelectTrigger>
                <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Instrutor Responsável</Label>
              <Select value={form.docente_id ?? ''} onValueChange={v => setForm(p => ({ ...p, docente_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar instrutor" /></SelectTrigger>
                <SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data de Emissão</Label>
              <Input type="date" value={form.emitido_em} onChange={e => setForm(p => ({ ...p, emitido_em: e.target.value }))} />
            </div>
            {form.turma_id && !getCurso(form.turma_id)?.validade_meses && (
              <div className="space-y-1">
                <Label>Válido até (manual)</Label>
                <Input type="date" value={form.validade_em ?? ''} onChange={e => setForm(p => ({ ...p, validade_em: e.target.value || null }))} />
              </div>
            )}
            {form.turma_id && getCurso(form.turma_id)?.validade_meses && (
              <p className="text-xs text-muted-foreground">
                Validade calculada automaticamente: {getCurso(form.turma_id)!.validade_meses} meses a partir da emissão.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleEmitir} disabled={!form.aluno_id || !form.turma_id || emitirCertificado.isPending}>
              <Award className="h-4 w-4 mr-2" />Emitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Emissão em Lote */}
      <Dialog open={batchOpen} onOpenChange={o => { if (!batchProgress) setBatchOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Emissão em Lote de Certificados</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">

            {/* Selecção de turma */}
            <div className="space-y-1">
              <Label>Seleccionar Turma *</Label>
              <Select value={batchTurmaId || '__none__'} onValueChange={v => setBatchTurmaId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar turma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Seleccionar —</SelectItem>
                  {turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Info da turma seleccionada */}
            {batchTurmaId && (() => {
              const t = turmas.find(x => x.id === batchTurmaId);
              const docente = docentes.find(d => d.id === (batchDocenteId || t?.docente_id));
              return t ? (
                <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm space-y-1">
                  <p><strong>Turma:</strong> {t.titulo}</p>
                  {(t.inicio || t.fim) && <p><strong>Período:</strong> {fmtDate(t.inicio)}{t.fim ? ` a ${fmtDate(t.fim)}` : ''}</p>}
                  {docente && <p><strong>Instrutor:</strong> {docente.nome}</p>}
                </div>
              ) : null;
            })()}

            {/* Data de emissão */}
            <div className="space-y-1">
              <Label>Data de Emissão</Label>
              <Input type="date" value={batchDataEmissao} onChange={e => setBatchDataEmissao(e.target.value)} />
            </div>

            {/* Lista de alunos */}
            {batchTurmaId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Alunos da Turma ({batchAlunos.length})</Label>
                  {batchAlunos.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {batchAlunos.filter(a => !certificados.some(c => c.turma_id === batchTurmaId && c.aluno_id === a.aluno_id)).length} certificados serão gerados
                    </span>
                  )}
                </div>
                {batchLoadingAlunos ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />A carregar alunos...
                  </div>
                ) : batchAlunos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum aluno com status <strong>concluído</strong> nesta turma.</p>
                ) : (
                  <div className="rounded-md border divide-y max-h-52 overflow-y-auto">
                    {batchAlunos.map(a => {
                      const jaTem = certificados.some(c => c.turma_id === batchTurmaId && c.aluno_id === a.aluno_id);
                      return (
                        <div key={a.aluno_id} className={`flex items-center justify-between px-3 py-2 text-sm ${jaTem ? 'opacity-40' : ''}`}>
                          <span className="font-medium">{a.nome}</span>
                          <span className="text-muted-foreground text-xs">{a.cpf ? `CPF: ${a.cpf}` : jaTem ? 'já emitido' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Progresso */}
            {batchProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{batchProgress.label}</span>
                  <span>{batchProgress.done}/{batchProgress.total}</span>
                </div>
                <Progress value={(batchProgress.done / batchProgress.total) * 100} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)} disabled={!!batchProgress}>Cancelar</Button>
            <Button onClick={handleEmissaoEmLote} disabled={!batchTurmaId || batchLoadingAlunos || batchAlunos.filter(a => !certificados.some(c => c.turma_id === batchTurmaId && c.aluno_id === a.aluno_id)).length === 0 || !!batchProgress}>
              {batchProgress
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...</>
                : <><Download className="h-4 w-4 mr-2" />Emitir {batchAlunos.filter(a => !certificados.some(c => c.turma_id === batchTurmaId && c.aluno_id === a.aluno_id)).length} Certificado{batchAlunos.filter(a => !certificados.some(c => c.turma_id === batchTurmaId && c.aluno_id === a.aluno_id)).length !== 1 ? 's' : ''}</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar remoção */}
      <AlertDialog open={regerarOpen} onOpenChange={o => { if (!o && regerarProgresso && regerarProgresso.feitos < regerarProgresso.total) return; setRegerarOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar de novo {filtered.length} PDF{filtered.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os certificados da lista visível são gerados de novo com a versão atual (logótipos, conteúdo
              programático e rodapé). A codificação, a data de emissão e o QR code não mudam. Para escolher
              só alguns, filtre a lista antes (pesquisa ou turma).
            </AlertDialogDescription>
          </AlertDialogHeader>
          {regerarProgresso && (
            <div className="space-y-2">
              <Progress value={(regerarProgresso.feitos / Math.max(regerarProgresso.total, 1)) * 100} />
              <p className="text-sm text-muted-foreground">{regerarProgresso.feitos} de {regerarProgresso.total}</p>
              {regerarProgresso.erros.length > 0 && (
                <div className="max-h-32 overflow-auto text-xs text-destructive">
                  {regerarProgresso.erros.map(e => <div key={e}>{e}</div>)}
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            {regerarProgresso && regerarProgresso.feitos === regerarProgresso.total ? (
              <AlertDialogAction onClick={() => setRegerarOpen(false)}>Fechar</AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel disabled={!!regerarProgresso}>Cancelar</AlertDialogCancel>
                <Button onClick={handleRegerarLista} disabled={!!regerarProgresso}>
                  {regerarProgresso ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Gerar de novo
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover certificado?</AlertDialogTitle>
            <AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteCertificado.mutate(deleteId); setDeleteId(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
