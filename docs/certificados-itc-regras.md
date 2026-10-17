# Certificados do ITC — regras de emissão

**Instituto de Treinamentos e Resgate do Amapá — ITC** · Clariza School
Atualizado em 15/10/2026 · Versão publicada: `index-Dj4ZDGkn` (App Clariza e teste.webtechinformatica.com)

Este documento reúne todas as regras aplicadas pelo Clariza na emissão dos certificados do ITC. As regras estão no código (`src/lib/generateCertificadoPDF.ts`, `src/lib/reconhecimentoCertificado.ts`, `src/lib/responsabilidadeTecnica.ts`, `src/lib/qualificacaoInstrutor.ts`, `src/lib/aproveitamentoAluno.ts`, `src/lib/certificadoEmissao.ts`) e valem para todo certificado emitido ou gerado novamente.

---

## 1. Emissão, codificação e arquivo

- Cada certificado recebe uma **codificação única** no formato `ITC-AAAA-XXXXXX` (ex.: `ITC-2026-HYJB2Y`), gerada pelo banco de dados.
- No momento da emissão, o PDF é **gerado e arquivado** (bucket privado `school-certificados`). O botão **«Ver PDF»** abre o arquivo guardado; não gera um novo.
- Também é guardado um **instantâneo** dos dados impressos (aluno, curso, conteúdo programático, objetivo, metodologia, reconhecimento, instrutor, datas), para que alterar o curso depois não reescreva o que já foi certificado.
- **«Gerar PDF»** (um certificado) e **«Gerar PDFs de novo»** (toda a lista visível) refazem o PDF com a versão atual do certificado, **mantendo a codificação, a data de emissão e o QR code**. O PDF é refeito com os dados **atuais** do curso, do aluno e do instrutor.
- **Validade:** data de emissão + `validade_meses` do curso. Sem validade definida, a caixa mostra «Sem validade».
- **Conclusão:** é a data de término do curso. Só na falta dela é usada a data de emissão (caso de 2.ª via).

---

## 2. Frente do certificado

### 2.1 Arte e logotipos
- A frente é impressa sobre a arte aprovada do ITC (`/assets/certificado/itc/cert_page_1_branco.png`), que já traz os três logotipos: **ITC** (esquerda), **Mais.com em português** — «Arborismo · Resgate…» (centro) e **CEE — Conselho Estadual de Educação do Amapá** (direita).
- **Cursos de bombeiros** (ver §5): o logotipo do centro é substituído pelo **brasão do Corpo de Bombeiros Militar do Amapá (CBMAP)** — arte `cert_page_1_branco-bombeiros.png`.
- ⚠️ A versão da Mais.com em **inglês** («Tree Climbing · Rescue») é a arte antiga e **não deve ser usada**.

### 2.2 Ordem dos dados
1. «O **Instituto de Treinamentos e resgate do Amapá - ITC** confere este certificado de conclusão de curso a:»
2. **Nome do aluno** em letra cursiva, com linha roxa abaixo.
3. **CPF** (`CPF: 000.000.000-00`).
4. **Direção Defensiva:** o DETRAN exige **RENACH** e **Categoria da CNH** — impressos só neste curso, abaixo do CPF.
5. **Assinatura do aluno:** linha com a legenda «Assinatura do(a) aluno(a)», 12 mm abaixo do CPF (ou do RENACH), com espaço acima para o aluno assinar.
6. **Curso**, depois **Carga Horária · Início · Conclusão**.
7. **Tipo de treinamento** (Inicial, Periódico, Reciclagem, Eventual, Complementar) — quando definido.
8. **Empresa ou local de aplicação**.
9. **Local de realização** — só quando é diferente da empresa/local de aplicação.
10. **Codificação do certificado**.
11. **Responsabilidade técnica** (ver §3), em letra menor.
12. **Assinaturas:** Instrutor Responsável (esquerda) e Diretor Pedagógico (direita), com a imagem da assinatura assentada na linha. Uma assinatura ilegível não impede o certificado: sai a linha sem imagem.

