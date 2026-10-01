# Clariza Vertical Design System — especificação

Valores lidos do protótipo aprovado em `clariza-vertical-concept.mauriciocruzbarreto.chatgpt.site`
a 12/08/2026, ecrã **Clariza Educa Pro**. Não são estimativas a olho: foram
extraídos com `getComputedStyle` do próprio protótipo.

Este ficheiro existe porque o protótipo está atrás de autenticação e pode
mudar ou desaparecer. Quem retomar o trabalho tem aqui a fonte.

## Paleta base (dark)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#121214` | fundo da aplicação |
| `--surface` | `#1a1a1d` | painéis e cartões |
| `--surface2` | `#202024` | superfície elevada (bloco da empresa, switcher) |
| `--line` | `#2b2b30` | bordas e divisórias |
| `--text` | `#f7f7f8` | texto principal |
| `--muted` | `#8e8e9a` | texto secundário |
| `--teal` | `#1e939c` | Clariza Teal |
| `--purple` | `#5b459b` | Clariza Purple |

O fundo do protótipo é **neutro** (`#121214`), não o Clariza Dark quente
(`#231F20`) da identidade impressa. A marca entra pelo acento e pelo símbolo,
não pelo fundo.

## Estrutura

| Elemento | Medidas |
|---|---|
| Sidebar | largura `245px`, fundo `#171719`, padding `18px 14px`, borda direita `#2b2b30` |
| Topbar | altura `65px`, fundo `#151517`, borda inferior `#2b2b30`, padding `0 30px` |
| Conteúdo | largura máxima `1720px`, padding `30px` |

## Raios

`6px` ícone · `8px` botão primário · `9px` item de navegação ativo e pesquisa ·
`12px` bloco da empresa · `13px` switcher · `14px` cartões e painéis

## Componentes

**Item de navegação ativo** — fundo do acento a ~18% de opacidade, raio `9px`,
padding `0 10px`, texto branco.

**Ícone de navegação** — quadrado `20×20`, raio `6px`, fundo do acento a 18%,
letra a `9px`.

**Etiqueta de secção** (`OPERAÇÃO`) — `9px`, peso `700`, letter-spacing `1.62px`,
cor `#666670`.

**Eyebrow** (`CURSOS & E-LEARNING`) — `11px`, peso `800`, letter-spacing `0.16em`,
cor do acento.

**Bloco da empresa** — fundo `#202024`, raio `12px`, padding `10px`, borda `#2b2b30`.

**Pesquisa** — fundo `#1d1d20`, raio `9px`, borda `#2c2c31`, largura `310px`, `12px`.

**Botão primário** — fundo do acento clareado, raio `8px`, `11px`, peso `700`.

**Cartão de métrica** — raio `14px`, padding `17px`, altura mínima `142px`,
borda a 1px. O cartão em destaque leva `linear-gradient(135deg, accent, #1a1a1d)`
e borda da cor do acento.

**Painel** — fundo `#1a1a1d`, borda `#29292e`, raio `14px`, padding `18px`.

**Métrica** — rótulo `11px` esbatido, valor `25px` com letter-spacing `-0.03em`.

**Badge de tendência** — verde `#55c991` sobre o mesmo a 9%, raio `10px`,
padding `4px 7px`, `9px`.

**Sparkline** — barras de `3px` de largura, `29px` de altura, cor do acento a
65% de opacidade, ancorada em baixo à direita do cartão.

## Símbolo Clariza

Três barras ascendentes, alinhadas em baixo, `gap 3px`, altura total `22px`,
largura `6px`, raio `2px`:

1. Teal `#1e939c`, altura `9px`
2. Purple `#5b459b`, altura `15px`
3. Gradiente `#f3b247 → #c45e58`, altura `22px`

Variante `small`: altura `19px`, barras de `5px`.

**Na aplicação usa-se o ficheiro oficial do logótipo, não esta reconstrução.**
Fica registada apenas para se perceber a lógica do símbolo — clareza, dados,
crescimento.

## Acento por vertical

| Vertical | Valor na BD | Acento |
|---|---|---|
| Store | — | Teal `#1e939c` |
| Build | — | Orange `#f3b247` |
| Flow | — | Azul-teal `#2b8fc7` |
| Agency | — | Purple `#5b459b` |
| Educa Pro | `school` | Purple claro `#6960c5` |

Só o ITC tem `vertical` preenchido na base de dados (`school`). Os restantes
verticais ficam preparados no CSS e acendem quando a coluna for preenchida —
não se inventou dado nenhum para isso.
