/* eslint-disable @typescript-eslint/no-explicit-any -- a tabela auditoria não está nos tipos gerados do Supabase */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aplicarFiltroModulo, type RegistoAuditoria } from '@/lib/auditoriaFrases';

/**
 * Leitura da auditoria total (`public.auditoria`, escrita por gatilho na base).
 *
 * Quem pode ver o quê decide-o a BASE (regra `auditoria_leitura`): só
 * administradores, e só das empresas/grupos a que têm acesso. Aqui não se
 * filtra por empresa ativa de propósito — o relatório é «tudo o que eu posso
 * ver», e o filtro de empresa é opcional.
 */

export type TipoAcaoFiltro = 'todas' | 'criou' | 'alterou' | 'apagou' | 'marcou' | 'entrou';

export interface FiltrosAuditoria {
  /** auth_uid de quem fez; 'sistema' = sem conta (automático / SQL Editor). */
  autor: string;
  empresaId: string;
  modulo: string;
  acao: TipoAcaoFiltro;
  /** yyyy-MM-dd, no fuso do computador. */
  de: string;
  ate: string;
  pesquisa: string;
  incluirAutomaticas: boolean;
  /** Histórico de um registo concreto: ignora período e ação. */
  registo: { tabela: string; registoId: string; rotulo: string | null } | null;
}

export const POR_PAGINA = 50;
const LIMITE_EXPORTACAO = 10000;

/** Início/fim do dia local em ISO (o filtro anterior usava UTC e falhava uma hora no verão). */
function inicioDoDia(d: string) { const [a, m, dia] = d.split('-').map(Number); return new Date(a, m - 1, dia).toISOString(); }
function fimDoDia(d: string) { const [a, m, dia] = d.split('-').map(Number); return new Date(a, m - 1, dia, 23, 59, 59, 999).toISOString(); }

function aplicarFiltros(query: any, f: FiltrosAuditoria): any {
  let q = query;
  if (f.registo) {
    q = q.eq('tabela', f.registo.tabela).eq('registo_id', f.registo.registoId);
  } else {
    if (f.de) q = q.gte('quando', inicioDoDia(f.de));
    if (f.ate) q = q.lte('quando', fimDoDia(f.ate));
    switch (f.acao) {
      case 'criou': q = q.eq('operacao', 'INSERT'); break;
      case 'apagou': q = q.eq('operacao', 'DELETE'); break;
      case 'alterou': q = q.eq('operacao', 'UPDATE').or('campos.is.null,campos.neq.{ultimo_acesso}'); break;
      case 'marcou': q = q.eq('operacao', 'UPDATE').or('campos.cs.{concluido},campos.cs.{concluida}'); break;
      case 'entrou': q = q.eq('tabela', 'liberty_utilizadores').eq('campos', '{ultimo_acesso}'); break;
      default: q = q.or('campos.is.null,campos.neq.{ultimo_acesso}'); // «todas» sem as entradas na app
    }
    if (!f.incluirAutomaticas) q = q.eq('automatica', false);
  }
  if (f.autor === 'sistema') q = q.is('auth_uid', null);
  else if (f.autor !== 'todos') q = q.eq('auth_uid', f.autor);
  if (f.empresaId !== 'todas') q = q.eq('empresa_id', f.empresaId);
  if (f.modulo !== 'todos') q = aplicarFiltroModulo(q, f.modulo);
  // vírgulas, parênteses e asteriscos partem a sintaxe do filtro «or» do PostgREST
  const termo = f.pesquisa.trim().replace(/[,()*\\]/g, ' ').trim();
  if (termo) q = q.or(`rotulo.ilike.*${termo}*,contexto.ilike.*${termo}*,autor_nome.ilike.*${termo}*`);
  return q;
}

/** A tabela ainda não existe na base (migração por correr). */
function faltaMigracao(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /auditoria/.test(error.message ?? '') && /does not exist|not find/i.test(error.message ?? '');
}

export function useAuditoria(filtros: FiltrosAuditoria, pagina: number) {
  const [registos, setRegistos] = useState<RegistoAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [semMigracao, setSemMigracao] = useState(false);

  const carregar = useCallback(async () => {
    setACarregar(true);
    setErro(null);
    const base = (supabase.from('auditoria' as any) as any)
      .select('*', { count: 'exact' })
      .order('quando', { ascending: false })
      .order('id', { ascending: false })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1);
    const { data, count, error } = await aplicarFiltros(base, filtros);
    if (error) {
      setSemMigracao(faltaMigracao(error));
      setErro(error.message);
      setRegistos([]);
      setTotal(0);
    } else {
      setSemMigracao(false);
      setRegistos((data ?? []) as RegistoAuditoria[]);
      setTotal(count ?? 0);
    }
    setACarregar(false);
  }, [filtros, pagina]);

  useEffect(() => { void carregar(); }, [carregar]);

  return { registos, total, aCarregar, erro, semMigracao, recarregar: carregar };
}

/** Todos os registos do filtro (para exportar), em blocos de 1000, até 10 000. */
export async function lerTodosParaExportar(filtros: FiltrosAuditoria): Promise<{ registos: RegistoAuditoria[]; cortado: boolean }> {
  const todos: RegistoAuditoria[] = [];
  for (let desde = 0; desde < LIMITE_EXPORTACAO; desde += 1000) {
    const base = (supabase.from('auditoria' as any) as any)
      .select('*')
      .order('quando', { ascending: false })
      .order('id', { ascending: false })
      .range(desde, desde + 999);
    const { data, error } = await aplicarFiltros(base, filtros);
    if (error) throw new Error(error.message);
    todos.push(...((data ?? []) as RegistoAuditoria[]));
    if (!data || data.length < 1000) return { registos: todos, cortado: false };
  }
  return { registos: todos, cortado: true };
}

export interface PessoaAuditoria { authUid: string; nome: string; email: string; inativo: boolean }

/** Pessoas para o filtro: as fichas de utilizador (o nome da FICHA, nunca do profiles). */
export function usePessoasAuditoria() {
  const [pessoas, setPessoas] = useState<PessoaAuditoria[]>([]);
  useEffect(() => {
    void (async () => {
      const { data } = await (supabase.from('liberty_utilizadores') as any)
        .select('auth_user_id, nome, email, ativo, eliminado')
        .order('nome');
      const vistos = new Set<string>();
      const lista: PessoaAuditoria[] = [];
      for (const u of (data ?? []) as { auth_user_id: string; nome: string; email: string; ativo: boolean | null; eliminado: boolean | null }[]) {
        if (!u.auth_user_id || vistos.has(u.auth_user_id)) continue;
        vistos.add(u.auth_user_id);
        lista.push({ authUid: u.auth_user_id, nome: u.nome?.trim() || u.email, email: u.email, inativo: !u.ativo || !!u.eliminado });
      }
      setPessoas(lista);
    })();
  }, []);
  return pessoas;
}
