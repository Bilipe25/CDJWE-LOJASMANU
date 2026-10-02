# Dashboard — refinamento operacional

Escopo: src/app/page.tsx, consulta protegida e destinos de filtros. Contexto existente: azul #0369a1, teclado e mouse como uso principal, rapidez para abrir PDV e conferir pedidos. Título somente no topbar.

Decisões: resumo compacto com números reais e links; vendas e atendimento na primeira linha; pedidos recentes e produtos do mês na segunda; painéis brancos com borda e raio de 12 px; sem crescimentos fictícios, hover com deslocamento ou FAB duplicado. Carregamento/erro/vazio distinguíveis; gráfico tem alternativa tabular.

Inspeção: um lote de desktop e mobile 390 × 844, sem transbordamento. Atalho por Enter, detalhes de pedido, tabela diária e recuperação de erro conferidos no Chrome local com dados sintéticos. 86 testes, tipos e build aprovados. Evidências e limites: docs/dashboard-2026-10-02/relatorio.md.
