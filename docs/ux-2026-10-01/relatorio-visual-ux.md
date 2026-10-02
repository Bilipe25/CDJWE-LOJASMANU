# Refinamento visual e UX — PDV, Pedidos e Clientes

Data: 01/10/2026. Base: código do commit `07c4894`, após as correções funcionais anteriores. Método: **Impeccable shape → audit**. Esta entrega é um relatório; não modifica telas, regras de negócio nem dados de produção.

## Parecer de integridade

**Passa quanto à existência de uma identidade coerente; precisa de refinamento operacional.** As três páginas compartilham MUI, azul, superfícies claras, busca, tabelas, estados e componentes. A estrutura corresponde a um PDV real. Entretanto, a distribuição do espaço, as cores semânticas e algumas interações ainda não formam um padrão consistente para atendimento rápido.

O detector mecânico retornou `[]` nos oito arquivos examinados: [detector.json](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/ux-2026-10-01/detector.json). Isso significa apenas ausência de ocorrências nas regras daquele detector. Os problemas abaixo foram encontrados por leitura do código, inspeção visual, DOM e teste de teclado; o resultado vazio não os invalida e não certifica acessibilidade.

**Minha recomendação é preservar o azul e transformar a hierarquia das telas:** produto, itens e total como centro do PDV; busca e situação como centro de Pedidos; identificação e contato como centro de Clientes. A modernização deve aparecer no ritmo, na legibilidade e na clareza das ações.

## 1. Shape — brief confirmado

O usuário confirmou:

- Uso principal em **computador, com teclado e mouse**, por ADMIN e operadores autorizados.
- Maior atrito em **montar e finalizar a venda no PDV**.
- Refinamento das três telas, **mantendo a identidade azul atual** e as regras já corrigidas.
- **Aprovação de imagens antes da implementação**.

**Objetivo:** montar, conferir e registrar um pedido sem procurar o total, perder o contexto do cliente ou interpretar incorretamente o resultado da ação. A consulta de pedidos e clientes deve permitir retomar o atendimento rapidamente.

**Autoridade visual:** o tema e os componentes atuais. Não há necessidade de trocar a marca, a biblioteca ou criar uma nova identidade para esta etapa. As composições propostas neste documento são recomendações para os próximos mockups; ainda não são desenhos aprovados.

**Escopo:** PDV, listagem/detalhes de Pedidos, listagem/cadastro/detalhes de Clientes, layout compartilhado, endereço, filtros, ações, confirmações e feedback. Preservar permissões, escrita transacional, idempotência, proteção de pedidos encerrados, cálculo de valores, múltiplos endereços, principal ativo e endereço histórico do pedido.

**Estados a desenhar:** vazio, busca em andamento, nenhum resultado, produto selecionado, venda em montagem, cliente com vários endereços, campos inválidos, salvamento, sucesso, falha com rascunho preservado, edição e pedido encerrado. Não inventar estoque disponível, crédito, limite, fiado ou sincronização offline.

**Restrições:** Next.js/React/MUI; português brasileiro, reais e datas brasileiras; navegação e operação por teclado; foco visível; contraste adequado; suporte a larguras menores. Volume típico de itens, tipo de mercadoria e tempo atual de atendimento ainda não foram informados. Não há base para prometer redução percentual de tempo.

## 2. Por que o visual parece básico hoje

As páginas têm componentes prontos, mas várias regiões recebem importância semelhante. Indicadores grandes aparecem antes das tarefas; filtros ocupam bastante altura; cartões envolvem outros cartões; ícones e cores se repetem sem aumentar a informação útil. A página informa bastante, mas conduz pouco.

No notebook, a tabela do PDV já exige rolagem horizontal com um único produto. A coluna da venda é longa, e tornar o cartão inteiro sticky não mantém seu botão de conclusão na área visível. Em Clientes, avatar, nome e quatro ações fazem a linha crescer. Em Pedidos, indicadores e filtros abertos deixam a lista começar perto do fim da primeira tela.

Capturas locais com dados fictícios:

