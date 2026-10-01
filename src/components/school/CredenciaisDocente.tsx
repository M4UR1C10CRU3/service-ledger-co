import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, X, IdCard, GraduationCap, Award, Upload, Loader2, FileUser } from 'lucide-react';
import { FicheiroMiniatura, FicheiroPreviewDialog } from '@/components/ficheiros/FicheiroPreview';
import { GrelhaDocumentos, type DocumentoParaGrelha } from '@/components/ficheiros/GrelhaDocumentos';
import type { SchoolDocumentoDocente } from '@/hooks/useSchoolDocentes';

/**
 * Credenciais do instrutor, em três secções.
 *
 * A divisão é do utilizador e tem uma razão prática por trás: quem confere um
 * instrutor procura coisas diferentes em cada uma.
 *
 *   · REGISTOS PROFISSIONAIS — o número tem de estar legível, porque é por ele
 *     que se confirma no conselho. A carteira digitalizada prova-o.
 *   · FORMAÇÃO ACADÉMICA — a formação e o diploma que a sustenta.
 *   · FORMAÇÕES COMPLEMENTARES — só miniaturas. Alguns instrutores têm dezenas
 *     de cursos; descrevê-los um a um seria repetir o que o resumo profissional
 *     já diz, e ninguém leria. O que importa é poder ver.
 *
 * As duas primeiras são a MESMA linha vista de dois ângulos: "Técnico em
 * Enfermagem" é a formação, "COREN-AP 12345" é o registo dela. Por isso não há
 * duas tabelas — há dois documentos ligados à mesma entrada.
 */

const NORMAS_POSSIVEIS: string[] = [
  ...Array.from({ length: 38 }, (_, i) => `NR-${String(i + 1).padStart(2, '0')}`),
  'NR-10-SEP', 'DIRECAO-DEFENSIVA', 'PRIMEIROS-SOCORROS',
].sort();

