# Revisão da implementação — 01/10/2026

Projeto: C:/projetos/lojasmanu/CDJWE-LOJASMANU.

Pedido humano: implementar as três composições aprovadas, refinando visual e UX de PDV, Pedidos e Clientes dentro da identidade azul/MUI. Operação diária no computador, teclado e mouse; prioridade montar e conferir a venda. Preservar regras, permissões, descontos, endereços estruturados e snapshots dos pedidos. Aprovações já dadas: PDV C duas áreas; Pedidos C tabela/janela; Clientes C ficha/janela. Não repetir aprovação das imagens.

## Contrato de direção / quality bar

- Modo Operate. Primeiro viewport deve mostrar a tarefa, com busca e ações claras; indicadores secundários compactos.
- PDV: carrinho amplo à esquerda, contexto da venda à direita, financeiro e salvar persistentes. Em 1024 px as áreas empilham; em celular há duas etapas. Ao salvar, criar PENDENTE e mostrar sucesso e acesso ao pedido. Preço/cor/descontos/duplicação continuam disponíveis.
- Pedidos: busca e situação descobertas, filtros adicionais progressivos; tabela e janela centrada com endereço histórico, itens, totais e ações por status/permissão. Fechar conserva consulta. Exclusão apenas ADMIN também na apresentação.
- Clientes: lista e ficha em janela, contato e todos os endereços, principal/inativos identificados, histórico paginado real. Nova venda valida cliente ativo e confirma descarte quando houver rascunho. Cadastro mantém campos e endereços com expansão progressiva.
- Gramática: azul #0369a1, branco/slate, sans da aplicação, numerais tabulares, superfícies com borda única e 12 px. Sem trocar biblioteca, marca ou regras para copiar uma imagem fictícia. Componentes MUI nativos com foco e estados claros.
- Fidelity: preservar a composição e a densidade operacional das imagens. Navegação completa e campos reais prevalecem sobre abreviações/omissões das imagens. Dados de todas as capturas são fictícios, vindos do simulador local.
- Motion: sem entrada de página nem escala de linha ao hover; feedback de inclusão/remoção e transições MUI; reduced motion existente mantido.
- Segurança funcional: rascunho preservado ao cancelar; erros não podem anunciar gravação; cliente inativo bloqueia nova venda; histórico e somas respeitam critério do servidor.

## Referências aprovadas

- .impeccable/mocks/decision/pdv-c.png
- .impeccable/mocks/decision/pedidos-c.png
- .impeccable/mocks/decision/clientes-c.png
- PRODUCT.md e .impeccable/*-approved-brief.md
- Craft floor: C:/Users/netes/.agents/skills/impeccable/reference/craft-floor.md

## Evidência final disponível

Em .impeccable/review/ (todos caminhos relativos à raiz):

- hero-repro.png e pdv-desktop.png — 1536 × 1024, quatro itens, 7 unidades, subtotal 339,30, desconto 20,00, total 319,30.
- pdv-1366.png — 1366 × 768; pdv-1024.png — 1024 × 768.
- pdv-mobile.png — 390 × 844; tabela clientWidth=scrollWidth=325, ação salvar e ícones de imprimir/descartar dentro da tela.
- pedidos-desktop.png e pedidos-detalhes-desktop.png — 1536 × 1024; detalhe do pedido de teste salvo com os quatro itens e snapshot completo.
- pedidos-mobile.png — 390 × 844; tabela clientWidth=scrollWidth=349; ações da primeira linha chegam a x=357,6, dentro da tela.
- clientes-desktop.png e clientes-ficha-desktop.png — 1536 × 1024; segunda página do histórico (26–28 de 28), dois endereços.
- clientes-mobile.png e clientes-ficha-mobile.png — 390 × 844. A ficha móvel possui rolagem própria, grupos empilhados e ações em rodapé.
- pdv-salvo-mobile.png — sucesso Pendente observado no teste local.

As capturas foram abertas e inspecionadas; a ficha móvel inicialmente inválida por adaptação incompleta de viewport foi recapturada após estabilizar, sobrescrevendo o arquivo. Há botões do Next/TanStack e um elemento flutuante do ambiente externo ao produto. Não copiar esses elementos para o app.

## Verificação funcional feita

- Nova venda passa cliente ativo ao PDV e carrega endereço principal completo.
- Quatro produtos, quantidades 2/1/3/1, desconto geral de 20 reais, conferência F10, salvar e abrir pedido: PENDENTE, total 319,30 e endereço completo.
- Nova venda com rascunho abre confirmação; cancelar preservou os quatro itens, pagamento, cliente, endereço e total.
- Histórico mostrou 25 registros e depois 3, com total 28 após a venda de teste. Os contadores de vendas finalizadas são distintos do total de pedidos do histórico.
- Limpar filtros acionado com Enter removeu situação e voltou à consulta de todos os status.
- 65 testes automatizados passaram. Typecheck e build de produção passaram após os últimos ajustes da rodada. Lint sem erros e com 192 avisos do projeto.
- Detector em nove alvos alterados retornou []; não há hook de design nesta execução.

Limites: sem certificação WCAG, sem leitor de tela, sem benchmark de produção, sem intervenção no Supabase real. Avaliar também a semântica do resumo financeiro de Pedidos contra o critério da RPC: o campo de vendas não é necessariamente soma de todos os pedidos da consulta.

## Escopo do revisor

Leia os arquivos e as imagens diretamente. Não use navegador e não edite a aplicação. Julgue a composição contra os três comps e a funcionalidade/qualidade contra o contrato. Retorne disposição recapture/rebuild/fix/ship, com regiões/arquivos e correções materiais verificáveis. Uma imagem é evidência visual, não prova de todos os estados. Grave o resultado em .impeccable/review/finish-review.md. Não crie tarefas paralelas.
