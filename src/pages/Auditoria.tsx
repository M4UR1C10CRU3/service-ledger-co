import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search, Activity, User, BarChart3, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { format, parseISO, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface AuditRecord {
  id: string;
  utilizador_nome: string;
  utilizador_id: string;
  data_hora: string;
  modulo: string;
  acao: string;
  descricao: string;
  entidade_tipo: string | null;
  entidade_ref: string | null;
}

const PAGE_SIZE = 50;

const Auditoria = () => {
  const { empresa } = useEmpresa();
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [filterUser, setFilterUser] = useState<string>('todos');
  const [filterModule, setFilterModule] = useState<string>('todos');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [searchText, setSearchText] = useState('');

  // Available options
  const [users, setUsers] = useState<{ id: string; nome: string }[]>([]);
  const [modules, setModules] = useState<string[]>([]);

  // KPI data
  const [kpis, setKpis] = useState({ mostActiveUser: '', mostUsedModule: '', todayCount: 0, weekCount: 0 });

  useEffect(() => {
    if (!empresa) return;
    loadOptions();
    loadKPIs();
  }, [empresa]);

  useEffect(() => {
    if (!empresa) return;
    loadRecords();
  }, [empresa, page, filterUser, filterModule, filterDateStart, filterDateEnd, searchText]);

  const loadOptions = async () => {
    if (!empresa) return;
    // Distinct users
    const { data: uData } = await (supabase.from('liberty_atividades') as any)
      .select('utilizador_id, utilizador_nome')
      .eq('empresa_id', empresa.id)
      .limit(100);
    if (uData) {
      const unique = new Map<string, string>();
      uData.forEach((r: any) => unique.set(r.utilizador_id, r.utilizador_nome));
      setUsers(Array.from(unique.entries()).map(([id, nome]) => ({ id, nome })));
    }
    // Distinct modules
    const { data: mData } = await (supabase.from('liberty_atividades') as any)
      .select('modulo')
      .eq('empresa_id', empresa.id)
      .limit(500);
    if (mData) {
      const modsSet = new Set<string>();
      mData.forEach((r: any) => modsSet.add(String(r.modulo)));
      const mods = Array.from(modsSet).sort();
      setModules(mods);
    }
  };

  const loadKPIs = async () => {
    if (!empresa) return;
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

    // Today count
    const { count: tc } = await (supabase.from('liberty_atividades') as any)
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa.id)
      .gte('data_hora', todayStart)
      .lte('data_hora', todayEnd);

    // Week count
    const { count: wc } = await (supabase.from('liberty_atividades') as any)
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa.id)
      .gte('data_hora', weekStart)
      .lte('data_hora', weekEnd);

    // Most active user this week
    const { data: weekData } = await (supabase.from('liberty_atividades') as any)
      .select('utilizador_nome')
      .eq('empresa_id', empresa.id)
      .gte('data_hora', weekStart)
      .lte('data_hora', weekEnd)
      .limit(500);

    let mostActiveUser = '-';
    if (weekData && weekData.length > 0) {
      const counts: Record<string, number> = {};
      weekData.forEach((r: any) => { counts[r.utilizador_nome] = (counts[r.utilizador_nome] || 0) + 1; });
      mostActiveUser = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    }

    // Most used module this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: monthData } = await (supabase.from('liberty_atividades') as any)
      .select('modulo')
      .eq('empresa_id', empresa.id)
      .gte('data_hora', monthStart)
      .limit(500);

    let mostUsedModule = '-';
    if (monthData && monthData.length > 0) {
      const counts: Record<string, number> = {};
      monthData.forEach((r: any) => { counts[r.modulo] = (counts[r.modulo] || 0) + 1; });
      mostUsedModule = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    }

    setKpis({ mostActiveUser, mostUsedModule, todayCount: tc || 0, weekCount: wc || 0 });
  };

  const loadRecords = async () => {
    if (!empresa) return;
    setIsLoading(true);

    let query = (supabase.from('liberty_atividades') as any)
      .select('id, utilizador_id, utilizador_nome, data_hora, modulo, acao, descricao, entidade_tipo, entidade_ref', { count: 'exact' })
      .eq('empresa_id', empresa.id)
      .order('data_hora', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterUser !== 'todos') query = query.eq('utilizador_id', filterUser);
    if (filterModule !== 'todos') query = query.eq('modulo', filterModule);
    if (filterDateStart) query = query.gte('data_hora', `${filterDateStart}T00:00:00.000Z`);
    if (filterDateEnd) query = query.lte('data_hora', `${filterDateEnd}T23:59:59.999Z`);
    if (searchText.trim()) query = query.ilike('descricao', `%${searchText.trim()}%`);

    const { data, count, error } = await query;
    if (!error && data) {
      setRecords(data);
      setTotalCount(count || 0);
    }
    setIsLoading(false);
  };

  const handleExportExcel = () => {
    const rows = records.map(r => ({
      'Data/Hora': format(parseISO(r.data_hora), 'dd/MM/yyyy HH:mm'),
      Utilizador: r.utilizador_nome,
      Módulo: r.modulo,
      Ação: r.acao,
      Descrição: r.descricao,
      Entidade: r.entidade_ref || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
    XLSX.writeFile(wb, `auditoria_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria de Atividades</h1>
          <p className="text-sm text-muted-foreground">Registo global de ações dos utilizadores no sistema</p>
        </div>
        <Button variant="outline" onClick={handleExportExcel} className="gap-2">
          <Download className="w-4 h-4" /> Exportar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><User className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-sm font-bold text-foreground truncate">{kpis.mostActiveUser}</p>
              <p className="text-xs text-muted-foreground">Mais ativo (semana)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-sm font-bold text-foreground truncate">{kpis.mostUsedModule}</p>
              <p className="text-xs text-muted-foreground">Módulo top (mês)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Activity className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-lg font-bold text-foreground">{kpis.todayCount}</p>
              <p className="text-xs text-muted-foreground">Ações hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Clock className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-lg font-bold text-foreground">{kpis.weekCount}</p>
              <p className="text-xs text-muted-foreground">Ações esta semana</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Label className="text-xs">Pesquisa</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Pesquisar na descrição..." value={searchText} onChange={e => { setSearchText(e.target.value); setPage(0); }} />
          </div>
        </div>
        <div className="w-[180px]">
          <Label className="text-xs">Utilizador</Label>
          <Select value={filterUser} onValueChange={v => { setFilterUser(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px]">
          <Label className="text-xs">Módulo</Label>
          <Select value={filterModule} onValueChange={v => { setFilterModule(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[140px]">
          <Label className="text-xs">De</Label>
          <Input type="date" value={filterDateStart} onChange={e => { setFilterDateStart(e.target.value); setPage(0); }} />
        </div>
        <div className="w-[140px]">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={filterDateEnd} onChange={e => { setFilterDateEnd(e.target.value); setPage(0); }} />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">A carregar...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nenhum registo encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Entidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(parseISO(r.data_hora), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.utilizador_nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{r.modulo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.acao}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{r.descricao}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.entidade_ref || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {totalCount} registos · Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auditoria;