### 2.3 Espaço
- Os dados (itens 7 a 11) nunca encostam nas assinaturas: se faltar altura (ex.: Direção Defensiva com RENACH e todas as linhas opcionais), o espaçamento entre as linhas diminui automaticamente (até 70 %).
- **Margens laterais (17/10/2026):** nenhuma linha da frente passa de 180 mm (15 mm de margem de cada lado). Se passar, a letra encolhe até caber. O **nome do curso** que não caiba numa linha a 10 pt é partido em **duas linhas** (pela palavra, a 11 pt) e o resto desce. Vale para todas as linhas centradas — curso, datas, empresa, codificação, responsabilidade técnica.

### 2.3.1 Imagem de fundo do curso
- A imagem de fundo do curso ocupa a **página inteira, também por trás dos logotipos** — como no certificado da Brigada (decisão de 17/10/2026: «é um charme no design»). Não há faixa branca no topo, nem corte, nem esbatimento.
- Nenhuma das imagens de fundo traz logotipos (as 16 foram verificadas a 16/10); o logotipo antigo da Mais.com que chegou a aparecer vinha da cache do navegador, já resolvida.

### 2.4 Qualificação do instrutor
- Abaixo do nome do instrutor aparece **só a formação que credencia a norma do curso** (ex.: num NR-10, «Engenheiro Eletricista — CREA/AP …»; «Bombeiro Civil» não entra). O mapa formação × norma é feito **pela NR**, não pelo curso.
- Se nenhuma formação do instrutor credencia aquela norma, **não se inventa**: imprime-se apenas o nome do instrutor.

---

## 3. Responsabilidade técnica (TRT)

- **TRT n.º CFT2605411510** — CRT-02, Lei 13.639/2018, finalidade Escolar.
- **Responsável técnico:** Renevaldo Machado Cavalcante — Técnico Industrial · CRT-02 n.º 51061562204.
- **Vigência:** 23/01/2026 a **24/12/2026**. Verificação: corporativo.sinceti.net.br/publico (chave a3DZ1).
- **Normas cobertas:** NR-01, NR-05, NR-06, NR-10, **NR-10 SEP**, NR-11, NR-12, NR-13, NR-20, NR-22, NR-23, NR-29, NR-30, NR-33, NR-34, NR-35, NR-37, NR-38, **Direção Defensiva** e **Primeiros Socorros**.
- **Não cobertas** (estão no catálogo): NR-17, NR-18, NR-26 — a confirmar com o responsável técnico.

**Regra em dois níveis:**
- O **nome do responsável técnico aparece sempre**.
- O **número do TRT só aparece** se a norma do curso estiver na lista coberta **e** a data de emissão estiver dentro da vigência. Após 24/12/2026 os certificados deixam de citar o TRT automaticamente.
- A norma é lida do nome do curso («NR-35», «NR 35», «NR35»); **NR-10 SEP** é tratada como norma própria.

---

## 4. Verso do certificado

### 4.1 Conteúdo programático — regra fixa
**O texto nunca sai da tabela nem cobre outros dados.** Se o conteúdo for extenso demais, é abreviado.

O espaço da tabela é calculado **de baixo para cima**, a partir do rodapé: primeiro reserva-se o lugar do objetivo/metodologia, da barra de resumo e das três caixas; a tabela fica com o restante. Se não couber, o sistema aplica, nesta ordem:
1. reduz a letra em etapas: 9,5 → 8,5 → 7,5 → 7 pt;
2. abrevia cada tópico para **2 linhas** e depois para **1 linha**, terminando em «…»;
3. em último caso, mostra os primeiros tópicos e agrupa os demais numa linha **«Outros N tópicos do conteúdo programático»**, com a soma das horas — a **carga horária total continua correta**.

### 4.2 Objetivo e metodologia
- Duas caixas lado a lado, com no máximo **7 linhas** cada; texto maior é abreviado com «…».

### 4.3 Barra de resumo
- Carga Horária · Módulos · Aprovação mínima · **Aproveitamento** (nota do aluno) · Frequência · **Validade** («1 ano» / «3 anos»).
- Aproveitamento e frequência vêm das avaliações e da frequência registradas (não de um campo digitado).

### 4.4 Reconhecimento (ver §6), Verificação e Válido até
- **Verificação de autenticidade:** QR code + «Leia o código ou acesse **itc.clarizaplatform.com/verificar** e introduza a codificação…» — o endereço aparece **sem «https://»** e nunca é partido no meio.
- **Válido até:** caixa verde com a data de vencimento.
- **Rodapé:** vem da arte do verso («Instituto de Treinamentos e Resgate do Amapá – ITC · CNPJ 53.827.322/0001-75 · Macapá, AP · www.itctreinamentos.com») e fica sempre livre.