| Tela | Evidência |
| --- | --- |
| PDV em notebook | [1366 × 768](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/ux-2026-10-01/pdv-1366.png) |
| PDV em computador compacto | [1024 × 768](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/ux-2026-10-01/pdv-1024.png) |
| Clientes | [1366 × 768](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/ux-2026-10-01/clientes-1366.png) / [390 × 844](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/ux-2026-10-01/clientes-390.png) |
| Pedidos | [1366 × 768](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/ux-2026-10-01/pedidos-1366.png) / [390 × 844](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/ux-2026-10-01/pedidos-390.png) |
| Formulário de cliente | [390 × 844](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/ux-2026-10-01/cliente-formulario-390.png) |

Os botões de ferramentas de desenvolvimento e o elemento flutuante externo do navegador presentes nas capturas não fazem parte da proposta visual do produto.

## 3. PDV — maior investimento e primeira entrega

### Composição recomendada para os mockups

Preservar a organização em produtos/itens e dados da venda, mas compactar o topo e separar a rolagem dos detalhes do resumo financeiro. A quantidade de painéis deve se adaptar à largura útil depois da navegação, e não apenas à largura total da janela.

```text
Cabeçalho: PDV · estado do pedido · ajuda/atalhos
┌────────────────────────────────┬──────────────────────────┐
│ Buscar produto por nome/código │ Cliente e contato        │
│ Produto selecionado + qtd      │ Endereço selecionado     │
│ Preço/desconto quando preciso  │ Atendimento e pagamento  │
├────────────────────────────────┤ Observações opcionais    │
│ Itens: produto, qtd, total     │ Desconto geral           │
│ Edição rápida e ações         │ Detalhes com rolagem      │
├────────────────────────────────┴──────────────────────────┤
│ Itens · subtotal · descontos · TOTAL · ação de registrar  │
└───────────────────────────────────────────────────────────┘
```

Esse esquema define prioridades, não medidas finais. O rodapé deve reservar espaço no conteúdo, funcionar com zoom e não encobrir controles ou foco.

### Refinamentos propostos

| Refinamento | Comportamento esperado | Benefício |
| --- | --- | --- |
| Busca como entrada principal | Nome/código bem visíveis; resultado mostra código e preço; confirmação de inclusão e retorno previsível à busca | Repetir a montagem sem reposicionar o usuário |
| Entrada compacta de produto | Quantidade e ação de adicionar sempre claras; preço, desconto e cor disponíveis conforme necessário | Diminuir altura e competição entre campos |
| Carrinho legível | Nome com espaço real; código secundário; quantidade editável; total alinhado; edição e menu de ações | Conferir mais itens sem rolagem lateral no computador |
| Resumo financeiro persistente | Total e ação principal visíveis enquanto os dados da venda rolam | Reduzir procura e rolagem para concluir |
| Cliente/endereço como contexto | Identificação, telefone e endereço completos em resumo; troca explícita de endereço | Conferir a entrega sem abrir vários blocos |
| Pagamento/atendimento descobertos | Mostrar seleções e pendências no resumo, mesmo quando detalhes estiverem fechados | Evitar descobrir campos obrigatórios apenas ao salvar |
| Desconto com resultado claro | Distinguir item e geral, valor e percentual, aplicação e total resultante | Reduzir interpretação errada |
| Confirmação curta | Reunir cliente, endereço, itens, pagamento, descontos e total; apontar pendências | Preservar a conferência sem repetir a tela inteira |
| Pós-salvamento explícito | Mostrar número e status gravado; oferecer impressão, abrir pedido e nova venda | Dar certeza sobre o que foi concluído |

**Ponto central de texto e fluxo:** o botão atual “Finalizar Pedido” cria um registro com status `PENDENTE`. A mudança para `FINALIZADO` acontece em Pedidos. A proposta inicial é chamar a ação do PDV de **“Salvar pedido”** e mostrar “Pedido salvo · Pendente” no sucesso. Uma ação “Concluir venda” com mudança de status exigiria decisão de negócio e validação própria; não deve ser introduzida só para deixar a tela mais rápida.

A impressão também deve explicitar quando se trata de uma montagem ainda não salva. Imprimir um documento não pode parecer confirmação de gravação. Cancelar e limpar continuam protegidos quando houver trabalho a perder. Cliente permanece opcional onde o contrato atual permitir.

## 4. Pedidos — uma central de consulta e ação

**Proposta:** reduzir o peso do painel de indicadores e colocar busca, situação e período acima da lista. A ação “Novo pedido” leva ao PDV; exportar fica como ação secundária. Preservar a URL, os filtros e a posição ao voltar de uma edição.

