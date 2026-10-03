# Correções de Saídas Financeiras e Relatórios

Data: 03/10/2026. Escopo: os 8 grupos P1 e 16 grupos P2 do relatório, com implementação local. Nenhum P0 havia sido confirmado.

## Resultado por item

| Item | Correção implementada |
| --- | --- |
| P1-01 | Estatísticas consultam todos os lotes da consulta protegida; conferem quantidade e IDs, sem corte silencioso em 1.000 registros. |
| P1-02 | Trava desde o início do cadastro, chave estável de criação, reutilização do destinatário e da chave depois de falha de comunicação. Duplicação também conserva a chave da confirmação. |
| P1-03 | Edição oferece somente Pendente/Confirmado. Finalizar e cancelar têm ações próprias, confirmação e transições protegidas. |
| P1-04 | Digitar outro nome remove a seleção anterior; remoções enviam `null`; falha de cadastro interrompe a despesa. Pagamento histórico inativo é preservado como opção na edição. |
| P1-05 | Documento individual de despesa implementado, com dados atuais do registro, descrição, valor, destinatário, pagamento e situação. Impressão usa o mecanismo existente de iframe, sem popup. |
| P1-06 | PDF e XLSX oferecem Toda a consulta/Página atual, com quantidade, critérios e progresso. Consulta completa busca todos os lotes. |
| P1-07 | Modelo anual distingue Venda/Despesa pela natureza real e calcula saldo. Mesmo pagamento pode aparecer nas duas naturezas. O agrupamento legado de Dízimo é preservado nas despesas. |
| P1-08 | Erros têm mensagem e tentativa novamente; documentos ficam bloqueados durante consulta inválida, carregamento ou falha. Zero é apresentado somente como resultado válido. |
| P2-01 | Busca por número ou destinatário conectada à API, com debounce e reinício da página. O placeholder descreve os campos efetivamente suportados pelo SQL existente. |
| P2-02 | Indicadores usam os filtros da tabela e separam finalizado, em aberto (Pendente/Confirmado) e cancelado. Documentos repetem esses critérios. |
| P2-03 | Datas civis reais, período ordenado e ano inteiro entre 1900–2100 validados na interface e na API. Data atual usa America/Fortaleza. |
| P2-04 | Filtros salvos são normalizados; tamanho da página é validado; página fora dos resultados é ajustada; expansão funciona. Persistência do destinatário guarda ID, sem nome. |
| P2-05 | Menu considera perfil e situação. Operador não recebe exclusão; encerrados não recebem edição; Confirmados recebem finalizar/cancelar. Servidor continua validando permissões e versão. |
| P2-06 | Destinatários usam busca remota com carregamento incremental; consulta histórica inclui inativos e seleção salva é recuperada por ID. Cadastros novos pesquisam ativos. |
| P2-07 | CSV com BOM, aspas escapadas, quebra de linha, separador `;`, números em pt-BR e proteção contra fórmulas em texto. URLs de arquivos são liberadas após o download. Botão informa CSV. |
| P2-08 | Unidades somam quantidades, inclusive fracionárias, em vez de contar linhas. Unidades diferentes ficam identificadas no ranking. |
| P2-09 | Total líquido do pedido é rateado em centavos entre itens, com desempate determinístico. Produtos/categorias reconciliam com o pedido; vendas legadas sem itens são informadas separadamente. |
| P2-10 | Categorias usam todos os produtos; gráfico agrupa excedentes em Outras categorias; tabela equivalente mantém detalhes. Top 10 restringe somente o ranking visível, com PDF/CSV completos. |
| P2-11 | Relatórios imprimem documento próprio, sem sidebar, navegação ou impressão da aplicação inteira. |
| P2-12 | Documentos usam o adaptador compartilhado de empresa e endereço completo, sem depender do formato bruto das configurações. |
| P2-13 | Atualização manual, ao focar a janela e a cada minuto; horário visível. Mutações invalidam consultas relacionadas, sem recarregar a aplicação. |
| P2-14 | Consulta por botão explícito/teclado; ações não abrem detalhes por propagação da linha. Botões continuam disponíveis em tela pequena, com rolagem interna da tabela. |
| P2-15 | Cabeçalho principal sem duplicação, títulos das seções, nomes de tabelas, rótulos de ações/diálogos, vínculo das abas, tabelas equivalentes aos gráficos e controles acessíveis. |
| P2-16 | Padrão operacional azul compartilhado: cartões compactos, superfícies neutras, hierarquia de valores, alinhamento monetário, ações claras e layout responsivo. |

