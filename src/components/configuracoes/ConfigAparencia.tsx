import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { Save, Sun, Moon, Monitor } from 'lucide-react';
import { applyTema, applyDensidade, applyFonte, applySidebarCor, applySidebarTexto, SIDEBAR_PRESETS, SIDEBAR_TEXTO_PRESETS, saveAppearance, loadAppearance } from '@/lib/applyAppearance';

export default function ConfigAparencia() {
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const { utilizador } = usePermissionsContext();
  const [loading, setLoading] = useState(false);

  const [tema, setTema] = useState<string>('escuro');
  const [densidade, setDensidade] = useState('normal');
  const [tamanhoFonte, setTamanhoFonte] = useState(14);
  const [sidebarExpandida, setSidebarExpandida] = useState(true);
  const [sidebarCor, setSidebarCor] = useState<string>('padrao');
  const [sidebarTexto, setSidebarTexto] = useState<string>('padrao');

  // Carregar preferências (localStorage primeiro para resposta imediata, depois DB)
  useEffect(() => {
    const local = loadAppearance();
    if (local.tema) setTema(local.tema);
    if (local.densidade) setDensidade(local.densidade);
    if (typeof local.tamanhoFonte === 'number') setTamanhoFonte(local.tamanhoFonte);
    if (typeof local.sidebarExpandida === 'boolean') setSidebarExpandida(local.sidebarExpandida);
    if (local.sidebarCor) setSidebarCor(local.sidebarCor);
    if (local.sidebarTexto) setSidebarTexto(local.sidebarTexto);
  }, []);

  useEffect(() => {
    if (!utilizador) return;
    const load = async () => {
      const { data } = await (supabase.from('liberty_configuracoes_utilizador') as any)
        .select('*')
        .eq('utilizador_id', utilizador.id)
        .maybeSingle();
      if (data) {
        const t = data.tema || 'escuro';
        const d = data.densidade || 'normal';
        const f = data.tamanho_fonte || 14;
        setTema(t);
        setDensidade(d);
        setTamanhoFonte(f);
        setSidebarExpandida(data.sidebar_expandida ?? true);
        applyTema(t);
        applyDensidade(d);
        applyFonte(f);
        saveAppearance({ tema: t, densidade: d, tamanhoFonte: f, sidebarExpandida: data.sidebar_expandida ?? true });
      }
    };
    load();
  }, [utilizador]);

  // Aplicar imediatamente ao mudar (preview ao vivo)
  useEffect(() => { applyTema(tema); }, [tema]);
  useEffect(() => { applyDensidade(densidade); }, [densidade]);
  useEffect(() => { applyFonte(tamanhoFonte); }, [tamanhoFonte]);
  useEffect(() => { applySidebarCor(sidebarCor); }, [sidebarCor]);
  useEffect(() => { applySidebarTexto(sidebarTexto); }, [sidebarTexto]);

  const handleSave = async () => {
    if (!utilizador) return;
    setLoading(true);
    try {
      const configData = {
        utilizador_id: utilizador.id,
        tema,
        densidade,
        tamanho_fonte: tamanhoFonte,
        sidebar_expandida: sidebarExpandida,
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

      // Aplicar e persistir localmente
      applyTema(tema);
      applyDensidade(densidade);
      applyFonte(tamanhoFonte);
      applySidebarCor(sidebarCor);
      applySidebarTexto(sidebarTexto);
      saveAppearance({ tema, densidade, tamanhoFonte, sidebarExpandida, sidebarCor, sidebarTexto });

      logActivity({
        modulo: 'Configurações',
        acao: 'atualizou_aparencia',
        descricao: 'Atualizou preferências de aparência',
        entidade_tipo: 'configuracao',
      });

      toast({ title: 'Preferências guardadas' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aparência</h1>
          <p className="text-muted-foreground text-sm">Personalize o aspeto visual do Liberty</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'A guardar...' : 'Guardar'}
        </Button>
      </div>

      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tema do Sistema</CardTitle>
          <CardDescription>Modo de visualização</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { value: 'claro', label: 'Claro', icon: Sun },
              { value: 'escuro', label: 'Escuro', icon: Moon },
              { value: 'sistema', label: 'Sistema', icon: Monitor },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTema(opt.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  tema === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <opt.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Densidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Densidade da Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={densidade} onValueChange={setDensidade} className="flex gap-4">
            {['compacto', 'normal', 'espaçoso'].map(d => (
              <div key={d} className="flex items-center space-x-2">
                <RadioGroupItem value={d} id={`densidade-${d}`} />
                <Label htmlFor={`densidade-${d}`} className="capitalize cursor-pointer">{d}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Tamanho Fonte */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tamanho de Fonte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Pequeno (13px)</span>
            <span className="font-medium text-foreground">{tamanhoFonte}px</span>
            <span>Grande (16px)</span>
          </div>
          <Slider
            value={[tamanhoFonte]}
            onValueChange={v => setTamanhoFonte(v[0])}
            min={13}
            max={16}
            step={1}
          />
        </CardContent>
      </Card>

      {/* Cor do Menu Lateral */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cor do Menu Lateral</CardTitle>
          <CardDescription>Escolha um tema para a barra lateral — pensado também para baixa luminosidade e leitura confortável</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SIDEBAR_PRESETS.map(p => {
              const selected = sidebarCor === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSidebarCor(p.id)}
                  className={`group relative rounded-lg border-2 overflow-hidden transition-all text-left ${
                    selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <div
                    className="h-16 w-full flex items-end p-2"
                    style={{ backgroundColor: `hsl(${p.bg})`, color: `hsl(${p.fg})` }}
                  >
                    <div className="flex gap-1">
                      <span className="h-2 w-6 rounded" style={{ backgroundColor: `hsl(${p.accent})` }} />
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(${p.fg})` }} />
                    </div>
                  </div>
                  <div className="px-2.5 py-2 bg-card">
                    <div className="text-xs font-medium text-foreground truncate">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cor do Texto da Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cor do Texto do Menu Lateral</CardTitle>
          <CardDescription>Reforce o contraste do texto para melhor legibilidade — útil em baixa luz ou para utilizadores com dificuldades visuais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SIDEBAR_TEXTO_PRESETS.map(p => {
              const selected = sidebarTexto === p.id;
              const currentBg = (SIDEBAR_PRESETS.find(s => s.id === sidebarCor) || SIDEBAR_PRESETS[0]);
              const previewFg = p.fg || currentBg.fg;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSidebarTexto(p.id)}
                  className={`group relative rounded-lg border-2 overflow-hidden transition-all text-left ${
                    selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <div
                    className="h-14 w-full flex items-center justify-center px-2"
                    style={{ backgroundColor: `hsl(${currentBg.bg})`, color: `hsl(${previewFg})` }}
                  >
                    <span className="text-sm font-semibold truncate">Aa Menu</span>
                  </div>
                  <div className="px-2 py-1.5 bg-card">
                    <div className="text-xs font-medium text-foreground truncate">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Menu Lateral (Sidebar)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Menu expandido por defeito</Label>
              <p className="text-xs text-muted-foreground">Quando desativado, o menu inicia recolhido</p>
            </div>
            <Switch checked={sidebarExpandida} onCheckedChange={setSidebarExpandida} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