- Substituir o bloco dominante de indicadores por uma faixa compacta com rótulos de contexto: resultados da consulta versus indicadores globais, conforme a consulta real de cada dado.
- Manter busca e filtro de situação imediatamente disponíveis. Datas, cliente, atendimento e pagamento ficam em filtros adicionais.
- Mostrar valores reais nos filtros aplicados: “Dinheiro”, “01/10 a 07/10”, nome do tipo. Não mostrar UUID ou somente “Período”.
- Usar tabela com número, data, cliente/contato, total, situação e ações; manter colunas adicionais conforme espaço. Valores alinhados à direita e números tabulares.
- Avaliar detalhes em painel lateral para consultar sem perder a lista. Em telas estreitas, usar tela/dialog adequado. É uma composição a comparar nas imagens, não uma substituição já aprovada.
- Dar nome claro à ação correspondente ao status: editar, finalizar, cancelar, duplicar e imprimir. Exclusão permanece restrita e protegida.
- Preservar os estados de erro/retry e dar estrutura de carregamento compatível com a tabela.

**Resultado desejado:** localizar um pedido, reconhecer sua situação e executar a ação correta com contexto suficiente, sem abrir uma sequência de janelas só para descobrir o básico.

## 5. Clientes — cadastro que ajuda a atender

**Proposta:** busca dominante, seletor de situação compacto e linhas menores, com nome e telefone juntos. Indicadores gerais têm peso secundário. Preservar CPF/email na consulta e edição, sem fazer todas as colunas competirem na lista.

- Agrupar ações comuns: abrir ficha e editar; histórico dentro da ficha; desativar em menu secundário. Todas continuam acessíveis por teclado.
- Avaliar ficha lateral com contato, situação, histórico e endereços. Mostrar todos os endereços relevantes, identificando principal e inativos; hoje o detalhe exibe somente o principal.
- Oferecer “Nova venda para este cliente”, com passagem validada ao PDV. Definir o comportamento se já houver uma venda em montagem para não substituir o rascunho silenciosamente.
- Separar identidade, contato e endereços no formulário. Resumir endereços já preenchidos e expandir o que estiver sendo editado, evitando sete campos abertos para cada endereço.
- No PDV, resumir o endereço escolhido e oferecer “Trocar endereço”. O cadastro continua estruturado; a exibição completa vem do mesmo formatador compartilhado.
- Manter explícita a preservação dos endereços dos pedidos antigos. Uma alteração de cadastro não deve sugerir que documentos históricos foram alterados.

**Resultado desejado:** reconhecer o cliente pelo nome/telefone, conferir seu endereço e começar ou retomar o atendimento sem reconstruir informações.

## 6. Linguagem visual comum

| Elemento | Direção proposta |
| --- | --- |
| Hierarquia | Um título principal e uma ação dominante por contexto; subtítulos descrevem tarefas |
| Cor | Azul para ação/seleção; neutros para leitura; cores de estado com contraste verificado |
| Superfícies | Menos caixas aninhadas; divisores leves; sombra para elevação real |
| Tipografia | Uma família efetivamente disponível; nomes legíveis; valores tabulares; total com maior destaque |
| Densidade | Compactar padding e agrupar dados, preservando legibilidade e alvos utilizáveis |
| Ícones | Apoiar ações; rótulo ou nome acessível consistente; evitar decoração repetitiva |
| Feedback | Informar inclusão, pendência, salvamento e falha; foco previsível; sem movimentar linhas durante leitura |
| Responsividade | Navegação recolhível no computador compacto; detalhes completos e ações explícitas na largura estreita |

Escurecer a interface ou adicionar gradientes não é necessário para atingir o objetivo confirmado. A identidade deve vir da precisão da organização, dos detalhes e do comportamento.

## 7. Audit — qualidade técnica atual

### Pontuação

| Dimensão | Nota / 4 | Principal evidência |
| --- | ---: | --- |
| Acessibilidade | 2 | Contraste e limpeza de filtros pelo teclado |
| Performance | 2 | PDF individual importado diretamente nas duas rotas |
| Responsividade | 2 | Carrinho lateralmente apertado no notebook e detalhes inacessíveis por teclado em Clientes estreito |
| Tema | 3 | Tema compartilhado consistente, com exceções locais e cores semânticas inadequadas |
| Integridade da implementação | 3 | Produto reconhecível; inconsistências localizadas em ações, filtros e hierarquia |
| **Total** | **12/20** | **Aceitável, com trabalho significativo de refinamento** |

