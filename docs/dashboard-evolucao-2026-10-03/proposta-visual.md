# Dashboard — proposta visual para aprovação

Status: imagens aprovadas pelo usuário em 03/10/2026 (“aprovo”). Implementação autorizada; sem alterações de permissões ou banco.

## Propostas

- Desktop: `.impeccable/mocks/dashboard-evolucao-2026-10-03/desktop.png`
- Móvel: `.impeccable/mocks/dashboard-evolucao-2026-10-03/mobile.png`

São estudos visuais gerados com dados demonstrativos, não capturas de funcionalidades já implementadas. O aviso de demonstração pertence somente à proposta.

## Direção acordada

Preservar azul, superfícies claras, logo, menu lateral e tokens atuais. Mesmo painel para ADMIN e operadores. Seletor Mês até hoje (padrão), últimos 7 dias e últimos 30 dias. Comparação do mês com mesmo trecho do mês anterior; intervalos de 7/30 dias contra os intervalos imediatamente anteriores.

Quatro cards: vendas do período, quantidade de vendas finalizadas, ticket médio e pendentes de todos os atendimentos/períodos. Vendas de hoje aparecem em contexto compacto. Gráfico de barras com linha anterior tracejada e alternativa tabular; fila dos cinco pendentes mais antigos ao lado; pedidos recentes e ranking por valor após descontos abaixo.

O desktop usa proporção 2/3 + 1/3 nas duas linhas de conteúdo; celular usa cards em 2 × 2 e seções empilhadas. Cor, seta e texto juntos nas variações. Detalhes de móveis por ícones pequenos, sem fotos decorativas.

## Dados demonstrativos e limites das imagens

O total ilustrativo é R$ 18.450,00, em 12 vendas, com ticket de R$ 1.537,50. Base anterior: R$ 16.400,00 em 10 vendas, ticket R$ 1.640,00. Crescimento de 12,5% nas vendas, 20% na quantidade e queda de 6,25% no ticket (exibida como 6,3%). São exemplos, não resultados da loja.

As cinco categorias de produtos ilustradas somam R$ 18.450,00. Barras reais devem usar 100%, 80%, 60%, 40% e 27,5% em trilhos iguais. O gerador não manteve essa proporção em todas as barras do desktop; o estudo móvel demonstra a escala desejada. Não reproduzir o erro em código.

Usar os tokens de DESIGN.md em vez de copiar pequenas variações de cor ou efeitos do bitmap. Preservar o logotipo existente. O subtítulo definitivo é PDV Lojas Manu; o texto PDV de teste que aparece no estudo móvel veio da referência local. O título permanece somente no topbar.

No celular, transformar dados dos pedidos em linhas legíveis, com metadados/situação abaixo do nome e total à direita; não comprimir a tabela de desktop para caber. Verificar em 390 px.

## Próxima etapa após aprovação

Registrar o aceite no brief e nos sidecars. Implementar somente dashboard e consultas protegidas de desempenho/ranking por período, preservando contratos atuais e cálculos financeiros corrigidos. Pendentes/recentes continuam consultas independentes; ranking carrega depois das seções essenciais.

Validar cálculos, períodos, meses curtos, ano bissexto, virada civil de Fortaleza, valores negativos históricos, base sem percentual, descontos e paginação completa. Conferir falhas parciais, troca rápida de período, filtros de destino, teclado e responsividade. Executar testes, tipos, lint e build e registrar capturas reais.

Sem estoque, margem, metas, conversão ou entregas nesta etapa. Sem migração de banco ou alterações nos relatórios e impressões.
