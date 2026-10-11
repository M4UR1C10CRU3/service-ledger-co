import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useSchoolMateriais, urlParaAbrir, eLigacao, TIPOS_MATERIAL, LIMITE_FICHEIRO_MB,
  type MaterialTurma,
} from '@/hooks/useSchoolMateriais';
import {
  FileText, Link2, Upload, Eye, EyeOff, Trash2, Loader2, Plus, ExternalLink, Video,
} from 'lucide-react';

/**
 * Publicação de materiais de uma turma, pelo instrutor.
 *
 * Vive dentro do cartão da turma no Portal do Instrutor, ao lado da chamada e
 * das notas — que é onde ele já está quando pensa no material da aula.
 *
 * O que aqui se marca como visível aparece, dessa turma, no Portal do Aluno.
 * O interruptor existe para o instrutor poder preparar material antes da aula
 * sem o abrir já à turma.
 */
export function MateriaisTurma({
  turmaId, empresaId, docenteId,
}: { turmaId: string; empresaId: string; docenteId: string | null }) {
  const { materiais, isLoading, publicar, alternarVisivel, remover } = useSchoolMateriais(turmaId);
  const [aAdicionar, setAAdicionar] = useState(false);
  const [modo, setModo] = useState<'ficheiro' | 'ligacao'>('ficheiro');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('apostila');
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [ligacao, setLigacao] = useState('');
  const [visivel, setVisivel] = useState(true);

  const limpar = () => {
    setTitulo(''); setDescricao(''); setTipo('apostila');
    setFicheiro(null); setLigacao(''); setVisivel(true); setAAdicionar(false);
  };

  const submeter = async () => {
    await publicar.mutateAsync({
      empresaId, docenteId, titulo, descricao, tipo,
      ficheiro: modo === 'ficheiro' ? ficheiro : null,
      ligacao: modo === 'ligacao' ? ligacao : undefined,
      visivel,
    });
    limpar();
  };

  const abrir = async (m: MaterialTurma) => {
    const url = await urlParaAbrir(m.url);
    if (url) window.open(url, '_blank', 'noreferrer');
  };

  const podeSubmeter = titulo.trim() && (modo === 'ficheiro' ? ficheiro : ligacao.trim());

  return (
    <div className="border-t pt-4 mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Materiais da turma
        </p>
        {!aAdicionar && (
          <Button size="sm" variant="outline" onClick={() => setAAdicionar(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Adicionar
          </Button>
        )}
      </div>

      {aAdicionar && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Título *</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)}
                placeholder="Ex.: Apostila NR-35 — módulo 1" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_MATERIAL.map(t => (
                    <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={2} value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Opcional — o que é e quando usar." />
          </div>

          {/* Ficheiro ou ligação. Ver a nota em useSchoolMateriais sobre porque
              os vídeos entram por ligação e não por upload. */}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={modo === 'ficheiro' ? 'secondary' : 'outline'}
              onClick={() => setModo('ficheiro')}>
              <Upload className="h-4 w-4 mr-1.5" />Ficheiro
            </Button>
            <Button type="button" size="sm" variant={modo === 'ligacao' ? 'secondary' : 'outline'}
              onClick={() => setModo('ligacao')}>
              <Link2 className="h-4 w-4 mr-1.5" />Ligação (vídeo)
            </Button>
          </div>

          {modo === 'ficheiro' ? (
            <div className="space-y-1">
              <Input type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.odp,.odt,.xls,.xlsx,.zip,.png,.jpg,.jpeg"
                onChange={e => setFicheiro(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">
                PDF, apresentação, apostila. Até {LIMITE_FICHEIRO_MB} MB.
                Para vídeos use a ligação — não cabem aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Input value={ligacao} onChange={e => setLigacao(e.target.value)}
                placeholder="https://youtube.com/watch?v=..." />
              <p className="text-xs text-muted-foreground">
                Endereço do vídeo no YouTube, Vimeo ou Drive. O aluno abre-o daqui.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={visivel} onChange={e => setVisivel(e.target.checked)} />
            Disponibilizar já aos alunos desta turma
          </label>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={submeter} disabled={!podeSubmeter || publicar.isPending}>
              {publicar.isPending
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />A publicar...</>
                : 'Publicar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={limpar}>Cancelar</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar...</p>
      ) : materiais.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há material publicado nesta turma.</p>
      ) : (
        <ul className="space-y-2">
          {materiais.map(m => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex items-start gap-2.5">
                {eLigacao(m.url)
                  ? <Video className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  : <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.titulo}</p>
                  {m.descricao && (
                    <p className="text-xs text-muted-foreground truncate">{m.descricao}</p>
                  )}
                  {!m.visivel_aluno && (
                    <Badge variant="outline" className="mt-1 text-xs text-muted-foreground">
                      Não visível aos alunos
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => abrir(m)} title="Abrir">
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => alternarVisivel.mutate(m)}
                  title={m.visivel_aluno ? 'Esconder dos alunos' : 'Mostrar aos alunos'}>
                  {m.visivel_aluno ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-50" />}
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => { if (confirm(`Remover "${m.titulo}"?`)) remover.mutate(m); }}
                  title="Remover">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