---

## 5. Cursos de bombeiros

**Quais são:** cursos cujo nome contém **Bombeiro Civil**, **Brigada** (de incêndio/emergência) ou **Proteção Contra Incêndios** — p. ex. «Brigada de Emergência Contra Incêndio (NR-23) — Nível I» e «NR-23 — Proteção Contra Incêndios».

1. **Topo:** brasão do **CBMAP** no lugar da Mais.com.
2. **Reconhecimento** acrescenta a frase do alvará:
   > «Estabelecimento certificado pelo CBMAP — Alvará/Certificação de Funcionamento nº 2161/2026 (Proc. 003772/2026), válido até 11/08/2027.»
   - Diz **«certificado», nunca «credenciado»**: o alvará atesta as **instalações** do ITC, não é credenciamento para formar.
   - Só é impressa se a data de emissão estiver **dentro da validade** do alvará (até 11/08/2027).
   - Documento: «ALVARÁ DO CORPO DE BOMBEIROS - ITC 2026.pdf» (código de autenticidade WA37.S4G1O.7PO9T.ZEVP).
3. **Selo da Equatorial:** para clientes do setor elétrico/engenharia aparece **também nos cursos de bombeiros** (decisão de 02/10/2026, caso Bombeiro Civil para a Energisa).
4. **Espaço:** com a frase do alvará, a letra do reconhecimento reduz de 7,5 até 5,5 pt para caber sem cobrir o selo.

---

## 6. Reconhecimento por cliente do aluno

O texto e o selo do campo **Reconhecimento** dependem do **cliente corporativo** do aluno:

| Cliente do aluno | Texto | Selo |
|---|---|---|
| **Setor elétrico ou de engenharia** (pelo segmento ou pelo nome) | Texto do curso **com** a Diretriz do Grupo Equatorial, quando o curso a cita | **Equatorial** (sempre) |
| **Grupo Ipiranga** | Texto do curso **sem** a Equatorial + «Instituição de ensino credenciada pelo Grupo Ipiranga.» | **Ipiranga** |
| **Demais clientes e alunos particulares** | Só o reconhecimento do **CEE-AP** e o alinhamento à norma | Nenhum |

- O **Grupo Ipiranga tem prioridade**: a Etecon é de engenharia, mas é tratada como Ipiranga.
- A classificação «elétrico/engenharia» procura no segmento ou no nome: *energ*, *elétric*, *transmiss*, *engenharia*, *eletromec*. Ex.: a Edifica Engenharia (construção civil) recebe o selo Equatorial por ter «Engenharia» no nome — **correto, conforme a regra**.
- **Frase da Diretriz Equatorial:** «… e à Diretriz de Treinamento e Homologação de Instituição de Ensino e Instrutores do Grupo Equatorial (Versão 2 — abril/2023)».
- **Texto padrão** (curso sem reconhecimento próprio): «Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP), em conformidade com as Normas Regulamentadoras do Ministério do Trabalho e Emprego.»

### 6.1 Clientes por grupo (cadastro em 15/10/2026)
- **Equatorial — elétrico/engenharia (11):** 3E Eficiência Energética, Aggreko Energia, Construpower Engenharia, Edifica Engenharia, Energisa Amazonas Transmissora, Engnort Engenharia, Ethéria Engenharia, Linhas de Macapá Transmissora, Voltalia Serviços do Brasil, Zopone Engenharia.
- **Ipiranga (5):** Ipiranga Produtos de Petróleo, Etecon, Bureau Veritas do Brasil Inspeções, Caramuru Alimentos, Cianport. A regra também reconhece «Transdourada» (ainda não cadastrada).
- **Só CEE-AP (14):** AFAPLAN, Belga Construções, Cadam, Cometa Construções, José M. Barroso De Almeida Junior, Lima Transportes, Master Construções, Reginaldo Martinho Bet, SENAI, Sociedade Beneficente São Camilo, Tel Telecomunicações, TGE Serviços e Transportes, Training Management Specialists, Trophy Treinamentos.

