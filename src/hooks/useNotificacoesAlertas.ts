import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

function alertKey(empresaId: string, tipo: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `liberty_alerta_${empresaId}_${tipo}_${date}`;
}

function jaVisto(empresaId: string, tipo: string): boolean {
  try { return localStorage.getItem(alertKey(empresaId, tipo)) === '1'; }
  catch { return false; }
}

function marcarVisto(empresaId: string, tipo: string): void {
  try { localStorage.setItem(alertKey(empresaId, tipo), '1'); }
  catch { /* ignorar */ }
}

export function useNotificacoesAlertas() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (!empresa || ran.current) return;
    ran.current = true;

    const verificar = async () => {
      const eid = empresa.id;
      const today = new Date().toISOString().split('T')[0];
      const in7d  = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0];
      const in30d = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const [ppRes, teRes, subRes] = await Promise.all([
        supabase
          .from('plano_pagamentos')
          .select('id, valor, data_prevista, estado')
          .eq('empresa_id', eid)
          .in('estado', ['pendente', 'aguarda_comprovativo']),
        supabase
          .from('trabalhos_extra')
          .select('id, valor')
          .eq('empresa_id', eid)
          .eq('estado', 'pendente_aprovacao'),
        supabase
          .from('subempreiteiros')
          .select('id, nome, alvara_validade, seguro_validade')
          .eq('empresa_id', eid)
          .eq('ativo', true)
          .eq('eliminado', false),
      ]);

      const pp  = ppRes.data  || [];
      const te  = teRes.data  || [];
      const sub = subRes.data || [];

      const alertas: Array<() => void> = [];

      // 1 — Cobranças vencidas (crítico)
      const vencidas = pp.filter(r => r.data_prevista && r.data_prevista < today);
      if (vencidas.length > 0 && !jaVisto(eid, 'cobrancas_vencidas')) {
        const total = vencidas.reduce((s, r) => s + Number(r.valor), 0);
        alertas.push(() => {
          toast({
            title: `⚠️ ${vencidas.length} cobrança${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''}`,
            description: `Total em atraso: ${fmt(total)}. Aceda ao Dashboard Executivo.`,
            variant: 'destructive',
          });
          marcarVisto(eid, 'cobrancas_vencidas');
        });
      }

      // 2 — Cobranças nos próximos 7 dias
      const proximas = pp.filter(r => r.data_prevista && r.data_prevista >= today && r.data_prevista <= in7d);
      if (proximas.length > 0 && !jaVisto(eid, 'cobrancas_proximas')) {
        const total = proximas.reduce((s, r) => s + Number(r.valor), 0);
        alertas.push(() => {
          toast({
            title: `🔔 ${proximas.length} cobrança${proximas.length > 1 ? 's' : ''} nos próximos 7 dias`,
            description: `Total previsto: ${fmt(total)}`,
          });
          marcarVisto(eid, 'cobrancas_proximas');
        });
      }

      // 3 — Trabalhos extra por aprovar
      if (te.length > 0 && !jaVisto(eid, 'extras_aprovar')) {
        const total = te.reduce((s, r) => s + Number(r.valor), 0);
        alertas.push(() => {
          toast({
            title: `🔧 ${te.length} trabalho${te.length > 1 ? 's' : ''} extra por aprovar`,
            description: `Valor total pendente: ${fmt(total)}`,
          });
          marcarVisto(eid, 'extras_aprovar');
        });
      }

      // 4 — Documentos de subempreiteiros a expirar (30 dias)
      const docsExpirar = sub.filter(s =>
        (s.alvara_validade  && s.alvara_validade  >= today && s.alvara_validade  <= in30d) ||
        (s.seguro_validade  && s.seguro_validade  >= today && s.seguro_validade  <= in30d)
      );
      if (docsExpirar.length > 0 && !jaVisto(eid, 'docs_expirar')) {
        alertas.push(() => {
          toast({
            title: `📄 Documentos a expirar em breve`,
            description: `${docsExpirar.length} subempreiteiro${docsExpirar.length > 1 ? 's' : ''} com alvará ou seguro a vencer nos próximos 30 dias`,
          });
          marcarVisto(eid, 'docs_expirar');
        });
      }

      // Mostrar alertas com intervalo de 800ms para não empilhar
      alertas.forEach((fn, i) => {
        setTimeout(fn, 1500 + i * 900);
      });
    };

    verificar();
  }, [empresa]);
}
