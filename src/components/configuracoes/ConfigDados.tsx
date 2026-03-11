import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, Wrench, FileSpreadsheet, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

const EXPORT_MODULES = [
  { key: 'clientes', label: 'Clientes', table: 'clientes' },
  { key: 'propostas', label: 'Propostas', table: 'propostas' },
  { key: 'produtos', label: 'Produtos / Artigos', table: 'produtos' },
  { key: 'articles', label: 'Stocks (Artigos)', table: 'articles' },
  { key: 'suppliers', label: 'Fornecedores', table: 'suppliers' },
  { key: 'employees', label: 'Colaboradores', table: 'employees' },
  { key: 'cash_flows', label: 'Financeiro (Fluxo de Caixa)', table: 'cash_flows' },
  { key: 'liberty_atividades', label: 'Atividades / Auditoria', table: 'liberty_atividades' },
];

export default function ConfigDados({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const { logActivity } = useActivityLogger();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (mod: typeof EXPORT_MODULES[0]) => {
    if (!empresa) return;
    setExporting(mod.key);
    try {
      const hasEmpresaFilter = !['clientes'].includes(mod.table);
      let query = (supabase as any).from(mod.table).select('*');
      if (hasEmpresaFilter) {
        query = query.eq('empresa_id', empresa.id);
      }
      const { data, error } = await query.limit(10000);
      if (error) throw error;

      const ws = XLSX.utils.json_to_sheet(data || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, mod.label);
      XLSX.writeFile(wb, `${mod.label}_${empresa.slug}_${new Date().toISOString().slice(0, 10)}.xlsx`);

      logActivity({
        modulo: 'Configurações',
        acao: 'exportou_dados',
        descricao: `Exportou dados de ${mod.label}`,
        entidade_tipo: 'exportacao',
      });

      toast({ title: 'Exportação concluída', description: `${(data || []).length} registos exportados` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na exportação', description: error.message });
    } finally {
      setExporting(null);
    }
  };

  const defaultTab = activeTab === 'importar' ? 'importar' : activeTab === 'manutencao' ? 'manutencao' : 'exportar';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Dados</h1>
        <p className="text-muted-foreground text-sm">Exporte, importe e faça manutenção dos dados do sistema</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="exportar" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Exportar</TabsTrigger>
          <TabsTrigger value="importar" className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Importar</TabsTrigger>
          <TabsTrigger value="manutencao" className="gap-1.5"><Wrench className="h-3.5 w-3.5" /> Manutenção</TabsTrigger>
        </TabsList>

        <TabsContent value="exportar">
          <div className="grid grid-cols-2 gap-4">
            {EXPORT_MODULES.map(mod => (
              <Card key={mod.key}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{mod.label}</p>
                      <p className="text-xs text-muted-foreground">Excel (.xlsx)</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(mod)}
                    disabled={exporting === mod.key}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    {exporting === mod.key ? 'A exportar...' : 'Exportar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="importar">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Importar Dados</CardTitle>
              <CardDescription>Funcionalidade de importação disponível em breve</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">A funcionalidade de importação está em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manutencao">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Limpeza e Manutenção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Arquivar propostas expiradas</p>
                    <p className="text-xs text-muted-foreground">Move propostas com mais de 1 ano para estado "Arquivada"</p>
                  </div>
                  <Button variant="outline" size="sm">Executar</Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Limpar notificações lidas</p>
                    <p className="text-xs text-muted-foreground">Remove notificações com mais de 30 dias</p>
                  </div>
                  <Button variant="outline" size="sm">Executar</Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Recalcular totais de stock</p>
                    <p className="text-xs text-muted-foreground">Força recálculo de todos os saldos de stock</p>
                  </div>
                  <Button variant="outline" size="sm">Executar</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Versão do Liberty</p>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última atualização</p>
                    <p className="font-medium">11/03/2026</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Base de dados</p>
                    <p className="font-medium font-mono text-xs">Supabase PostgreSQL</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Empresa ativa</p>
                    <p className="font-medium">{empresa?.nome || 'N/D'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
