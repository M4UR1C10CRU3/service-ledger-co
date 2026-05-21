import { useEffect, useState } from 'react';
import { useTrabalhoExtra } from '@/hooks/useTrabalhoExtra';
import { TeFormData, TE_ESTADOS, emptyTeForm } from '@/types/trabalhoExtra';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, CheckCircle, XCircle, Receipt, Trash2, AlertCircle, Euro } from 'lucide-react';

interface Props {
  osId: string;
  empresaId: string | undefined;
  osEstado: string;
}

const fmtEUR = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0);

function OsExtrasTab({ osId, empresaId, osEstado }: Props) {
  const { items, fetchByOs, addExtra, updateEstado, deleteExtra, totalAprovado, totalPendente } =
    useTrabalhoExtra(empresaId);
  const [form, setForm] = useState<TeFormData>(emptyTeForm);
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approverName, setApproverName] = useState('');

  useEffect(() => {
    if (osId) fetchByOs(osId);
  }, [osId, fetchByOs]);

  const handleAdd = async () => {
    if (!form.descricao.trim()) return;
    setSaving(true);
    const result = await addExtra(osId, form);
    setSaving(false);
    if (result) setForm(emptyTeForm);
  };

  const confirmApprove = async (id: string) => {
    const ok = await updateEstado(id, 'aprovado', approverName.trim() || undefined);
    if (ok) {
      setApprovingId(null);
      setApproverName('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Total Aprovado
          </div>
          <div className="text-xl font-semibold text-green-600">{fmtEUR(totalAprovado)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Total Pendente
          </div>
          <div className="text-xl font-semibold text-amber-600">{fmtEUR(totalPendente)}</div>
        </div>
      </div>

      <Separator />

      {/* Lista */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum trabalho extra registado nesta OS.
          </p>
        ) : (
          items.map((item) => {
            const est = TE_ESTADOS[item.estado];
            const isPending = item.estado === 'pendente_aprovacao';
            const isApproved = item.estado === 'aprovado';
            return (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{item.descricao}</div>
                    <Badge variant="outline" className={`${est.color} ${est.bg} border-current`}>
                      {est.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Qtd: </span>
                      <span className="font-medium">{item.quantidade}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Preço Unit: </span>
                      <span className="font-medium">{fmtEUR(item.precoUnit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-semibold">{fmtEUR(item.total)}</span>
                    </div>
                  </div>

                  {item.observacoes && (
                    <div className="text-sm text-muted-foreground border-l-2 border-muted pl-2">
                      {item.observacoes}
                    </div>
                  )}

                  {isApproved && item.aprovadoPor && (
                    <div className="text-xs text-muted-foreground">
                      Aprovado por: {item.aprovadoPor}
                      {item.dataAprovacao && ` em ${item.dataAprovacao}`}
                    </div>
                  )}

                  {approvingId === item.id ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        placeholder="Nome do cliente"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        className="h-8"
                      />
                      <Button size="sm" onClick={() => confirmApprove(item.id)}>
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setApprovingId(null);
                          setApproverName('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => setApprovingId(item.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => updateEstado(item.id, 'rejeitado')}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                          </Button>
                        </>
                      )}
                      {isApproved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={() => updateEstado(item.id, 'faturado')}
                        >
                          <Receipt className="h-4 w-4 mr-1" /> Faturar
                        </Button>
                      )}
                      {isPending && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground ml-auto"
                          onClick={() => deleteExtra(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Separator />

      {/* Formulário */}
      <div className="space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Registar Trabalho a Mais
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Descrição *</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Pintura adicional na parede sul"
            />
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input
              type="number"
              step="0.01"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
            />
          </div>
          <div>
            <Label className="flex items-center gap-1">
              <Euro className="h-3 w-3" /> Preço Unitário
            </Label>
            <Input
              type="number"
              step="0.01"
              value={form.precoUnit}
              onChange={(e) => setForm({ ...form, precoUnit: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={saving || !form.descricao.trim()}>
          <Plus className="h-4 w-4 mr-1" /> {saving ? 'A registar...' : 'Registar Extra'}
        </Button>
      </div>
    </div>
  );
}

export default OsExtrasTab;