function codigoDe(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

interface Formacao { id: string; nome: string; sigla: string | null; conselho: string | null }

interface Credencial {
  id: string;
  formacao_id: string;
  registo: string | null;
  formacao: Formacao | null;
  normas: string[];
}

export function CredenciaisDocente({
  docenteId,
  documentos,
  urlDoFicheiro,
  urlsDosFicheiros,
  onCarregarDocumento,
  onRemoverDocumento,
  aRecarregarDocumentos,
}: {
  docenteId: string;
  documentos: SchoolDocumentoDocente[];
  urlDoFicheiro: (path: string) => Promise<string | null>;
  /** Assina vários de uma vez — decisivo em fichas com dezenas de ficheiros. */
  urlsDosFicheiros?: (paths: string[]) => Promise<Record<string, string>>;
  onCarregarDocumento: (
    ficheiro: File,
    tipo: string,
    extra: { docente_formacao_id?: string | null; papel?: string | null },
  ) => Promise<boolean>;
  onRemoverDocumento: (doc: SchoolDocumentoDocente) => void;
  aRecarregarDocumentos: () => void;
}) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();

  const [catalogo, setCatalogo] = useState<Formacao[]>([]);
  const [normasPorFormacao, setNormasPorFormacao] = useState<Record<string, string[]>>({});
  const [credenciais, setCredenciais] = useState<Credencial[]>([]);
  const [escolhida, setEscolhida] = useState('');
  const [registo, setRegisto] = useState('');
  const [aGravar, setAGravar] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [aEnviar, setAEnviar] = useState<string | null>(null);
  const [aPrever, setAPrever] = useState<SchoolDocumentoDocente | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const [aCriar, setACriar] = useState(false);
  const [nova, setNova] = useState({ nome: '', sigla: '', conselho: '' });
  const [normasNovas, setNormasNovas] = useState<string[]>([]);

  // ── Catálogo ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [{ data: fs }, { data: mapa }] = await Promise.all([
        (supabase.from('school_formacoes' as any) as any)
          .select('id, nome, sigla, conselho').eq('ativo', true).order('ordem'),
        (supabase.from('school_formacao_normas' as any) as any).select('formacao_id, norma'),
      ]);
      if (!vivo) return;
      setCatalogo((fs ?? []) as Formacao[]);
      const ag: Record<string, string[]> = {};
      for (const m of (mapa ?? []) as any[]) (ag[m.formacao_id] ??= []).push(m.norma);
      setNormasPorFormacao(ag);
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!docenteId) return;
    let vivo = true;
    (async () => {
      const { data } = await (supabase.from('school_docente_formacoes' as any) as any)
        .select('id, formacao_id, registo, school_formacoes(id, nome, sigla, conselho)')
        .eq('docente_id', docenteId);
      if (!vivo) return;
      setCredenciais((data ?? []).map((l: any) => ({
        id: l.id, formacao_id: l.formacao_id, registo: l.registo,
        formacao: l.school_formacoes ?? null,
        normas: normasPorFormacao[l.formacao_id] ?? [],
      })));
    })();
    return () => { vivo = false; };
  }, [docenteId, recarga, normasPorFormacao]);

  // URLs assinados dos documentos ligados a credenciais — os soltos vão pela
  // grelha, que trata dos seus.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const ligados = documentos.filter(d => d.docente_formacao_id);
      if (ligados.length === 0) { setUrls({}); return; }

      // Em lote, quando quem chama sabe faze-lo — um pedido em vez de um por
      // carteira e por diploma.
      if (urlsDosFicheiros) {
        const mapa = await urlsDosFicheiros(ligados.map(d => d.storage_path));
        if (!vivo) return;
        setUrls(Object.fromEntries(
          ligados.map(d => [d.id, mapa[d.storage_path]] as const)
            .filter(([, u]) => u) as [string, string][],
        ));
        return;
      }

      const pares = await Promise.all(
        ligados.map(async d => [d.id, await urlDoFicheiro(d.storage_path)] as const),
      );
      if (vivo) setUrls(Object.fromEntries(pares.filter(([, u]) => u) as [string, string][]));
    })();
    return () => { vivo = false; };
  }, [documentos, urlDoFicheiro, urlsDosFicheiros]);

  // ── Separar os documentos pelas três secções ──────────────────────────────
  const docDe = (credencialId: string, papel: string) =>
    documentos.find(d => d.docente_formacao_id === credencialId && d.papel === papel) ?? null;

  const comRegisto = useMemo(() => credenciais.filter(c => c.registo), [credenciais]);

  const complementares = useMemo<DocumentoParaGrelha[]>(
    () => documentos
      .filter(d => !d.docente_formacao_id && d.papel !== 'cv')
      .map(d => ({
        id: d.id,
        nome_ficheiro: d.nome_ficheiro,
        storage_path: d.storage_path,
        mime_type: d.mime_type,
        tamanho_bytes: d.tamanho_bytes,
        legenda: d.validade ? `válido até ${d.validade}` : null,
      })),
    [documentos],
  );

  const curriculos = useMemo<DocumentoParaGrelha[]>(
    () => documentos.filter(d => d.papel === 'cv').map(d => ({
      id: d.id, nome_ficheiro: d.nome_ficheiro, storage_path: d.storage_path,
      mime_type: d.mime_type, tamanho_bytes: d.tamanho_bytes, etiqueta: 'Currículo',
    })),
    [documentos],
  );

  const disponiveis = useMemo(
    () => catalogo.filter(f => !credenciais.some(c => c.formacao_id === f.id)),
    [catalogo, credenciais],
  );

  // ── Ações ─────────────────────────────────────────────────────────────────
  const acrescentar = async () => {
    if (!escolhida || !empresa?.id) return;
    setAGravar(true);
    const { data, error } = await (supabase.from('school_docente_formacoes' as any) as any)
      .insert({ empresa_id: empresa.id, docente_id: docenteId, formacao_id: escolhida, registo: registo.trim() || null })
      .select().maybeSingle();
    setAGravar(false);
    if (error || !data) {
      toast({ title: 'Não foi possível acrescentar', description: error?.message ?? 'A gravação não devolveu nenhuma linha.', variant: 'destructive' });
      return;
    }
    setEscolhida(''); setRegisto(''); setRecarga(n => n + 1);
  };

  const remover = async (id: string) => {
    const { error } = await (supabase.from('school_docente_formacoes' as any) as any).delete().eq('id', id);
    if (error) { toast({ title: 'Não foi possível remover', description: error.message, variant: 'destructive' }); return; }
    setRecarga(n => n + 1);
    aRecarregarDocumentos();
  };

  const criarFormacao = async () => {
    if (!nova.nome.trim() || !empresa?.id) return;
    if (normasNovas.length === 0) {
      toast({ title: 'Escolha pelo menos uma norma', description: 'Sem normas, esta formação não apareceria em certificado nenhum.', variant: 'destructive' });
      return;
    }
    setAGravar(true);
    const { data: f, error } = await (supabase.from('school_formacoes' as any) as any)
      .insert({ empresa_id: empresa.id, codigo: codigoDe(nova.nome), nome: nova.nome.trim(), sigla: nova.sigla.trim() || null, conselho: nova.conselho.trim() || null, ordem: 500 })
      .select().maybeSingle();
    if (error || !f) {
      setAGravar(false);
      toast({ title: 'Não foi possível criar a formação', description: error?.message, variant: 'destructive' });
      return;
    }
    await (supabase.from('school_formacao_normas' as any) as any)
      .insert(normasNovas.map(norma => ({ formacao_id: f.id, norma })));
    setAGravar(false);
    setCatalogo(c => [...c, f as Formacao]);
    setNormasPorFormacao(m => ({ ...m, [f.id]: normasNovas }));
    setACriar(false); setNova({ nome: '', sigla: '', conselho: '' }); setNormasNovas([]);
    setEscolhida(f.id);
    toast({ title: 'Formação criada' });
  };

  /** Anexa um documento a uma credencial concreta, no papel indicado. */
  const anexar = async (credencialId: string, papel: 'diploma' | 'carteira', ficheiro: File) => {
    setAEnviar(`${credencialId}:${papel}`);
    const tipo = papel === 'diploma' ? 'diploma' : 'outros';
    await onCarregarDocumento(ficheiro, tipo, { docente_formacao_id: credencialId, papel });
    setAEnviar(null);
  };

  /** Botão que abre o seletor de ficheiros e mostra a miniatura do que já lá está. */
  const Anexo = ({ credencial, papel, rotulo }: { credencial: Credencial; papel: 'diploma' | 'carteira'; rotulo: string }) => {
    const doc = docDe(credencial.id, papel);
    const chave = `${credencial.id}:${papel}`;
    return (
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        {doc ? (
          <FicheiroMiniatura url={urls[doc.id] ?? null} mime={doc.mime_type}
                             nome={doc.nome_ficheiro} onAbrirPreview={() => setAPrever(doc)} />
        ) : (
          <label className="cursor-pointer">
            <div className="h-16 w-12 rounded border border-dashed flex items-center justify-center
                            hover:border-primary/50 hover:bg-muted/40 transition">
              {aEnviar === chave
                ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                : <Upload className="h-4 w-4 text-muted-foreground" />}
            </div>
            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp"
                   onChange={e => {
                     const f = e.target.files?.[0];
                     e.target.value = '';
                     if (f) anexar(credencial.id, papel, f);
                   }} />
          </label>
        )}
        <span className="text-[10px] text-muted-foreground">{rotulo}</span>
        {doc && (
          <button type="button" className="text-[10px] text-destructive hover:underline"
                  onClick={() => onRemoverDocumento(doc)}>
            remover
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── 1. Registos profissionais ─────────────────────────────────────── */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <IdCard className="h-4 w-4" /> Registos profissionais
        </h4>
        <p className="text-xs text-muted-foreground">
          O número tem de estar legível — é por ele que se confirma no conselho. A carteira
          digitalizada prova-o.
        </p>
        {comRegisto.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum registo. Acrescente uma formação em baixo e preencha o campo Registo.
          </p>
        ) : (
          <ul className="space-y-2">
            {comRegisto.map(c => (
              <li key={c.id} className="flex items-center gap-3 rounded-md border p-3">
                <Anexo credencial={c} papel="carteira" rotulo="carteira" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tabular-nums">
                    {[c.formacao?.conselho, c.registo].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.formacao?.nome ?? '—'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      {/* ── 2. Formação Técnica e Acadêmica ───────────────────────────────── */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <GraduationCap className="h-4 w-4" /> Formação Técnica e Acadêmica
        </h4>
        <p className="text-xs text-muted-foreground">
          No certificado só aparecem as formações que credenciam a norma daquele curso. Um Bombeiro
          Civil não é impresso num NR-10, mesmo que o instrutor o seja.
        </p>

        {credenciais.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Sem formações registadas — os certificados sairão só com o nome do instrutor.
          </p>
        ) : (
          <ul className="space-y-2">
            {credenciais.map(c => (
              <li key={c.id} className="flex items-start gap-3 rounded-md border p-3">
                <Anexo credencial={c} papel="diploma" rotulo="diploma" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.formacao?.nome ?? '—'}</p>
                  {c.normas.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.normas.map(n => (
                        <Badge key={n} variant="outline" className="text-[10px] font-normal">{n}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 mt-1">
                      Não credencia norma nenhuma — não sairá em certificado algum.
                    </p>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => remover(c.id)} title="Remover">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-end pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Acrescentar formação</Label>
            <Select value={escolhida} onValueChange={setEscolhida}>
              <SelectTrigger><SelectValue placeholder="Escolher…" /></SelectTrigger>
              <SelectContent>
                {disponiveis.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Registo</Label>
            <Input value={registo} onChange={e => setRegisto(e.target.value)}
                   placeholder="CREA-AP 12345" className="w-40" />
          </div>
          <Button onClick={acrescentar} disabled={!escolhida || aGravar}>
            <Plus className="h-4 w-4 mr-1" /> Juntar
          </Button>
        </div>

        {!aCriar ? (
          <button type="button" onClick={() => setACriar(true)}
                  className="text-xs text-primary underline underline-offset-2">
            A formação que procura não está na lista? Criar uma nova
          </button>
        ) : (
          <div className="rounded-md border p-3 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">Nova formação</h5>
              <Button size="sm" variant="ghost" onClick={() => setACriar(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid sm:grid-cols-[2fr_1fr_1fr] gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={nova.nome} onChange={e => setNova(p => ({ ...p, nome: e.target.value }))}
                       placeholder="Técnico em Mecânica Industrial" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sigla</Label>
                <Input value={nova.sigla} onChange={e => setNova(p => ({ ...p, sigla: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Conselho</Label>
                <Input value={nova.conselho} onChange={e => setNova(p => ({ ...p, conselho: e.target.value }))}
                       placeholder="CRT" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Normas que credencia *</Label>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 max-h-40 overflow-y-auto pt-1">
                {NORMAS_POSSIVEIS.map(n => (
                  <label key={n} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={normasNovas.includes(n)}
                              onCheckedChange={c => setNormasNovas(p => c ? [...p, n] : p.filter(x => x !== n))} />
                    {n}
                  </label>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={criarFormacao} disabled={!nova.nome.trim() || aGravar}>
              {aGravar ? 'A criar…' : 'Criar formação'}
            </Button>
          </div>
        )}
      </section>

      <Separator />

      {/* ── 3. Formações complementares ───────────────────────────────────── */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Award className="h-4 w-4" /> Formações complementares
        </h4>
        <p className="text-xs text-muted-foreground">
          Cursos profissionalizantes, só as miniaturas. Alguns instrutores têm dezenas — descrevê-los
          um a um repetiria o resumo profissional e ninguém leria. O que importa é poder ver.
        </p>
        <GrelhaDocumentos
          documentos={complementares}
          urlDoFicheiro={urlDoFicheiro}
          urlsDosFicheiros={urlsDosFicheiros}
          onRemover={d => {
            const orig = documentos.find(x => x.id === d.id);
            if (orig) onRemoverDocumento(orig);
          }}
          vazio="Sem cursos anexados."
        />
        <label className="inline-block cursor-pointer pt-1">
          <Button asChild size="sm" variant="outline">
            <span><Upload className="h-4 w-4 mr-1" /> Anexar curso</span>
          </Button>
          <input type="file" className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.webp"
                 onChange={async e => {
                   const fs = Array.from(e.target.files ?? []);
                   e.target.value = '';
                   // Vários de uma vez: quem tem trinta certificados não os
                   // anexa um a um.
                   for (const f of fs) {
                     await onCarregarDocumento(f, 'certificado', { papel: 'complementar' });
                   }
                 }} />
        </label>
      </section>

      <Separator />

      {/* ── 4. Currículo ───────────────────────────────────────────────────
          Sempre visível, mesmo vazio: escondê-lo quando não há currículo
          tirava justamente o sítio por onde se acrescenta o primeiro. */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileUser className="h-4 w-4" /> Currículo
        </h4>
        <p className="text-xs text-muted-foreground">
          O currículo completo do instrutor. É o documento que um cliente corporativo pede quando
          quer ver o percurso inteiro, e não apenas as credenciais.
        </p>
        <GrelhaDocumentos
          documentos={curriculos}
          urlDoFicheiro={urlDoFicheiro}
          urlsDosFicheiros={urlsDosFicheiros}
          onRemover={d => {
            const orig = documentos.find(x => x.id === d.id);
            if (orig) onRemoverDocumento(orig);
          }}
          vazio="Sem currículo anexado."
        />
        <label className="inline-block cursor-pointer pt-1">
          <Button asChild size="sm" variant="outline">
            <span>
              <Upload className="h-4 w-4 mr-1" />
              {curriculos.length > 0 ? 'Anexar outra versão' : 'Anexar currículo'}
            </span>
          </Button>
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                 onChange={async e => {
                   const f = e.target.files?.[0];
                   e.target.value = '';
                   if (f) await onCarregarDocumento(f, 'cv', { papel: 'cv' });
                 }} />
        </label>
        {curriculos.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Há mais do que um currículo. O mais recente é o último da lista — apague os antigos se já
            não servirem.
          </p>
        )}
      </section>

      <FicheiroPreviewDialog
        open={aPrever !== null}
        onOpenChange={o => !o && setAPrever(null)}
        url={aPrever ? (urls[aPrever.id] ?? null) : null}
        mime={aPrever?.mime_type}
        nome={aPrever?.nome_ficheiro}
      />
    </div>
  );
}
