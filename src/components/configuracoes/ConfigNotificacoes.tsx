import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { Save, Bell, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ALERT_TYPES = [
  { key: 'followup_vencido', label: 'Follow-up vencido', desc: 'Quando um follow-up passa da data sem registo' },
  { key: 'proposta_expirada', label: 'Proposta expirada', desc: 'Quando uma proposta passa a validade' },
  { key: 'stock_rutura', label: 'Stock em rutura', desc: 'Quando um artigo atinge stock zero' },
  { key: 'stock_minimo', label: 'Stock abaixo mínimo', desc: 'Quando stock cai abaixo do mínimo definido' },
  { key: 'avaliacao_pendente', label: 'Avaliação pendente', desc: 'Quando uma avaliação fica por realizar' },
  { key: 'avaliacao_vencida', label: 'Avaliação vencida', desc: 'Quando a data prevista de avaliação passou' },
  { key: 'entrevista_hoje', label: 'Entrevista agendada hoje', desc: 'Lembrete de entrevistas do dia' },
  { key: 'followup_7dias', label: 'Follow-up sem contacto há 7 dias', desc: 'Oportunidade sem actividade' },
  { key: 'followup_14dias', label: 'Follow-up sem contacto há 14 dias', desc: 'Oportunidade em risco de abandono' },
  { key: 'debito_atraso', label: 'Débito em atraso', desc: 'Cliente com pagamento em atraso' },
];

export default function ConfigNotificacoes({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const { utilizador } = usePermissionsContext();
  const [loading, setLoading] = useState(false);

  const [alertas, setAlertas] = useState<Record<string, boolean>>(
    Object.fromEntries(ALERT_TYPES.map(a => [a.key, true]))
  );
  const [resumoDiario, setResumoDiario] = useState(false);
  const [horaResumo, setHoraResumo] = useState('08:00');
  const [alertasEmail, setAlertasEmail] = useState(true);
  const [emailDestino, setEmailDestino] = useState('');

  useEffect(() => {
    if (!utilizador) return;
    const load = async () => {
      const { data } = await (supabase.from('liberty_configuracoes_utilizador') as any)
        .select('*')
        .eq('utilizador_id', utilizador.id)
        .maybeSingle();
      if (data) {
        if (data.alertas_ativos && typeof data.alertas_ativos === 'object') {
          setAlertas(prev => ({ ...prev, ...data.alertas_ativos }));
        }
        setResumoDiario(data.notif_resumo_diario ?? false);
        setHoraResumo(data.notif_hora_resumo || '08:00');
        setAlertasEmail(data.notif_alertas_email ?? true);
        setEmailDestino(data.notif_email_destino || utilizador.email || '');
      } else {
        setEmailDestino(utilizador.email || '');
      }
    };
    load();
  }, [utilizador]);

  const handleSave = async () => {
    if (!utilizador) return;
    setLoading(true);
    try {
      const configData = {
        utilizador_id: utilizador.id,
        alertas_ativos: alertas,
        notif_resumo_diario: resumoDiario,
        notif_hora_resumo: horaResumo,
        notif_alertas_email: alertasEmail,
        notif_email_destino: emailDestino,
        atualizado_em: new Date().toISOString(),
      };

      const { data: existing } = await (supabase.from('liberty_configuracoes_utilizador') as any)
        .select('id')
        .eq('utilizador_id', utilizador.id)
        .maybeSingle();

      if (existing) {
        await (supabase.from('liberty_configuracoes_utilizador') as any)
          .update(configData)
          .eq('utilizador_id', utilizador.id);
      } else {
        await (supabase.from('liberty_configuracoes_utilizador') as any)
          .insert(configData);
      }

      logActivity({
        modulo: 'Configurações',
        acao: 'atualizou_notificacoes',
        descricao: 'Atualizou preferências de notificação',
        entidade_tipo: 'configuracao',
      });

      toast({ title: 'Preferências de notificação guardadas' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const defaultTab = activeTab === 'preferencias-email' ? 'email' : 'alertas';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground text-sm">Configure os alertas e notificações do sistema</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'A guardar...' : 'Guardar'}
        </Button>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="alertas" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Alertas do Sistema</TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Preferências de Email</TabsTrigger>
        </TabsList>

        <TabsContent value="alertas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Alerta</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-20 text-center">Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALERT_TYPES.map(alert => (
                    <TableRow key={alert.key}>
                      <TableCell className="font-medium">{alert.label}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{alert.desc}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={alertas[alert.key] ?? true}
                          onCheckedChange={v => setAlertas(prev => ({ ...prev, [alert.key]: v }))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferências de Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Receber resumo diário por email</Label>
                  <p className="text-xs text-muted-foreground">Resumo das atividades e alertas do dia</p>
                </div>
                <Switch checked={resumoDiario} onCheckedChange={setResumoDiario} />
              </div>
              {resumoDiario && (
                <div>
                  <Label>Hora de envio do resumo</Label>
                  <Input type="time" value={horaResumo} onChange={e => setHoraResumo(e.target.value)} className="w-32" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Receber alertas urgentes por email</Label>
                  <p className="text-xs text-muted-foreground">Notificações imediatas para eventos críticos</p>
                </div>
                <Switch checked={alertasEmail} onCheckedChange={setAlertasEmail} />
              </div>
              <div>
                <Label>Email de destino para notificações</Label>
                <Input value={emailDestino} onChange={e => setEmailDestino(e.target.value)} className="max-w-sm" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
