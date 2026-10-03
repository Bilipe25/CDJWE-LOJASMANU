# Dashboard — evolução visual e inteligência comercial

Modo Operate. Direção aprovada pelo usuário em 03/10/2026: “aprovo”. Referências: .impeccable/mocks/dashboard-evolucao-2026-10-03/desktop.png e mobile.png; sidecars aprovados.

Composição: seletor Mês até hoje/7/30 dias, ações compactas, vendas de hoje em contexto; quatro KPIs com comparação real; gráfico amplo com linha anterior tracejada e fila de pendentes à direita; recentes e ranking por valor após descontos abaixo. Grade 2/3 + 1/3 no desktop; quatro cards 2 × 2 e painéis empilhados no celular. O foco é comparar desempenho e retomar atendimento.

Gramática: superfícies brancas de 12 px com borda divider sem sombra; tokens azuis existentes, sem gradientes; valores tabulares fortes, rótulos secundários, ícones MUI discretos. Título apenas no topbar; identidade e layout global preservados. Gerador não define dados, proporcionalidade das barras, subtítulo da marca ou comportamento móvel: seguir o plano aprovado e corrigir seus defeitos.

Ingredientes: logo existente do AppLayout; controles/cartões/tabelas semânticos MUI; gráfico Recharts/SVG; barras de ranking em CSS com largura calculada; ícones de móveis da biblioteca. Manifesto do produtor confirma nenhuma nova imagem necessária.

Dados: calendário de Fortaleza, FINALIZADO + ENTRADA, data do pedido e descontos gravados. Mês vs mesmo trecho do anterior (limite último dia); 7/30 dias vs janela imediatamente anterior. Base anterior não positiva produz Sem base comparável. Pendentes globais preservados; recentes sem filtro do período; ranking acompanha datas das vendas. Consultas independentes, recuperação local e ranking posterior, sem migração.

Escopo: src/app/page.tsx, consulta protegida e destinos de filtros. Contexto existente: azul #0369a1, teclado e mouse como uso principal, rapidez para abrir PDV e conferir pedidos. Título somente no topbar.

Decisões: resumo compacto com números reais e links; vendas e atendimento na primeira linha; pedidos recentes e produtos do mês na segunda; painéis brancos com borda e raio de 12 px; sem crescimentos fictícios, hover com deslocamento ou FAB duplicado. Carregamento/erro/vazio distinguíveis; gráfico tem alternativa tabular.

Inspeção: um lote de desktop e mobile 390 × 844, sem transbordamento. Atalho por Enter, detalhes de pedido, tabela diária e recuperação de erro conferidos no Chrome local com dados sintéticos. 86 testes, tipos e build aprovados. Evidências e limites: docs/dashboard-2026-10-02/relatorio.md.
