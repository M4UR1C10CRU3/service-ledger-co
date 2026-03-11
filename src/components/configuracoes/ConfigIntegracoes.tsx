import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Database, Zap, Wifi } from 'lucide-react';

export default function ConfigIntegracoes({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseLatency, setSupabaseLatency] = useState<number | null>(null);

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    const start = performance.now();
    try {
      await supabase.from('empresas').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      setSupabaseLatency(latency);
      toast({ title: 'Ligação OK', description: `Latência: ${latency}ms` });
    } catch {
      toast({ variant: 'destructive', title: 'Erro de ligação' });
    } finally {
      setTestingSupabase(false);
    }
  };

  const defaultTab = activeTab === 'api-webhooks' ? 'webhooks' : 'supabase';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground text-sm">Serviços externos e integrações configuradas</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="supabase" className="gap-1.5"><Database className="h-3.5 w-3.5" /> Supabase</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> API e Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="supabase">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Supabase
                  </CardTitle>
                  <CardDescription>Base de dados e autenticação</CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" /> Conectado
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Projeto</Label>
                  <p className="font-mono">qeskzaodgfveidyeghbm</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">URL</Label>
                  <p className="font-mono text-xs">https://qeskzaodgfveidyeghbm.supabase.co</p>
                </div>
                {supabaseLatency !== null && (
                  <div>
                    <Label className="text-muted-foreground">Latência</Label>
                    <p className="font-mono">{supabaseLatency}ms</p>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={handleTestSupabase} disabled={testingSupabase}>
                <Wifi className="h-4 w-4 mr-2" />
                {testingSupabase ? 'A testar...' : 'Testar Ligação'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>Integração com sistemas externos via webhooks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhum webhook configurado</p>
                <p className="text-xs mt-1">Funcionalidade disponível em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
