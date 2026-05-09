## Plano — Refinamento do Módulo de Marketing

Este é um conjunto de 7 alterações alinhadas, com impacto em vários ficheiros do módulo Marketing (apenas Marketing — nada fora dele será tocado). Antes de avançar, gostaria que confirmasse o âmbito porque algumas decisões mudam significativamente o esforço e o comportamento final.

---

### Pontos a confirmar antes da implementação

1. **Transição automática "Agendado → Publicado" por horário**
A regra exige que o sistema "monitorize em tempo real" os horários por plataforma e mova o card sozinho quando o horário mais tardio for atingido. Sem um agendador no servidor (cron job), isto só funciona enquanto algum utilizador tiver o browser aberto. Proponho:
   - Criar um **edge function** `marketing-publish-scheduled` invocado por **pg_cron a cada 5 minutos**, que detecta cards "agendado" cujo horário máximo já passou e move-os para "publicado" + cria notificação. Isto garante funcionamento mesmo sem ninguém logado.
   - Em paralelo, no frontend, um interval de 60s força refresh quando há cards agendados visíveis (UX imediata).

2. **Bloqueio do drag manual**
"Restrito apenas a administradores" — vou usar o perfil `administrador` da tabela `liberty_utilizadores` (já existente). Não-admin perde drag-and-drop; transições só ocorrem via botões de acção do card.

3. **Notificações automáticas**
Vou usar a infraestrutura existente (registos em `marketing_comentarios` tipo `sistema` + `liberty_atividades`) para registar a transição. Notificações por email ficam fora deste plano salvo indicação contrária.

---

### Implementação proposta (7 alterações)

**1. Sidebar** — em `AppSidebar.tsx`, renomear o item "Kanban Editorial" para "Kanban" dentro do submenu Marketing, garantindo que ficam apenas 2 opções: Kanban e Calendário Editorial.

**2. Rename "Em Produção" → "Em Criação"**
- `src/types/marketing.ts`: alterar `STATUS_CONFIG.em_producao.label` para `🎨 Em Criação`. (mantenho a chave `em_producao` para não migrar BD; é só label.)
- Procurar por "Em Produção" / "em_producao" em todos os ficheiros do módulo Marketing e ajustar textos visíveis.
- `ETAPA_CONFIG.criacao.label` já é "Criação" — manter.

**3. Fluxo automático de progressão**

Migration:
- Acrescentar colunas a `marketing_tarefas` (se ainda não existirem):
  `revisor_id uuid`, `revisor_nome text`, `prazo_revisao date`, `hora_revisao time`,
  `agendador_id uuid`, `agendador_nome text`,
  `agendamento_confirmado boolean default false`,
  `agendamento_horarios jsonb` (formato `{ "instagram": "14:00", "facebook": "08:00" }`).
- Activar pg_cron + criar job a invocar edge function de cada 5 min.

Edge function `marketing-publish-scheduled`:
- Para cada empresa, lê tarefas com `status='agendado'`, `data_publicacao = hoje`, `agendamento_confirmado=true`, e calcula o horário máximo em `agendamento_horarios`. Se já passou → update status='publicado' + insert em `marketing_comentarios` tipo `sistema`.

Frontend:
- `MarketingDetailDialog` ganha botões contextuais por etapa actual:
  - Em Criação: **"Concluir criação"** → status=em_revisao + comentário sistema + (TODO email).
  - Em Revisão: **"Aprovar revisão"** → em_aprovacao; **"Devolver para criação"** (modal com comentário obrigatório) → em_producao com comentário visível.
  - Em Aprovação: **"Aprovar"** → agendado; **"Rejeitar"** → em_revisao com comentário.
  - Agendado: bloco de agendamento (alteração 5) + **"Confirmar agendamento"**.
- Bloqueio drag: `MarketingKanban` recebe prop `canDragFreely` (true só para admins via `usePermissions`/perfil). Quando false, `draggable={false}` e ignora drop.

**4. Fluxo de Revisão no card**
- Em `MarketingTarefaDialog` (form): adicionar secção "Fluxo de Revisão" com selector de utilizador (revisor) + data + hora.
- No detail dialog: mostrar essa info + os botões já descritos acima.

**5. Agendamento por plataforma**
- Quando status=agendado, `MarketingDetailDialog` mostra para cada canal seleccionado uma linha com input `time` (guarda em `agendamento_horarios`). Botão "Confirmar agendamento" guarda + define `agendamento_confirmado=true`.
- Helper `getMaxScheduledTime(tarefa)` para cálculo do horário gatilho (usado no edge function e no frontend).

**6. Sincronização Calendário ↔ Kanban**
- `MarketingCalendar.tsx`: badges de status passam a depender SÓ de `tarefa.status`. Mostrar "Agendado" só se status==='agendado'; "Publicado" só se status==='publicado'. Caso contrário, sem badge avançado (só prioridade/canal).
- `MarketingEditorialCalendar.tsx`: já liga via `tarefa_id` em `marketing_editorial_posts`. Reforçar que badges derivam do status real da tarefa associada.
- Realtime: subscrever channel Postgres em `marketing_tarefas` e refrescar listagens.

**7. Fix visualizador de ficheiros (Alteração 7)**
- O problema actual: `onPointerDownOutside` / `onInteractOutside` fazem `preventDefault()` mas ainda assim algum handler intermédio fecha. Refazer com **portal próprio fora do `<Dialog>`**: quando `preview` está aberto, renderizar a galeria via `createPortal(document.body)` totalmente fora da árvore Radix do dialog principal. Assim cliques nunca são interpretados como "outside".
- Isto resolve cliques em fechar (×), setas, "abrir em nova aba" e thumbnails (que ficam clicáveis para saltar).
- Manter listeners de teclado (ESC, ←/→).

---

### Ficheiros a alterar

- `src/components/AppSidebar.tsx` (alt. 1)
- `src/types/marketing.ts` (alt. 2)
- `src/components/marketing/MarketingKanban.tsx` (drag restrict, label)
- `src/components/marketing/MarketingTarefaDialog.tsx` (campos revisor)
- `src/components/marketing/MarketingDetailDialog.tsx` (botões fluxo + agendamento + fix visualizador)
- `src/components/marketing/MarketingCalendar.tsx` e `MarketingEditorialCalendar.tsx` (sync badges + realtime)
- `src/hooks/useMarketing.ts` (transitions helpers + realtime)
- Migration SQL (novas colunas + pg_cron)
- Nova edge function `supabase/functions/marketing-publish-scheduled/index.ts`

---

### Confirmações que peço antes de implementar

a) **OK avançar com pg_cron + edge function** para a transição automática "Agendado → Publicado"? (alternativa pior: só funciona quando há browser aberto)

b) **OK bloquear drag-and-drop para não-administradores**, deixando só transições por botões? (alternativa: manter drag livre e tratar botões como "atalho")

c) **Notificações = só comentário sistema + activity log** por agora (sem email)? Posso integrar email mais tarde.

Confirma estas três (a/b/c) e avanço com a implementação completa das 7 alterações.