### 6.2 Cursos que citam a Diretriz do Grupo Equatorial (33)
- **Eletricidade:** NR-10 Básico; NR-10 Básico — Reciclagem Bienal; NR-10 SEP; NR-10 SEP — Reciclagem Bienal; Eletricista de Linhas Elétricas de Alta e Baixa Tensão (NR-10, NR-10 SEP e NR-35).
- **Altura e içamento:** NR-35 — Formação Inicial; NR-35 — Treinamento Periódico; Operação de Cestas Aéreas; Movimentação de Cargas (Guindaste Veicular); Operadores de Equipamento de Guindar.
- **Espaço confinado (NR-33):** Trabalhador Autorizado e Vigia (inicial e periódico); Supervisor de Entrada (inicial e periódico); Equipe de Emergência e Salvamento (inicial e periódico bianual).
- **Incêndio e emergência:** Brigada de Emergência Contra Incêndio (NR-23) — Nível I; NR-23 — Proteção Contra Incêndios; Atendimento Pré-Hospitalar (APH); Primeiros Socorros; Suporte Básico de Vida (SBV).
- **Inflamáveis (NR-20):** Trabalhador em Área Classe I — Intermediário; Reciclagem Bienal.
- **Máquinas e ferramentas:** Motosserra e/ou Moto Poda; Máquina de Corte (Esmerilhadeira, Lixadeira, Serra Clipper, Serra Mármore e Policorte); Operador de Bomba d'Água; Operador de Hidrojato.
- **Direção:** Direção Defensiva; Direção Defensiva — Reciclagem.
- **CIPA:** Graus de Risco 1, 2, 3 e 4.

---

## 7. Endereços e publicação

- O ITC é atendido por **App Clariza** (app.clarizaplatform.com / **itc.clarizaplatform.com**) e **teste.webtechinformatica.com** — ambos com a mesma versão.
- O Clariza é publicado **somente a partir da pasta `clariza-app-dev`**. Em 11/10 e 14/10/2026 uma publicação feita a partir da cópia antiga (`clariza-app`) trouxe de volta o gerador e a arte antigos (logotipo em inglês, tabela transbordando, rodapé coberto); corrigido em 15/10/2026.
- Antes de publicar, conferir a arte da frente: `cert_page_1_branco.png` correta tem MD5 começando por `de01c490`.
- **Cache do navegador (16/10/2026):** a arte tem sempre o mesmo nome de arquivo. Antes, o servidor a entregava como «válida por 1 ano, imutável», e quem tinha aberto o sistema quando a arte ainda era a antiga continuava gerando certificados com o logotipo da Mais.com em inglês, mesmo depois da correção. Agora: (1) o gerador pede a arte com `cache: no-cache` (sempre confere com o servidor); (2) o nginx dos quatro endereços entrega `/assets/certificado/` com `Cache-Control: no-cache`. **Nunca remover nenhuma das duas proteções.** A data em que um PDF foi gravado não diz com qual arte ele saiu.

---

## 8. Histórico das decisões

| Data | Decisão |
|---|---|
| 23/09/2026 | Logotipo da Mais.com trocado para a versão em português |
| 27/08/2026 | Responsabilidade técnica: RT sempre; nº do TRT só com NR coberta e dentro da vigência |
| 02/10/2026 | Reconhecimento e selo pelo cliente do aluno (Equatorial / Ipiranga / CEE-AP) |
| 02/10/2026 | Cursos de bombeiros: brasão do CBMAP e frase do alvará (só dentro da validade) |
| 02/10/2026 | Selo Equatorial sempre para clientes elétrico/engenharia, inclusive cursos de bombeiros |
| 15/10/2026 | Conteúdo programático nunca transborda; abreviação automática |
| 15/10/2026 | Campo de assinatura do aluno abaixo do nome/CPF |
| 15/10/2026 | Botão «Gerar PDFs de novo» para aplicar a versão atual aos certificados já emitidos |
| 16/10/2026 | Arte do certificado sem cache (gerador e servidor), para o logotipo antigo não voltar |
| 17/10/2026 | Nenhuma linha passa das margens (nome de curso longo em 2 linhas); imagem de fundo na página inteira, também por trás dos logotipos (como na Brigada) |
