import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Info, ExternalLink, Bug } from 'lucide-react';

export default function ConfigSobre() {
  const { empresa } = useEmpresa();

  const systemInfo = [
    { label: 'Versão', value: '1.0.0' },
    { label: 'Nome do Sistema', value: 'Liberty — Sistema Híbrido de Gestão Empresarial' },
    { label: 'Supabase Project ID', value: 'qeskzaodgfveidyeghbm' },
    { label: 'Empresa ativa', value: empresa?.nome || 'Nenhuma' },
    { label: 'Data de lançamento', value: '11/03/2026' },
  ];

  const copySystemInfo = () => {
    const info = systemInfo.map(i => `${i.label}: ${i.value}`).join('\n');
    navigator.clipboard.writeText(info);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sobre o Sistema</h1>
        <p className="text-muted-foreground text-sm">Informações sobre o Liberty</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Info className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Liberty</h2>
              <p className="text-sm text-muted-foreground">Sistema Híbrido de Gestão Empresarial</p>
              <Badge variant="outline" className="mt-1">v1.0.0</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Técnicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemInfo.map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Reportar um problema</p>
              <p className="text-xs text-muted-foreground">Copie as informações técnicas e descreva o problema</p>
            </div>
            <Button variant="outline" size="sm" onClick={copySystemInfo}>
              <Bug className="h-4 w-4 mr-1" />
              Copiar Info Técnica
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