Esta nota é um diagnóstico limitado às superfícies examinadas, não certificação WCAG, medição de velocidade de produção ou nova auditoria completa de segurança/backend. **11 achados: 0 P0, 3 P1, 8 P2, 0 P3.** As oportunidades de composição das seções anteriores não são contadas automaticamente como bugs.

### P1 — corrigir antes de publicar o refinamento

**UX-A01 — Contraste insuficiente em valores financeiros.** Categoria: acessibilidade. Local: `src/app/clientes/page.tsx:452`, `:640`, `:646`, `:732`; `src/app/pdv/page.tsx:1449`; cores em `src/app/providers.tsx:32` e `:42`. No DOM de Clientes, compras aparecem em `rgb(16,185,129)`, 14 px, sobre branco: **2,537:1**. No subtotal do PDV, o mesmo verde sobre `#f8fafc` chega a **2,424:1**. O âmbar de valores no detalhe sobre branco tem **2,148:1**, confirmado pela combinação de estilos. São valores de leitura, não decoração. Recomendar tokens próprios para texto semântico, com contraste validado, ou texto neutro com cor no indicador. Não basta escolher `success.dark` sem medir. Comando: `$impeccable colorize`. Referência: [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), que exige 4,5:1 para texto normal e 3:1 para texto grande.

**UX-A02 — “Limpar Filtros” não executa a ação por teclado.** Categoria: acessibilidade/integridade. Local: `src/app/pedidos/page.tsx:751` e `:772`. Com Status=Pendente, o controle recebe foco; **Delete e Enter mantiveram Pendente selecionado**. A limpeza está no clique de um `span`, enquanto o `Chip` tem `onDelete` vazio e fica dentro do botão do accordion. Recomendar botão semântico independente do disparador do accordion, com Enter/Espaço, handler real e foco preservado. Comando: `$impeccable harden`. Referência: [WCAG 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).

**UX-A03 — Abrir ficha do cliente depende de clique na largura estreita.** Categoria: acessibilidade/responsividade. Local: `src/app/clientes/page.tsx:408`, `:413`, `:473`. Em 390 px, “Visualizar” é oculto; a linha continua com clique, mas o DOM tem `role=row`, sem `tabindex` e sem acionamento por teclado. As ações acessíveis remanescentes são histórico, editar e desativar, não abrir a ficha de consulta. A barreira está nesse breakpoint; no computador largo há botão Visualizar. Recomendar botão/link de ficha sempre disponível ou nome do cliente como link semântico, sem transformar edição no substituto de consulta. Comandos: `$impeccable harden`, `$impeccable adapt`. Referência: WCAG 2.1.1.

### P2 — corrigir no ciclo de refinamento

**UX-A04 — A ação principal do PDV fica fora da primeira tela.** Categoria: responsividade. Local: `src/app/pdv/page.tsx:1186`, `:1480`. Em 1366 × 768, o topo de “Finalizar Pedido” estava em **849,75 px**; em 1024 × 768, em **1488,15 px**, com um item no rascunho local. A altura varia com o estado, mas o cartão sticky não garante o acesso ao seu rodapé. Recomendar resumo financeiro e ação persistentes, com rolagem própria dos detalhes e espaço reservado. Comandos: `$impeccable layout`, `$impeccable adapt`.

**UX-A05 — Densidade e breakpoints prejudicam a consulta de itens e contatos.** Categoria: responsividade. Local: `src/app/pdv/page.tsx:703`, `:974`, `:1058`, `:1120`; `src/app/clientes/page.tsx:440`; `src/app/pedidos/page.tsx:995`. A captura de notebook mostra rolagem horizontal no carrinho e nome quebrado em várias linhas; quantidade e ações consomem muito espaço. Em Clientes estreito, telefone/endereço somem da lista; em Pedidos, data some. Não é uma alegação automática de violação de reflow: tabelas podem precisar de apresentação bidimensional. É uma perda operacional com contorno. Recomendar priorizar nome/qtd/total, consolidar ações e oferecer dados secundários no resumo/detalhe acessível. Comando: `$impeccable adapt`.

