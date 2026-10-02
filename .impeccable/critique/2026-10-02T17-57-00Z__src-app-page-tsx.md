---
target: dashboard
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-10-02T17-57-00Z
slug: src-app-page-tsx
---
Method: dual-agent (A: /root/dashboard_design_review · B: /root/dashboard_evidence_review)

Alvo: src/app/page.tsx; produção https://lojasmanu.vercel.app/; modo Operate. Revisão de design independente do detector, sem alterações na interface.

## Especificidade e impressão

A identidade azul é coesa e os critérios de vendas, pendências e horário de Fortaleza dão contexto real ao PDV. A composição de resumo, gráfico, atalhos e tabela ainda é comum a sistemas administrativos. A maior oportunidade é antecipar trabalho concreto. Na produção observada havia 47 pendentes, enquanto o gráfico sem vendas ocupava a primeira dobra e os recentes apareciam abaixo.

## Saúde do design

| Heurística | Nota | Oportunidade |
|---|---:|---|
| Visibilidade do estado | 3 | Horário da última consulta bem-sucedida |
| Linguagem do usuário | 3 | Explicar pedido versus venda contabilizada |
| Controle e liberdade | 3 | Preservar seções válidas quando outra falha |
| Consistência | 3 | Links nativos de navegação |
| Prevenção de erros | 3 | Conservar critérios financeiros explícitos |
| Reconhecimento | 3 | Antecipar pendências acionáveis |
| Rapidez e flexibilidade | 2 | Salto ao conteúdo e acelerador para PDV |
| Estética e minimalismo | 3 | Compactar vazio e atalhos repetidos |
| Recuperação de erros | 3 | Falhas e recuperação localizadas |
| Ajuda contextual | 2 | Explicar ausência de vendas e indicadores |
| Total | 28/40 | Boa base |

Todas as heurísticas aplicam. Nenhum P0 observado. Detector único em src/app/page.tsx retornou []: zero regras, localizações ou falsos positivos. Isso não certifica comportamento nem acessibilidade.

## Pontos fortes

- Critérios financeiros claros e links de vendas coerentes com status FINALIZADO, tipo ENTRADA e datas. Consulta de vendas do mês verificada no navegador.
- Loading, vazio, erro inicial e falha de atualização com dados anteriores têm mensagens distintas.
- h1/h2, status textual, números tabulares e alternativa tabular ao gráfico. Mobile 2×2 e status integrado à célula do pedido; sem overflow horizontal observado.

## Cinco prioridades

1. **[P1] Falha do ranking pode indisponibilizar todo dashboard.** Backend retorna uma única resposta após Promise.all e consulta sequencial dos itens vendidos; falha de produtos ou identificação interrompe o retorno inclusive de indicadores válidos. Evidências src/server/dashboard.ts:25,35–46,52 e src/app/page.tsx:19,28,35. Risco comprovado pelo código, não reproduzido na produção. Isolar respostas/estados por seção; preservar dados válidos, erro e retry localizados sem converter falha em vazio. Comando harden.
2. **[P2] Gráfico vazio ocupa área operacional principal.** Produção mostrou zero vendas, 47 pendentes e recentes abaixo da dobra. Fonte src/app/page.tsx:44–47,61,70. Compactar gráfico vazio e elevar recentes ou pequena fila de pendentes com critério explícito. Recência não equivale a prioridade. Comandos shape/layout.
3. **[P2] Indicadores sem horário da última atualização.** Frequência e conexão não comprovam atualidade dos números. Fonte src/app/page.tsx:19,31,35,91. Exibir Atualizado às HH:mm da última consulta bem-sucedida, preservando horário e retry quando falhar. Comandos clarify/harden.
4. **[P2] Caminho de teclado sem salto ao conteúdo.** Oito destinos precedem main; nenhum salto ou acelerador próprio encontrado no código. Fonte AppLayout.tsx:53–62,128–135,210–232,351; src/app/page.tsx:32–33. Adicionar salto visível ao foco, links nativos e acelerador consistente sem conflito com navegador. Comandos harden/optimize. Fluxo completo por teclado não foi exercitado.
5. **[P2] Painel de atalhos repete destinos gerais.** Pedidos, Clientes e Produtos já existem na sidebar. Fonte src/app/page.tsx:41,61–68,71. Compactar painel ou oferecer consultas específicas/retomada de pedido, respeitando contratos reais. Comandos distill/clarify.

## Carga cognitiva e jornada

Carga moderada: foco, agrupamento da navegação e quantidade de destinos merecem ajuste. Quatro indicadores e três atalhos são grupos legíveis. A chegada comunica ordem e acesso rápido ao PDV; o gráfico vazio pode parecer pouca utilidade apesar do trabalho pendente. Recência devolve reconhecimento após rolagem. Falha com retenção de dados tranquiliza, mas precisa mostrar idade da consulta.

## Personas

- Alex: PDV a um clique, mas retomar pendência exige abrir consulta geral; não há acelerador próprio encontrado.
- Sam: bons títulos/status/foco e alternativa ao gráfico; falta salto ao conteúdo e anúncio localizado de atualização. Não houve teste com leitor de tela ou certificação WCAG.
- Jordan: critérios ajudam, mas nenhuma venda finalizada pode parecer ausência de atividade apesar dos pendentes. Ajuda curta ligada à consulta é preferível a tutorial obrigatório.

## Ajustes menores

- Ver vendas/Ver pendentes no lugar dos quatro Consultar visualmente iguais; nomes acessíveis distintos já existem.
- Ampliar controles menores de 42,75px para 44px por conforto; isso não demonstra violação WCAG AA.
- Atualizar ano do rodapé e considerar Visão geral em vez de Dashboard.
- Ajuda contextual sobre quais pedidos entram nas vendas e anúncio acessível da atualização.
- Preservar zero verdadeiro e tabela diária; não adicionar gráfico decorativo ou animação sem propósito.

Clientes ativos leva a /clientes com filtro inicial ativos: discrepância suspeitada foi descartada. URL dos filtros de vendas é limpa após hidratação, mantendo os controles aplicados: comportamento verificado e explicado pelo hook.

## Evidência e limitações

Desktop1536×674 e mobile390×844, sem overflow. Console warning/error vazio. Tabela diária26set–02out verificada. Não foram testados falha de rede, dados não zerados, teclado completo, contraste numérico ou leitor de tela. Sem overlay porque evaluate é read-only; evidência screenshot/DOM/console/fonte.

## Questões para direção

1. Prioridade inicial: confiabilidade/atualidade, organização da primeira dobra ou rapidez de navegação?
2. Escopo: cinco prioridades e ajustes menores, apenas prioridades ou apenas confiabilidade?
