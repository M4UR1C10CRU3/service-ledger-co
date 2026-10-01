import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCatalogo, useTextosPadrao } from '@/hooks/useAgencyCatalogo';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import { TIPOS_TEXTO, type ItemCatalogo, type TextoPadrao, type TipoTexto } from '@/types/agency';
import { BookOpen, Plus, Trash2, FileText, Tag } from 'lucide-react';

export default function Catalogo() {
  const { categorias, itens, isLoading, criarCategoria, guardarItem, removerItem } = useCatalogo();
  const { textos, guardar: guardarTexto, remover: removerTexto } = useTextosPadrao();
  const { eur } = useAgencyPais();

  const [itemAberto, setItemAberto] = useState(false);
  const [item, setItem] = useState<Partial<ItemCatalogo>>({ designacao: '', unidade: 'und' });
  const [novaCat, setNovaCat] = useState('');
  const [textoAberto, setTextoAberto] = useState(false);
  const [texto, setTexto] = useState<Partial<TextoPadrao>>({ tipo: 'introducao', nome: '', conteudo: '' });

  const nomeCat = (id: string | null | undefined) =>
    categorias.find(c => c.id === id)?.nome ?? '—';

  const abrirItem = (i?: ItemCatalogo) => {
    setItem(i ? { ...i } : { designacao: '', unidade: 'und' });
    setItemAberto(true);
  };

  const submeterItem = async () => {
    if (!item.designacao?.trim()) return;
    await guardarItem.mutateAsync(item as any);
    setItemAberto(false);
  };

  const abrirTexto = (t?: TextoPadrao) => {
    setTexto(t ? { ...t } : { tipo: 'introducao', nome: '', conteudo: '' });
    setTextoAberto(true);
  };

  const submeterTexto = async () => {
    if (!texto.nome?.trim() || !texto.conteudo?.trim()) return;
    await guardarTexto.mutateAsync(texto as any);
    setTextoAberto(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Catálogo e textos</h1>
          <p className="text-sm text-muted-foreground">
            O que se pode vender e os textos que se repetem em cada proposta
          </p>
        </div>
      </div>

      <Tabs defaultValue="itens">
        <TabsList>
          <TabsTrigger value="itens"><Tag className="h-4 w-4 mr-1" /> Peças e serviços</TabsTrigger>
          <TabsTrigger value="textos"><FileText className="h-4 w-4 mr-1" /> Textos reutilizáveis</TabsTrigger>
        </TabsList>

        {/* ITENS */}
        <TabsContent value="itens" className="mt-4 space-y-4">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <Label className="text-xs">Nova categoria</Label>
              <div className="flex gap-2">
                <Input value={novaCat} placeholder="Ex.: Design, Vídeo, Social..."
                       onChange={e => setNovaCat(e.target.value)}
                       onKeyDown={e => {
                         if (e.key === 'Enter' && novaCat.trim()) { criarCategoria.mutate(novaCat); setNovaCat(''); }
                       }} />
                <Button variant="outline" onClick={() => { if (novaCat.trim()) { criarCategoria.mutate(novaCat); setNovaCat(''); } }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={() => abrirItem()}><Plus className="h-4 w-4 mr-2" /> Novo item</Button>
          </div>

          <Card><CardContent className="p-0">
            {isLoading ? (
              <p className="text-center py-12 text-muted-foreground">A carregar...</p>
            ) : itens.length === 0 ? (
              <div className="text-center py-16">
                <Tag className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">
                  O catálogo está vazio. Os itens que criar aqui ficam disponíveis para escolher nas propostas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Designação</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Horas previstas</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map(i => (
                      <TableRow key={i.id} className="cursor-pointer hover:bg-muted/40" onClick={() => abrirItem(i)}>
                        <TableCell className="font-medium">{i.designacao}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{nomeCat(i.categoriaId)}</Badge></TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{i.codigo || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {i.precoUnitario != null ? eur(i.precoUnitario) : '—'}
                          <span className="text-muted-foreground text-xs"> /{i.unidade}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {i.horasPrevistasPadrao != null ? `${i.horasPrevistasPadrao}h` : '—'}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => removerItem.mutate(i.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent></Card>

          <p className="text-xs text-muted-foreground max-w-2xl">
            As <strong>horas previstas</strong> são o que permite transformar uma proposta aprovada em jobs
            automaticamente — cada linha vendida passa a ser trabalho na pauta, sem re-digitação.
          </p>
        </TabsContent>

        {/* TEXTOS */}
        <TabsContent value="textos" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => abrirTexto()}><Plus className="h-4 w-4 mr-2" /> Novo texto</Button>
          </div>
          {textos.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                Sem textos guardados. Introduções, considerações finais e condições de pagamento
                que se repetem em cada proposta guardam-se aqui uma vez.
              </p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {textos.map(t => (
                <Card key={t.id} className="cursor-pointer hover:shadow-sm" onClick={() => abrirTexto(t)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{t.nome}</span>
                          <Badge variant="outline" className="text-xs">{TIPOS_TEXTO[t.tipo]}</Badge>
                          {t.padrao && <Badge className="text-xs">Padrão</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.conteudo}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                              onClick={e => { e.stopPropagation(); removerTexto.mutate(t.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo item */}
      <Dialog open={itemAberto} onOpenChange={setItemAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>{item.id ? 'Editar item' : 'Novo item de catálogo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Designação *</Label>
              <Input value={item.designacao ?? ''} placeholder="Ex.: Cartaz A3 — conceito e arte final"
                     onChange={e => setItem(s => ({ ...s, designacao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={item.categoriaId ?? ''} onValueChange={v => setItem(s => ({ ...s, categoriaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Código</Label>
                <Input value={item.codigo ?? ''} onChange={e => setItem(s => ({ ...s, codigo: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Preço</Label>
                <Input type="number" step="0.01" value={item.precoUnitario ?? ''}
                       onChange={e => setItem(s => ({ ...s, precoUnitario: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input value={item.unidade ?? 'und'} onChange={e => setItem(s => ({ ...s, unidade: e.target.value }))} />
              </div>
              <div>
                <Label>Horas previstas</Label>
                <Input type="number" step="0.5" value={item.horasPrevistasPadrao ?? ''}
                       onChange={e => setItem(s => ({ ...s, horasPrevistasPadrao: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={item.descricao ?? ''}
                        onChange={e => setItem(s => ({ ...s, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemAberto(false)}>Cancelar</Button>
            <Button onClick={submeterItem} disabled={!item.designacao?.trim() || guardarItem.isPending}>
              {guardarItem.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo texto */}
      <Dialog open={textoAberto} onOpenChange={setTextoAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>{texto.id ? 'Editar texto' : 'Novo texto reutilizável'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={texto.tipo} onValueChange={v => setTexto(s => ({ ...s, tipo: v as TipoTexto }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_TEXTO).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome</Label>
                <Input value={texto.nome ?? ''} placeholder="Como o vai reconhecer"
                       onChange={e => setTexto(s => ({ ...s, nome: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea rows={6} value={texto.conteudo ?? ''}
                        onChange={e => setTexto(s => ({ ...s, conteudo: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={!!texto.padrao}
                        onCheckedChange={c => setTexto(s => ({ ...s, padrao: !!c }))} />
              <Label className="cursor-pointer">Usar como texto por omissão para este tipo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTextoAberto(false)}>Cancelar</Button>
            <Button onClick={submeterTexto}
                    disabled={!texto.nome?.trim() || !texto.conteudo?.trim() || guardarTexto.isPending}>
              {guardarTexto.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