**UX-A06 — “Finalizar Pedido” e status gravado comunicam resultados diferentes.** Categoria: integridade/clareza. Local: `src/app/pdv/page.tsx:493`, `:505`, `:1496`; finalização real em `src/app/pedidos/page.tsx:391`. A ação do PDV grava `PENDENTE`, enquanto Pedidos tem ação que muda para `FINALIZADO`. Impacto: operador pode entender que encerrou a venda/status. Recomendar “Salvar pedido”, status explícito no sucesso e orientação para a próxima ação. Qualquer alteração da transição exige decisão de negócio separada. Comando: `$impeccable clarify`.

**UX-A07 — Resumo dos filtros não informa o recorte aplicado.** Categoria: integridade/clareza. Local: `src/app/pedidos/page.tsx:742`. O tipo mostra o valor interno do filtro; pagamento mostra apenas “Forma Pgto.” e datas apenas “Período”. Com filtros fechados, é necessário reabri-los para conferir a consulta. Recomendar nomes e intervalo efetivos, preservando a validação e persistência atuais. Comando: `$impeccable clarify`.

**UX-A08 — Hierarquia sem título principal semântico.** Categoria: acessibilidade. Local: cabeçalho em `src/components/layout/AppLayout.tsx:256`; retornos de `src/app/clientes/page.tsx:258`, `src/app/pedidos/page.tsx:515`, `src/app/pdv/page.tsx:656`. As páginas não possuem `h1`; o cabeçalho da rota é `h6`, e títulos de accordion aparecem em `h3`. Em Clientes, a região principal inspecionada não continha heading. Recomendar um `h1` por página e níveis coerentes, mantendo tamanho visual independente da tag. A ausência de h1, isoladamente, não é declarada violação automática de WCAG. Comando: `$impeccable typeset`.

**UX-A09 — PDF individual entra no grafo de dependências inicial.** Categoria: performance. Local: `src/app/pdv/page.tsx:75`, `src/app/pedidos/page.tsx:82`, `src/lib/pdf/pedido-pdf.ts:2`, `src/lib/pdf/fontes.ts:1`. As duas rotas importam diretamente o gerador, que importa pdfmake e suas fontes. Os arquivos distribuídos instalados têm **2.852.243 e 830.090 bytes** respectivamente. Esses tamanhos são de origem, não bytes transferidos, gzip ou bundle final. Há oportunidade concreta de carregar o gerador no momento de imprimir/download, mantendo estado de preparação e erro. Exportações em lote já usam importação dinâmica. Comando: `$impeccable optimize`. Depois, comparar bundles e carregamento em build de produção.

**UX-A10 — Exceções locais quebram a linguagem semântica do tema.** Categoria: tema. Local: `src/app/pedidos/page.tsx:1583`, `:1014`; `src/app/clientes/page.tsx:499`. Exportação tem cabeçalho roxo independente do azul compartilhado; tipo de atendimento força branco mesmo quando o Chip é neutro; reativar cliente usa vermelho como desativar. A captura mostra “Venda” pouco legível no chip neutro; a razão exata desse chip não foi medida e não recebeu diagnóstico adicional de conformidade. Recomendar tokens compartilhados, contraste por par real e cores de ação conforme significado. Comando: `$impeccable colorize`.

**UX-A11 — Movimento e elevação não distinguem interação de decoração.** Categoria: integridade/acessibilidade. Local: `src/app/providers.tsx:159`; `src/app/pedidos/page.tsx:553`; `src/app/clientes/page.tsx:419`; `src/app/globals.css:82`. Cartões de métricas sem ação ganham elevação/deslocamento no hover; linha de clientes cresce com `scale(1.01)`; reduced-motion zera globalmente transições para 0,01 ms. Isso dificulta estabelecer um padrão de resposta e merece alternativa intencional, sem movimento geométrico para quem o reduz. Não foi demonstrada perda concreta de feedback causada por essa regra global; trata-se de risco/padrão de implementação confirmado. Recomendar hover de fundo para linhas, elevação só em superfícies acionáveis e feedback estático preservado no reduced-motion. Comandos: `$impeccable quieter`, `$impeccable animate`.

### Padrões e boas bases a preservar

Os problemas se concentram em três padrões: espaço de trabalho consumido por estrutura auxiliar; cores de estado reaproveitadas sem considerar texto/fundo; ações com semântica ou resultado pouco explícitos.

