import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, BookOpen, Pencil, Trash2, Globe, Clock, Image as ImageIcon, Upload, Loader2, X, ListOrdered } from 'lucide-react';
import { useSchoolCursos, SchoolCurso, SchoolCursoInput } from '@/hooks/useSchoolCursos';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { resolverImagem } from '@/lib/certificadoEmissao';

const EMPTY: SchoolCursoInput = {
  nome: '', categoria: null, descricao: null, carga_horaria: null,
  sigla_certificado: null, validade_meses: null, horas_teoricas: null, horas_praticas: null,
  conteudo_programatico: [], objetivo: null, metodologia: null, reconhecimento: null,
  aprovacao_minima: 70, template_cert_path: null, url_site: null, ativo: true,
};

export default function SchoolCursos() {
  const { cursos, isLoading, createCurso, updateCurso, deleteCurso } = useSchoolCursos();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolCurso | null>(null);
  const [form, setForm] = useState<SchoolCursoInput>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    cursos.filter(c =>
      !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.categoria ?? '').toLowerCase().includes(search.toLowerCase())
    ), [cursos, search]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (c: SchoolCurso) => { setEditing(c); setForm({ ...c }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (editing) updateCurso.mutate({ id: editing.id, ...form });
    else createCurso.mutate(form);
    setFormOpen(false);
  };

  const f = (field: keyof SchoolCursoInput, value: any) => setForm(p => ({ ...p, [field]: value || null }));

  // ── Fotografia de fundo do certificado ────────────────────────────────────
  // Cada curso tem a sua imagem. É guardada no Storage para poder ser trocada
  // aqui mesmo, sem depender de uma publicação da aplicação.
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [aCarregar, setACarregar] = useState(false);
  const [previa, setPrevia] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    if (!form.template_cert_path) { setPrevia(null); return; }
    resolverImagem(form.template_cert_path, 'school-files')
      .then(u => { if (!cancelado) setPrevia(u); })
      .catch(() => { if (!cancelado) setPrevia(null); });
    return () => { cancelado = true; };
  }, [form.template_cert_path]);

  const carregarFundo = async (file: File) => {
    if (!empresa) return;
    setACarregar(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      // O nome inclui o instante para o browser não servir a imagem antiga.
      const path = `${empresa.id}/cursos/fundo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('school-files')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      f('template_cert_path', path);
      toast({ title: 'Imagem carregada', description: 'Gravar o curso para a aplicar.' });
    } catch (e: any) {
      toast({ title: 'Erro ao carregar a imagem', description: e.message, variant: 'destructive' });
    } finally {
      setACarregar(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cursos</h1>
          <p className="text-sm text-muted-foreground">{cursos.length} curso{cursos.length !== 1 ? 's' : ''} cadastrado{cursos.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Curso</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar curso..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Carga Horária</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Sigla Cert.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhum curso encontrado' : 'Nenhum curso cadastrado'}
                </TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.nome}
                      {c.url_site && <a href={c.url_site} target="_blank" rel="noopener noreferrer"><Globe className="h-3 w-3 text-muted-foreground hover:text-primary" /></a>}
                    </div>
                  </TableCell>
                  <TableCell><span className="text-muted-foreground text-sm">{c.categoria ?? '—'}</span></TableCell>
                  <TableCell>
                    {c.carga_horaria ? (
                      <div className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3 text-muted-foreground" />{c.carga_horaria}h</div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{c.validade_meses ? `${c.validade_meses} meses` : '—'}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.sigla_certificado ?? '—'}</code></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.ativo ? 'border-green-500/40 text-green-600 bg-green-500/10' : 'text-muted-foreground'}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Curso' : 'Novo Curso'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Nome do Curso *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input value={form.categoria ?? ''} onChange={e => f('categoria', e.target.value)} placeholder="ex: NR-35, Primeiros Socorros" />
            </div>
            <div className="space-y-1">
              <Label>Sigla do Certificado</Label>
              <Input value={form.sigla_certificado ?? ''} onChange={e => f('sigla_certificado', e.target.value)} placeholder="ex: NR35" />
            </div>
            <div className="space-y-1">
              <Label>Carga Horária Total (h)</Label>
              <Input type="number" value={form.carga_horaria ?? ''} onChange={e => f('carga_horaria', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Validade do Certificado (meses)</Label>
              <Input type="number" value={form.validade_meses ?? ''} onChange={e => f('validade_meses', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Horas Teóricas</Label>
              <Input type="number" value={form.horas_teoricas ?? ''} onChange={e => f('horas_teoricas', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Horas Práticas</Label>
              <Input type="number" value={form.horas_praticas ?? ''} onChange={e => f('horas_praticas', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Aprovação Mínima (%)</Label>
              <Input type="number" value={form.aprovacao_minima ?? 70} onChange={e => f('aprovacao_minima', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>URL do Curso (site)</Label>
              <Input value={form.url_site ?? ''} onChange={e => f('url_site', e.target.value)} placeholder="https://..." />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.descricao ?? ''} onChange={e => f('descricao', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Objetivo</Label>
              <Textarea rows={2} value={form.objetivo ?? ''} onChange={e => f('objetivo', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Metodologia</Label>
              <Textarea rows={2} value={form.metodologia ?? ''} onChange={e => f('metodologia', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Reconhecimento (CEE-AP, IRATA, etc.)</Label>
              <Textarea rows={2} value={form.reconhecimento ?? ''} onChange={e => f('reconhecimento', e.target.value)} />
            </div>

            {/* Conteúdo programático.
                É o que sai impresso no VERSO do certificado, módulo a módulo.
                Estava guardado na base de dados e a alimentar os certificados,
                mas não havia por onde o ver nem editar: um curso criado por
                aqui nascia com o verso em branco e ninguém dava por isso até
                emitir. */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" /> Conteúdo programático
                </Label>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => f('conteudo_programatico', [...(form.conteudo_programatico ?? []), { modulo: '', horas: 0 }])}>
                  <Plus className="h-4 w-4 mr-1" /> Módulo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sai impresso no verso do certificado. Sem módulos, o verso fica vazio
                — e o verso é a prova do que foi ensinado.
              </p>

              {(form.conteudo_programatico ?? []).length === 0 ? (
                <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nenhum módulo. Os certificados deste curso sairão com o verso em branco.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(form.conteudo_programatico ?? []).map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 text-xs text-muted-foreground text-right">{i + 1}.</span>
                      <Input
                        className="flex-1"
                        placeholder="Nome do módulo"
                        value={m.modulo}
                        onChange={e => {
                          const lista = [...(form.conteudo_programatico ?? [])];
                          lista[i] = { ...lista[i], modulo: e.target.value };
                          f('conteudo_programatico', lista);
                        }}
                      />
                      <Input
                        className="w-24"
                        type="number" min={0} step={0.5}
                        placeholder="horas"
                        value={m.horas ?? 0}
                        onChange={e => {
                          const lista = [...(form.conteudo_programatico ?? [])];
                          lista[i] = { ...lista[i], horas: Number(e.target.value) };
                          f('conteudo_programatico', lista);
                        }}
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                        onClick={() => f('conteudo_programatico',
                          (form.conteudo_programatico ?? []).filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* A soma das horas dos módulos tem de bater com a carga
                      horária declarada — é o par de números que um auditor
                      compara primeiro. */}
                  {(() => {
                    const soma = (form.conteudo_programatico ?? []).reduce((s, m) => s + (Number(m.horas) || 0), 0);
                    const total = Number(form.carga_horaria) || 0;
                    const bate = !total || soma === total;
                    return (
                      <p className={`text-xs pl-8 ${bate ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-500'}`}>
                        Soma dos módulos: <strong>{soma}h</strong>
                        {total ? ` · carga horária do curso: ${total}h` : ''}
                        {bate ? '' : ' — não coincidem'}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Fotografia de fundo do certificado
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Aparece esbatida atrás do texto, na frente do certificado. Use uma imagem
                vertical do tema do curso. Sem imagem, o certificado sai com o fundo branco.
              </p>
              <div className="flex items-start gap-4">
                <div className="h-28 w-20 shrink-0 rounded border bg-muted/40 overflow-hidden flex items-center justify-center">
                  {previa
                    ? <img src={previa} alt="Fundo do certificado" className="h-full w-full object-cover" />
                    : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div className="space-y-2">
                  <input
                    id="fundo-curso"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => { const fl = e.target.files?.[0]; if (fl) carregarFundo(fl); e.target.value = ''; }}
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={aCarregar}
                      onClick={() => document.getElementById('fundo-curso')?.click()}>
                      {aCarregar
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A carregar...</>
                        : <><Upload className="h-4 w-4 mr-2" /> {form.template_cert_path ? 'Substituir' : 'Carregar imagem'}</>}
                    </Button>
                    {form.template_cert_path && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => f('template_cert_path', null)}>
                        <X className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    )}
                  </div>
                  {form.template_cert_path && (
                    <p className="text-xs text-muted-foreground font-mono break-all">{form.template_cert_path}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim() || createCurso.isPending || updateCurso.isPending}>
              {editing ? 'Guardar' : 'Criar Curso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover curso?</AlertDialogTitle>
            <AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteCurso.mutate(deleteId); setDeleteId(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
