import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, RefreshCw, Pencil, Archive } from 'lucide-react';
import { useDocumentosLegais } from '@/hooks/useDocumentosLegais';
import { usePermissions } from '@/hooks/usePermissions';
import { LicenciamentosKpis } from '@/components/administrativo/LicenciamentosKpis';
import { DocumentoDialog } from '@/components/administrativo/DocumentoDialog';
import { RenovarDialog } from '@/components/administrativo/RenovarDialog';
import { DocumentoDetalhe } from '@/components/administrativo/DocumentoDetalhe';
import { ESTADO_CONFIG, ambitoLabel, type DocumentoLegal } from '@/types/administrativo';

const dataCurta = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-PT') : '—';

/** Vencidos primeiro, depois o que vence mais cedo. O resto ordena-se por nome. */
const PESO_ESTADO: Record<string, number> = {
  vencido: 0, a_vencer: 1, em_renovacao: 2, vigente: 3,
  sem_validade: 4, dispensado: 5, arquivado: 6,
};

export default function Licenciamentos() {
  const {
    documentos, tipos, pais, loading,
    criarDocumento, atualizarDocumento, arquivarDocumento,
    listarVersoes, renovarDocumento, urlDoFicheiro, listarHistorico, criarTipoProprio,
    anexarAoDocumento,
  } = useDocumentosLegais();
  const { can } = usePermissions();

  const [busca, setBusca] = useState('');
  const [fEstado, setFEstado] = useState('__all');
  const [fAmbito, setFAmbito] = useState('__all');
  const [verArquivados, setVerArquivados] = useState(false);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<DocumentoLegal | null>(null);
  const [aRenovar, setARenovar] = useState<DocumentoLegal | null>(null);
  const [aVer, setAVer] = useState<DocumentoLegal | null>(null);

  const podeCriar = can('administrativo', 'criar');
  const podeEditar = can('administrativo', 'editar');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return documentos
      .filter(d => verArquivados ? d.arquivado : !d.arquivado)
      .filter(d => fEstado === '__all' || d.estado === fEstado)
      .filter(d => fAmbito === '__all' || d.ambito === fAmbito)
      .filter(d => !q || [d.titulo, d.numero ?? '', d.tipo_nome, d.entidade_emissora ?? '', d.responsavel_nome ?? '']
        .join(' ').toLowerCase().includes(q))
      .sort((a, b) => {
        const p = (PESO_ESTADO[a.estado] ?? 9) - (PESO_ESTADO[b.estado] ?? 9);
        if (p !== 0) return p;
        if (a.data_validade && b.data_validade) return a.data_validade.localeCompare(b.data_validade);
        if (a.data_validade) return -1;
        if (b.data_validade) return 1;
        return a.titulo.localeCompare(b.titulo, 'pt');
      });
  }, [documentos, busca, fEstado, fAmbito, verArquivados]);

  // As certidões de rotina ficam à parte: se entrassem na lista principal,
  // enchiam-na de linhas âmbar todos os meses e abafavam o alvará.
  const principais = filtrados.filter(d => !d.rotina);
  const correntes = filtrados.filter(d => d.rotina);

  // Devolve o documento gravado, não um sim/não: o diálogo precisa dele para
  // lhe colar o ficheiro a seguir.
  const guardar = async (patch: Partial<DocumentoLegal>): Promise<DocumentoLegal | null> => {
    if (emEdicao) {
      const ok = await atualizarDocumento(emEdicao.id, patch);
      return ok ? { ...emEdicao, ...patch } as DocumentoLegal : null;
    }
    return criarDocumento(patch);
  };

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Licenciamentos</h1>
          <p className="text-sm text-muted-foreground">
            Alvarás, licenças e certidões, com vencimento e ciclo de renovação
            {pais ? ` · catálogo de ${pais.nome}` : ''}
          </p>
        </div>
        {podeCriar && (
          <Button onClick={() => { setEmEdicao(null); setDialogAberto(true); }}
                  className="bg-[#E8561A] hover:bg-[#c64a17] text-white">
            <Plus className="h-4 w-4 mr-1" /> Registar documento
          </Button>
        )}
      </div>

      <LicenciamentosKpis documentos={documentos} />

      <Card className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Procurar por título, número, entidade ou responsável…"
                   value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={fEstado} onValueChange={setFEstado}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os estados</SelectItem>
              {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fAmbito} onValueChange={setFAmbito}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os âmbitos</SelectItem>
              {(pais?.ambitos ?? []).map(a => (
                <SelectItem key={a} value={a}>{ambitoLabel(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={verArquivados ? 'default' : 'outline'} size="sm"
                  onClick={() => setVerArquivados(v => !v)}>
            <Archive className="h-4 w-4 mr-1" /> Arquivados
          </Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground p-6">A carregar…</p>
      ) : (
        <>
          <Tabela
            titulo={verArquivados ? 'Arquivados' : 'Documentos'}
            linhas={principais}
            vazio={verArquivados ? 'Nada arquivado.' : 'Ainda não há documentos registados.'}
            podeEditar={podeEditar}
            onVer={setAVer}
            onEditar={d => { setEmEdicao(d); setDialogAberto(true); }}
            onRenovar={setARenovar}
            onArquivar={arquivarDocumento}
          />
          {correntes.length > 0 && (
            <Tabela
              titulo="Certidões correntes"
              nota="Renovação de rotina — fora do painel de risco de propósito."
              linhas={correntes}
              vazio=""
              podeEditar={podeEditar}
              onVer={setAVer}
              onEditar={d => { setEmEdicao(d); setDialogAberto(true); }}
              onRenovar={setARenovar}
              onArquivar={arquivarDocumento}
            />
          )}
        </>
      )}

      <DocumentoDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        documento={emEdicao}
        tipos={tipos}
        pais={pais}
        onGuardar={guardar}
        onAnexar={anexarAoDocumento}
        onCriarTipo={criarTipoProprio}
      />
      <RenovarDialog
        open={aRenovar !== null}
        onOpenChange={o => !o && setARenovar(null)}
        documento={aRenovar}
        onRenovar={renovarDocumento}
      />
      <DocumentoDetalhe
        open={aVer !== null}
        onOpenChange={o => !o && setAVer(null)}
        documento={aVer}
        listarVersoes={listarVersoes}
        listarHistorico={listarHistorico}
        urlDoFicheiro={urlDoFicheiro}
        anexarAoDocumento={anexarAoDocumento}
        podeEditar={podeEditar}
      />
    </div>
  );
}

function Tabela({
  titulo, nota, linhas, vazio, podeEditar, onVer, onEditar, onRenovar, onArquivar,
}: {
  titulo: string;
  nota?: string;
  linhas: DocumentoLegal[];
  vazio: string;
  podeEditar: boolean;
  onVer: (d: DocumentoLegal) => void;
  onEditar: (d: DocumentoLegal) => void;
  onRenovar: (d: DocumentoLegal) => void;
  onArquivar: (id: string) => Promise<boolean>;
}) {
  if (linhas.length === 0 && !vazio) return null;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold">{titulo}</h2>
        {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      </div>
      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6">{vazio}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Âmbito</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(d => {
                const e = ESTADO_CONFIG[d.estado] ?? ESTADO_CONFIG.sem_validade;
                return (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => onVer(d)}>
                    <TableCell>
                      <Badge variant="outline" className={e.bg}>{e.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{d.titulo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.tipo_nome}{d.numero ? ` · n.º ${d.numero}` : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{d.entidade_emissora ?? '—'}</TableCell>
                    <TableCell className="text-sm">{ambitoLabel(d.ambito)}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {dataCurta(d.data_validade)}
                      {d.dias_para_vencer != null && d.estado !== 'vigente' && (
                        <span className="block text-xs text-muted-foreground">
                          {d.dias_para_vencer < 0
                            ? `há ${Math.abs(d.dias_para_vencer)} dias`
                            : `em ${d.dias_para_vencer} dias`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{d.responsavel_nome ?? '—'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap"
                               onClick={ev => ev.stopPropagation()}>
                      {podeEditar && (
                        <>
                          <Button size="sm" variant="ghost" title="Renovar"
                                  onClick={() => onRenovar(d)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Editar"
                                  onClick={() => onEditar(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!d.arquivado && (
                            <Button size="sm" variant="ghost" title="Arquivar"
                                    onClick={() => onArquivar(d.id)}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