## Arquitetura e publicação

As novas consultas agregam no servidor tRPC usando a RPC protegida `pdv_listar_pedidos` e a view existente de itens, em lotes, com validação de completude. As telas deixam de depender das funções SQL antigas de relatórios; não é necessário publicar nova migração para essas correções. A identificação interna de vendas continua `ENTRADA`.

A decisão evita modificar contratos do banco em produção sem inspecioná-los. Em bases muito maiores, uma agregação dedicada no PostgreSQL poderá reduzir tráfego e custo das atualizações; o código atual prioriza completude e falha explícita sobre totais parciais.

Não foram aplicadas migrações, gravados dados reais, feitas alterações de permissões, commit, push ou deploy neste trabalho.

## Validação

- Suíte completa: 111 testes aprovados. Inclui 15 testes novos de finanças e as regressões existentes de integridade, permissões, documentos e fluxo do PDV.
- Casos novos: 1.005 saídas; busca/filtros; remoção explícita; concorrência e resposta perdida após gravação; falha de destinatário; estados encerrados; datas e ano inválidos; falhas de consulta; vendas/despesas no mesmo PIX; rateio de desconto; 264 itens/12 categorias; XLSX com 270 registros; CSV especial; documentos vazios.
- `npm run type-check`, ESLint dos arquivos envolvidos e `git diff --check`: aprovados. Detector Impeccable dos quatro componentes principais: nenhuma ocorrência.
- `npm run build`: aprovado. Avisos do ambiente sobre bases de compatibilidade antigas e opção `localstorage-file` não impediram a compilação.
- Navegador local com componentes reais e serviços simulados: Saídas/Relatórios em computador e celular; cadastro com troca de destinatário; atualização sem reload; relatório anual. Sem acesso ao Supabase real. Página móvel de Saídas sem transbordamento horizontal externo; tabela mantém rolagem interna.
- Cinco PDFs reais gerados: saída individual (1 página), lista de saídas (3), vendas com descrições extensas (4), anual com valores altos (2), anual vazio (1). Conferência automatizada não encontrou textos fora da página; primeiras páginas renderizadas e inspecionadas. Anual dividido em semestres para manter valores legíveis.

Os testes em PostgreSQL local usam as migrações do repositório. Não certificam o estado do SQL publicado no Supabase. Impressão física e o destino final de download do navegador não foram certificados: o controle de download foi acionado na prévia sem erro registrado, e os bytes/layout dos PDFs foram validados separadamente.

## Evidências reproduzíveis

- `tests/financeiro.test.cjs`: testes atuais, executáveis com `node --test tests/financeiro.test.cjs`.
- `preview-pdfs.cjs`: gera os documentos fictícios e verifica os limites das páginas; aceita diretório de saída como argumento.
- `preview-local.cjs`: prepara aplicação local isolada com dados fictícios, sem autenticação ou gravação reais; aceita diretório externo de prévia.
- `reproducoes.cjs` e `evidencias.json`: evidência histórica do commit auditado. Não executar como suíte da implementação atual.

Capturas e PDFs de validação foram mantidos em `C:/Users/netes/.codex/visualizations/2026/10/01/01a0f7ec-7450-7841-b9ef-f49f060e680c/financeiro-pdfs`, fora do bundle da aplicação e do Git.