Já existem bases úteis: labels em formulários, nomes acessíveis em ícones via Tooltip/ARIA, foco global visível, alvos mínimos de 44 px nos IconButtons, navegação responsiva, edição acessível de preço/desconto, estados de erro/retry, rascunho e filtros preservados, histórico paginado e endereço compartilhado. **Não reabrir como ausentes recursos já corrigidos.**

44 px é uma meta confortável de interação; o critério AA de [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) usa 24 px com condições/exceções. Compactar a tabela não deve reduzir indiscriminadamente os alvos nem ser confundido com “quanto menor, melhor”.

## 8. Ordem recomendada e critério de sucesso

| Etapa | Entrega | Critério de aceite |
| --- | --- | --- |
| 1 | Imagens do PDV, primeiro | Venda vazia e em montagem; cliente/endereço, pagamento e total verificáveis; ação principal visível em notebook |
| 2 | Imagens de Pedidos e Clientes | Mesma linguagem; consulta e retorno de contexto claros; comparação entre detalhe atual e painel lateral proposto |
| 3 | Correções P1 e base compartilhada | Contraste medido; limpar por teclado; ficha acessível em largura estreita |
| 4 | PDV em código | Layout aprovado; carrinho sem rolagem lateral na largura de referência; total persistente; status de sucesso explícito |
| 5 | Pedidos e Clientes em código | Busca/filtros compactos; endereço/contato preservados; ações conforme status/permissão |
| 6 | Validação e acabamento | Fluxos, falhas, zoom, teclado e responsividade revisados; auditoria repetida |

Para medir ganho, registrar primeiro uma linha de base com a operação da loja: tempo e interações para montar um pedido comum, corrigir um item, trocar endereço e salvar; tempo para localizar e editar um pedido; tempo para encontrar cliente e iniciar venda. Repetir as mesmas tarefas após a alteração. Esses ganhos ainda não foram medidos.

Para os mockups, usar conteúdo fictício realista, itens com nomes longos, múltiplos endereços e descontos. A quantidade típica será confirmada antes de tratá-la como requisito. Imagens mostram hierarquia e composição; teclado, cálculos, erro e salvamento só podem ser aprovados plenamente na implementação funcional.

### Comandos Impeccable para a implementação futura

1. `$impeccable harden`: acessibilidade das ações e manutenção de foco.
2. `$impeccable colorize`: contraste e semântica do tema.
3. `$impeccable layout` + `$impeccable adapt`: espaço útil, carrinho e resumo persistente.
4. `$impeccable clarify`: salvar/finalizar, filtros e sucesso.
5. `$impeccable optimize`: carregamento do PDF individual.
6. `$impeccable typeset` + `$impeccable quieter` + `$impeccable animate`: hierarquia, densidade e feedback.
7. `$impeccable audit`: verificar as correções com as mesmas evidências.
8. `$impeccable polish`: acabamento final das telas aprovadas.

Os comandos podem ser solicitados individualmente, em conjunto ou em outra ordem. Respeitar a preferência confirmada: aprovar imagens antes de implementar.

## 9. Cobertura e limites

Inspeção de código das três rotas, tema/layout, campos de endereço, PDF individual e filtros; detector mecânico executado uma vez; navegador local com simulador Supabase e dados fictícios; capturas em 1366 × 768, 1024 × 768 e 390 × 844; estilos/posição do DOM e limpeza de filtros com Enter/Delete. Nenhum pedido foi gravado ou alterado nesta revisão.

O PDV continha um rascunho local reidratado de uma sessão de teste anterior; seus dados não representam uma venda da loja. As medições de posição são desse estado reproduzível, não de todas as combinações de accordions/endereços. Listas extensas, leitores de tela, zoom de 200%, perfis reais de operadores, todos os estados de erro e métricas de produção não foram testados nesta etapa. Não foram executados novos testes de backend/build para um relatório sem mudanças de código.

Fontes de método: [Impeccable](C:/Users/netes/.agents/skills/impeccable/SKILL.md), [shape](C:/Users/netes/.agents/skills/impeccable/reference/shape.md) e [audit](C:/Users/netes/.agents/skills/impeccable/reference/audit.md). Contexto confirmado salvo em `PRODUCT.md`; preferência por imagens registrada em `.impeccable/config.json`.

