## Novo Departamento: Administrativo > Planeamento Estratégico

Módulo totalmente novo, isolado dos restantes. Não toca em nenhum ficheiro de outros departamentos exceto `AppSidebar.tsx` e `App.tsx` (adição de entradas).

---

### 1. Base de dados (migration)

Novas tabelas (todas com `empresa_id`, RLS para autenticados):

- **`planeamento_cards`** — card principal
  - `titulo`, `descricao`, `objetivo`, `problema_oportunidade`, `impacto_esperado`
  - `coluna` (enum text: `ideia`, `levantamento`, `pesquisa`, `consulta_externa`, `validacao`, `aprovado`, `implementacao`, `concluido`, `arquivado`)
  - `area_negocio` (text), `areas_afetadas` (text[])
  - `prioridade` (`baixa`/`media`/`alta`/`critica`)
  - `responsavel_id`, `responsavel_nome`, `responsaveis_extra` (jsonb)
  - `prazo_estimado` (date), `data_inicio_real`, `data_conclusao_prevista`, `data_conclusao_real`
  - `tags` (text[])
  - Levantamento/Pesquisa: `info_internas`, `referencias_externas`, `notas_pesquisa`
  - Validação: `criterios_validacao` (jsonb), `parecer`, `decisao_final`, `data_decisao`, `decisao_observacoes`
  - Implementação: `plano_implementacao`
  - `ordem` (int p/ ordenação dentro da coluna), `created_at`, `updated_at`

- **`planeamento_anexos`** — ficheiros (geral + por consulta)
  - `card_id`, `consulta_id` (nullable), `nome`, `url`, `mime_type`, `tamanho_bytes`, `uploaded_by_nome`

- **`planeamento_consultas`** — consultas externas
  - `card_id`, `entidade`, `tipo` (juridica/financeira/tecnica/comercial/outra), `data_consulta`, `resumo`

- **`planeamento_checklist`** — checklist de implementação
  - `card_id`, `titulo`, `responsavel_nome`, `prazo`, `concluido`, `concluido_em`, `ordem`

- **`planeamento_historico`** — histórico cronológico
  - `card_id`, `tipo` (criacao/movimento/anexo/consulta/responsavel/prazo/decisao/comentario), `descricao`, `metadata` (jsonb), `utilizador_nome`, `created_at`

- **Storage bucket** `planeamento-anexos` (privado, RLS autenticados).

### 2. Tipos e hook

- `src/types/planeamento.ts` — interfaces TS para card, consulta, checklist, anexo, histórico, colunas, prioridades, áreas.
- `src/hooks/usePlaneamento.ts` — fetch cards por empresa, criar/atualizar/mover/duplicar/arquivar; consultas, checklist, anexos, histórico.

### 3. UI

- `src/pages/PlaneamentoEstrategico.tsx` — página: header (título+subtítulo+botão "Nova Ideia / Projecto"), 4 cards KPI, filtros (responsável, prioridade, área, prazo) + pesquisa, depois o Kanban.
- `src/components/planeamento/PlaneamentoKanban.tsx` — 9 colunas, drag-and-drop com `@dnd-kit` (já no projeto via marketing), contador por coluna.
- `src/components/planeamento/PlaneamentoCard.tsx` — card visual no Kanban (título, chips área/prioridade, responsável, prazo).
- `src/components/planeamento/PlaneamentoCardDialog.tsx` — diálogo com 6 separadores (Visão Geral, Levantamento & Pesquisa, Consultas Externas, Validação & Decisão, Implementação, Histórico). Inclui duplicar/arquivar.
- `src/components/planeamento/PlaneamentoFiltros.tsx` — barra de filtros + pesquisa.
- `src/components/planeamento/PlaneamentoKpis.tsx` — 4 KPIs no topo.

### 4. Navegação

- `AppSidebar.tsx`: adicionar nova secção `Administrativo` (ícone `Building`/`ClipboardList`) com item `Planeamento Estratégico` → `/administrativo/planeamento`.
- `App.tsx`: nova rota lazy `/administrativo/planeamento` → `PlaneamentoEstrategico`.

### 5. Design

- Cor de destaque do módulo `#E8561A` (laranja) aplicada em headers/botões principais via classes utilitárias inline (`bg-[#E8561A]`) sem alterar tokens globais.
- Reaproveitar componentes shadcn existentes (Card, Tabs, Dialog, Select, Badge, Button, Input, Textarea, Checkbox).
- Chips de área e prioridade com paleta subtil seguindo padrão dos outros módulos.

### 6. Multi-empresa / permissões

- Todos os queries filtrados por `empresa_id` do `EmpresaContext`.
- Sem permissões específicas — visível para todos os utilizadores autenticados (sem `permModulo` no sidebar).

### Não toca em

- Nenhum ficheiro de Comercial, Compras, Produção, Financeiro, RH, Marketing.
- Tokens de design globais permanecem inalterados.
