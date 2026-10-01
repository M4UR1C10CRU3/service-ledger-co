import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import {
  somarPeriodo, descreverPeriodo, ambitoLabel,
  type DocumentoLegal, type TipoDocumento, type ValidadeUnidade, type AdmPais,
} from '@/types/administrativo';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documento: DocumentoLegal | null;
  tipos: TipoDocumento[];
  pais: AdmPais | null;
  /** Devolve o documento gravado — é preciso para lhe colar o ficheiro a seguir. */
  onGuardar: (patch: Partial<DocumentoLegal>) => Promise<DocumentoLegal | null>;
  onAnexar: (doc: DocumentoLegal, ficheiro: File) => Promise<boolean>;
  onCriarTipo: (nome: string) => Promise<TipoDocumento | null>;
}

const VAZIO = {
  tipoRef: '', titulo: '', numero: '', entidade_emissora: '', ambito: '',
  data_emissao: '', data_validade: '', validade_valor: '', validade_unidade: '' as '' | ValidadeUnidade,
  aviso_dias: '60', rotina: false, responsavel_nome: '', custo_renovacao: '', observacoes: '',
  em_renovacao: false, dispensado: false,
};

export function DocumentoDialog({
  open, onOpenChange, documento, tipos, pais, onGuardar, onAnexar, onCriarTipo,
}: Props) {
  const [f, setF] = useState({ ...VAZIO });
  const [aGuardar, setAGuardar] = useState(false);
  const [novoTipo, setNovoTipo] = useState('');
  const [mostrarNovoTipo, setMostrarNovoTipo] = useState(false);
  const [ficheiro, setFicheiro] = useState<File | null>(null);

  // A referência do tipo leva a origem colada, porque o mesmo id pode existir
  // nas duas tabelas e é a origem que decide em que coluna se grava.
  const refDoTipo = (t: TipoDocumento) => `${t.origem}:${t.id}`;

  useEffect(() => {
    if (!open) return;
    if (documento) {
      const ref = documento.tipo_id
        ? `catalogo:${documento.tipo_id}`
        : documento.tipo_empresa_id ? `empresa:${documento.tipo_empresa_id}` : '';
      setF({
        tipoRef: ref,
        titulo: documento.titulo ?? '',
        numero: documento.numero ?? '',
        entidade_emissora: documento.entidade_emissora ?? '',
        ambito: documento.ambito ?? '',
        data_emissao: documento.data_emissao ?? '',
        data_validade: documento.data_validade ?? '',
        validade_valor: documento.validade_valor?.toString() ?? '',
        validade_unidade: (documento.validade_unidade ?? '') as '' | ValidadeUnidade,
        aviso_dias: (documento.aviso_dias ?? 60).toString(),
        rotina: documento.rotina,
        responsavel_nome: documento.responsavel_nome ?? '',
        custo_renovacao: documento.custo_renovacao?.toString() ?? '',
        observacoes: documento.observacoes ?? '',
        em_renovacao: documento.em_renovacao,
        dispensado: documento.dispensado,
      });
    } else {
      setF({ ...VAZIO });
    }
    setMostrarNovoTipo(false);
    setNovoTipo('');
    setFicheiro(null);
  }, [open, documento]);

  const tipoEscolhido = useMemo(
    () => tipos.find(t => refDoTipo(t) === f.tipoRef) ?? null,
    [tipos, f.tipoRef],
  );

  /**
   * Escolher o tipo preenche o resto — proposta, sempre editável, nunca
   * imposta. Só toca em campos vazios, para não apagar o que já foi escrito.
   */
  const aplicarTipo = (ref: string) => {
    const t = tipos.find(x => refDoTipo(x) === ref);
    setF(prev => ({
      ...prev,
      tipoRef: ref,
      titulo: prev.titulo || (t?.nome ?? ''),
      entidade_emissora: prev.entidade_emissora || (t?.entidade_emissora ?? ''),
      ambito: prev.ambito || (t?.ambito ?? ''),
      validade_valor: prev.validade_valor || (t?.validade_valor?.toString() ?? ''),
      validade_unidade: prev.validade_unidade || ((t?.validade_unidade ?? '') as '' | ValidadeUnidade),
      aviso_dias: prev.aviso_dias === '60' ? (t?.aviso_dias_sugerido ?? 60).toString() : prev.aviso_dias,
      rotina: t?.rotina ?? prev.rotina,
    }));
  };

  /** A data proposta a partir da emissão e do período. */
  const validadeProposta = useMemo(
    () => somarPeriodo(f.data_emissao, Number(f.validade_valor) || null, f.validade_unidade || null),
    [f.data_emissao, f.validade_valor, f.validade_unidade],
  );

  const ambitos = pais?.ambitos ?? [];

  const guardar = async () => {
    if (!f.titulo.trim()) return;
    setAGuardar(true);
    const gravado = await onGuardar({
      tipo_id: tipoEscolhido?.origem === 'catalogo' ? tipoEscolhido.id : null,
      tipo_empresa_id: tipoEscolhido?.origem === 'empresa' ? tipoEscolhido.id : null,
      tipo_nome: tipoEscolhido?.nome ?? 'Outro documento',
      titulo: f.titulo.trim(),
      numero: f.numero.trim() || null,
      entidade_emissora: f.entidade_emissora.trim() || null,
      ambito: f.ambito || null,
      data_emissao: f.data_emissao || null,
      data_validade: f.data_validade || null,
      validade_valor: Number(f.validade_valor) || null,
      validade_unidade: (f.validade_unidade || null) as ValidadeUnidade | null,
      aviso_dias: Number(f.aviso_dias) || 60,
      rotina: f.rotina,
      responsavel_nome: f.responsavel_nome.trim() || null,
      custo_renovacao: f.custo_renovacao ? Number(f.custo_renovacao) : null,
      observacoes: f.observacoes.trim() || null,
      em_renovacao: f.em_renovacao,
      dispensado: f.dispensado,
    } as Partial<DocumentoLegal>);

    // O ficheiro só sobe depois de o documento existir — é a ele que fica
    // colado. Se a gravação falhar, não se carrega nada para o armazenamento.
    if (gravado && ficheiro) await onAnexar(gravado, ficheiro);

    setAGuardar(false);
    if (gravado) onOpenChange(false);
  };

  const criarTipo = async () => {
    if (!novoTipo.trim()) return;
    const t = await onCriarTipo(novoTipo.trim());
    if (t) {
      setMostrarNovoTipo(false);
      setNovoTipo('');
      aplicarTipo(refDoTipo(t));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{documento ? 'Editar documento' : 'Registar documento'}</DialogTitle>
          <DialogDescription>
            {pais
              ? `Catálogo de ${pais.nome}. O que o catálogo não previr regista-se na mesma, com um tipo próprio.`
              : 'A empresa ainda não tem país definido — só aparecem os tipos universais.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Tipo */}
          <div className="grid gap-2">
            <Label>Tipo de documento</Label>
            <div className="flex gap-2">
              <Select value={f.tipoRef} onValueChange={aplicarTipo}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Escolher do catálogo…" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map(t => (
                    <SelectItem key={refDoTipo(t)} value={refDoTipo(t)}>
                      {t.nome}
                      {t.origem === 'empresa' ? ' · próprio' : ''}
                      {t.obrigatorio ? ' · obrigatório' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setMostrarNovoTipo(v => !v)}>
                <Plus className="h-4 w-4 mr-1" /> Novo tipo
              </Button>
            </div>
            {tipoEscolhido && (
              <p className="text-xs text-muted-foreground">
                Validade típica: {descreverPeriodo(tipoEscolhido.validade_valor, tipoEscolhido.validade_unidade)}
                {tipoEscolhido.entidade_emissora ? ` · ${tipoEscolhido.entidade_emissora}` : ''}
                {tipoEscolhido.ambito ? ` · ${ambitoLabel(tipoEscolhido.ambito)}` : ''}
              </p>
            )}
            {mostrarNovoTipo && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do tipo que falta no catálogo"
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value)}
                />
                <Button type="button" onClick={criarTipo} disabled={!novoTipo.trim()}>Criar</Button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })}
                     placeholder="Como a empresa lhe chama" />
            </div>
            <div className="grid gap-2">
              <Label>Número</Label>
              <Input value={f.numero} onChange={e => setF({ ...f, numero: e.target.value })}
                     placeholder="Número do documento" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Entidade emissora</Label>
              <Input value={f.entidade_emissora}
                     onChange={e => setF({ ...f, entidade_emissora: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Âmbito</Label>
              <Select value={f.ambito || '__none'}
                      onValueChange={v => setF({ ...f, ambito: v === '__none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Sem âmbito" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sem âmbito</SelectItem>
                  {ambitos.map(a => (
                    <SelectItem key={a} value={a}>{ambitoLabel(a)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ficheiro — quem regista o documento tem-no na mão; obrigar a
              gravar, reabrir e só depois anexar eram três passos para um gesto. */}
          <div className="grid gap-2">
            <Label>{documento ? 'Substituir ficheiro' : 'Ficheiro do documento'}</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
              onChange={e => setFicheiro(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              {ficheiro
                ? `${ficheiro.name} — sobe quando guardar.`
                : documento
                  ? 'Deixe vazio para manter o ficheiro que já lá está.'
                  : 'PDF ou fotografia. Fica guardado em privado, só acessível a quem tem acesso à empresa.'}
            </p>
          </div>

          {/* Validade */}
          <div className="rounded-lg border p-4 grid gap-4 bg-muted/30">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Data de emissão</Label>
                <Input type="date" value={f.data_emissao}
                       onChange={e => setF({ ...f, data_emissao: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Período de renovação</Label>
                <Input type="number" min={1} value={f.validade_valor}
                       onChange={e => setF({ ...f, validade_valor: e.target.value })}
                       placeholder="30, 180, 1…" />
              </div>
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <Select value={f.validade_unidade || '__none'}
                        onValueChange={v => setF({ ...f, validade_unidade: (v === '__none' ? '' : v) as '' | ValidadeUnidade })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sem validade</SelectItem>
                    <SelectItem value="dias">dias</SelectItem>
                    <SelectItem value="meses">meses</SelectItem>
                    <SelectItem value="anos">anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 items-end">
              <div className="grid gap-2">
                <Label>Data de vencimento</Label>
                <Input type="date" value={f.data_validade}
                       onChange={e => setF({ ...f, data_validade: e.target.value })} />
                {validadeProposta && validadeProposta !== f.data_validade && (
                  <button type="button"
                          className="text-xs text-left text-primary underline underline-offset-2"
                          onClick={() => setF({ ...f, data_validade: validadeProposta })}>
                    Usar {new Date(validadeProposta + 'T00:00:00').toLocaleDateString('pt-PT')}, calculado a
                    partir da emissão
                  </button>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Avisar com quantos dias de antecedência</Label>
                <Input type="number" min={0} value={f.aviso_dias}
                       onChange={e => setF({ ...f, aviso_dias: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={f.rotina} onCheckedChange={v => setF({ ...f, rotina: v })} id="rotina" />
              <Label htmlFor="rotina" className="font-normal cursor-pointer">
                Documento de rotina
                <span className="block text-xs text-muted-foreground">
                  Renova-se com frequência. Fica fora do painel de risco para não abafar os avisos que contam.
                </span>
              </Label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Responsável pela renovação</Label>
              <Input value={f.responsavel_nome}
                     onChange={e => setF({ ...f, responsavel_nome: e.target.value })}
                     placeholder="Sem dono, o alerta não é de ninguém" />
            </div>
            <div className="grid gap-2">
              <Label>Custo de renovação</Label>
              <Input type="number" step="0.01" min={0} value={f.custo_renovacao}
                     onChange={e => setF({ ...f, custo_renovacao: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={f.observacoes}
                      onChange={e => setF({ ...f, observacoes: e.target.value })} />
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch checked={f.em_renovacao} id="em-renovacao"
                      onCheckedChange={v => setF({ ...f, em_renovacao: v })} />
              <Label htmlFor="em-renovacao" className="font-normal cursor-pointer">Em renovação</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={f.dispensado} id="dispensado"
                      onCheckedChange={v => setF({ ...f, dispensado: v })} />
              <Label htmlFor="dispensado" className="font-normal cursor-pointer">Dispensado</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={aGuardar || !f.titulo.trim()}>
            {aGuardar ? 'A guardar…' : documento ? 'Guardar' : 'Registar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
