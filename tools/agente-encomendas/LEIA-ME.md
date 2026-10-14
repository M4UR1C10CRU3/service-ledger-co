# Encomendas da loja → Clariza (Tudo Casa - Warm)

Encomenda **paga** na loja (lojatudocasa.com) → cartão automático no quadro **«Encomendas da loja»** da Tudo Casa - Warm, com folha de encomenda em PDF, checklist por fornecedor e aviso por e-mail ao Maurício Barreto. O agente deste PC cria a pasta no APPS01 e leva para o cartão as faturas-recibo e comprovativos que lá forem guardados.

## Peças

| Peça | Onde | O que faz |
|---|---|---|
| Base de dados + quadro | `supabase/migrations/20261014120000_ecommerce_encomendas.sql` | Tabelas `ecommerce_config` e `ecommerce_encomendas`; quadro com 7 colunas |
| Função `wc-encomenda` | `supabase/functions/wc-encomenda` | Recebe o webhook da loja; abre o cartão quando a encomenda fica paga |
| Função `ecommerce-agente` | `supabase/functions/ecommerce-agente` | Atende o agente do PC da loja |
| Agente | esta pasta | Tarefa agendada a cada 30 min no PC da loja |

## Instalação (por esta ordem)

1. **Base de dados** — correr o SQL da migração no SQL Editor do Supabase (94 linhas).
2. **Segredos** (Supabase › Edge Functions › Secrets) — criar dois valores aleatórios longos e guardá-los:
   - `WC_WEBHOOK_SECRET` — o mesmo valor vai no «Segredo» do webhook da loja;
   - `ECOMMERCE_AGENTE_TOKEN` — o mesmo valor vai no `config.json` do agente.
   Para gerar um valor no PowerShell: `-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | % {[char]$_})`
3. **Publicar as funções** (na pasta `clariza-app-dev`):
   `npx supabase functions deploy wc-encomenda ecommerce-agente --project-ref qeskzaodgfveidyeghbm`
4. **Webhook na loja** — WooCommerce › Definições › Avançado › Webhooks › Adicionar:
   - Nome: `Clariza — encomendas pagas` · Estado: Ativo · Tópico: **Pedido atualizado**
   - URL de entrega: `https://qeskzaodgfveidyeghbm.supabase.co/functions/v1/wc-encomenda`
   - Segredo: o valor de `WC_WEBHOOK_SECRET` · Versão da API: WP REST API v3
5. **Agente no PC da loja** — copiar esta pasta para o PC da loja (ex.: `C:\Clariza\agente-encomendas`).
   - clique direito em `gerar-token.ps1` › Executar com o PowerShell: grava um token novo no `config.json` e mostra-o uma vez com a impressão digital; colá-lo no Supabase em `ECOMMERCE_AGENTE_TOKEN` e confirmar que o «DIGERIR» começa pela mesma impressão digital;
   - clique direito em `instalar.ps1` › Executar com o PowerShell: cria a tarefa agendada e faz o primeiro teste.

## Regras

- O cartão só abre com a encomenda **paga** (estado «Em processamento» ou «Concluída»). Repetições não duplicam cartões.
- Fornecedor pela referência: `E3-` Elektro3, `DB-` Delba, `SC-` Saniclass. Por agora todos os artigos aparecem como «sem stock em loja» (inventário em conferência).
- Pasta: `…\DEP. PRODUÇÃO_VENDAS\Ano AAAA\MM - Mês\Encomenda #N - Nome Apelido - 90,99€ - DD MM AAAA` (data da encomenda).
- O agente anexa ao cartão qualquer PDF novo da pasta, exceto a própria folha de encomenda. Ficheiros começados por «Fatura» marcam «Fatura-recibo emitida no PHC»; começados por «Comp» marcam «Comprovativo de pagamento».
- Se o PC estiver desligado, faz o que ficou em atraso na execução seguinte.
- Registo de atividade: `agente.log` nesta pasta.
