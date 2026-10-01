import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useClientes } from '@/hooks/useClientes';
import { useSuppliers } from '@/hooks/useSuppliers';
import { CAMPOS_LABEL } from '@/hooks/useQuadroProcesso';
import { QuadroCartao, Utilizador } from '@/types/quadros';
import { AlertCircle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Os dados que transformam um cartão de texto livre em algo sobre o qual se
// pode automatizar. Só aparece em quadros com processo — num quadro livre não
// há campo nenhum a pedir, que é exatamente como tem de ser.
//
// Mostram-se apenas os campos que ALGUMA coluna deste quadro exige. Pedir tudo
// a toda a gente foi o erro dos Workflows antigos.
// ─────────────────────────────────────────────────────────────────────────────

const SEM_VALOR = '__nenhum__';

interface Props {
  cartao: QuadroCartao;
  utilizadores: Utilizador[];
  /** União dos campos exigidos pelas colunas deste quadro. */
  camposDoQuadro: string[];
  /** Campos que este cartão ainda não tem preenchidos. */
  emFalta: string[];
  onUpdate: (updates: Partial<QuadroCartao>, atividade?: string) => void;
}

export default function CartaoDadosProcesso({
  cartao, utilizadores, camposDoQuadro, emFalta, onUpdate,
}: Props) {
  const { clientes } = useClientes();
  const { suppliers } = useSuppliers();

  const mostra = useMemo(() => new Set(camposDoQuadro), [camposDoQuadro]);
  const falta = useMemo(() => new Set(emFalta), [emFalta]);

  if (camposDoQuadro.length === 0) return null;

  const rotulo = (campo: string) => (
    <Label className="flex items-center gap-1.5 text-xs">
      {CAMPOS_LABEL[campo] ?? campo}
      {falta.has(campo) && (
        <span className="flex items-center gap-1 text-amber-600 font-normal">
          <AlertCircle size={11} /> em falta
        </span>
      )}
    </Label>
  );

  const escolherCliente = (id: string) => {
    if (id === SEM_VALOR) { onUpdate({ cliente_id: null }); return; }
    const c = clientes.find(x => x.id === id);
    onUpdate({
      cliente_id: id,
      // Poupa um passo: o email do cliente serve de destino às automações,
      // mas nunca por cima de um que já lá esteja escrito à mão.
      ...(c?.email && !cartao.contacto_email ? { contacto_email: c.email } : {}),
    }, `associou o cliente ${c?.nome ?? ''}`.trim());
  };

  const escolherFornecedor = (id: string) => {
    if (id === SEM_VALOR) { onUpdate({ supplier_id: null }); return; }
    const s = suppliers.find(x => x.id === id);
    onUpdate({
      supplier_id: id,
      ...(s?.email && !cartao.contacto_email ? { contacto_email: s.email } : {}),
    }, `associou o fornecedor ${s?.razaoSocial ?? ''}`.trim());
  };

  const escolherResponsavel = (id: string) => {
    if (id === SEM_VALOR) { onUpdate({ responsavel_id: null, responsavel_nome: null }); return; }
    const u = utilizadores.find(x => x.id === id);
    onUpdate({ responsavel_id: id, responsavel_nome: u?.nome ?? null },
      `atribuiu a responsabilidade a ${u?.nome ?? ''}`.trim());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dados do processo
        </h4>
        {falta.size > 0 && (
          <span className="text-[11px] text-amber-600">
            {falta.size === 1 ? 'falta 1 campo' : `faltam ${falta.size} campos`}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {mostra.has('cliente_id') && (
          <div className="space-y-1">
            {rotulo('cliente_id')}
            <Select value={cartao.cliente_id ?? SEM_VALOR} onValueChange={escolherCliente}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_VALOR}>— sem cliente —</SelectItem>
                {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {mostra.has('supplier_id') && (
          <div className="space-y-1">
            {rotulo('supplier_id')}
            <Select value={cartao.supplier_id ?? SEM_VALOR} onValueChange={escolherFornecedor}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Escolher fornecedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_VALOR}>— sem fornecedor —</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.razaoSocial}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {mostra.has('responsavel_id') && (
          <div className="space-y-1">
            {rotulo('responsavel_id')}
            <Select value={cartao.responsavel_id ?? SEM_VALOR} onValueChange={escolherResponsavel}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Escolher responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_VALOR}>— sem responsável —</SelectItem>
                {utilizadores.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {mostra.has('contacto_email') && (
          <div className="space-y-1">
            {rotulo('contacto_email')}
            <Input
              type="email"
              className="h-9"
              placeholder="para onde seguem os emails"
              defaultValue={cartao.contacto_email ?? ''}
              onBlur={e => {
                const v = e.target.value.trim();
                if (v !== (cartao.contacto_email ?? '')) onUpdate({ contacto_email: v || null });
              }}
            />
          </div>
        )}

        {mostra.has('valor') && (
          <div className="space-y-1">
            {rotulo('valor')}
            <Input
              type="number"
              step="0.01"
              min="0"
              className="h-9"
              placeholder="0,00"
              defaultValue={cartao.valor ?? ''}
              onBlur={e => {
                const bruto = e.target.value.trim();
                const v = bruto === '' ? null : Number(bruto);
                if (v !== null && Number.isNaN(v)) return;
                if (v !== (cartao.valor ?? null)) onUpdate({ valor: v });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
