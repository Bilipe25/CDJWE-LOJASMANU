# Ajuste após publicação e restauração dos relatórios

03/10/2026. Atendimento à solicitação de restaurar o visual anterior, preservando as correções funcionais.

## Falha dos indicadores

A página publicada carregava a lista de Saídas, mas não os indicadores. A exportação completa foi acionada pelo navegador e exibiu `Valor financeiro inválido. Confira os registros da consulta.`. Esse é o erro da conversão de valores usada também na estatística.

A validação introduzida tratava toda leitura como um cadastro novo e recusava movimentos negativos do histórico. Consultas, XLSX e documentos financeiros passam a usar uma conversão em centavos que preserva o sinal; valores não finitos e fora da precisão segura continuam sendo recusados. Cadastros novos continuam protegidos pela validação de valores positivos, sem alterar dados históricos ou permissões. Em caso de outra falha, o alerta dos indicadores agora apresenta o motivo retornado pela consulta.

O cenário foi reproduzido em PostgreSQL local com uma saída histórica de −R$ 25,50: estatística, anual, documento individual, lista PDF e XLSX não interrompem a consulta nem transformam o valor em positivo. A API continua recusando nova despesa negativa. Não houve mudança ou consulta direta ao banco de produção.

## Visual e impressões

- Relatório por período: filtros rápidos com seleção, cartões e cores anteriores, gráfico de barras, pizza de categorias e ranking numerado de produtos.
- Relatório anual: tabela principal com JAN–DEZ lado a lado, linhas de totais de vendas, saídas e saldo, cartões por pagamento e evolução mensal abaixo.
- PDF anual: A4 paisagem, cabeçalho azul da empresa, divisor azul, título central, tabela dos 12 meses, despesas em vermelho e total geral das transações. Substitui a divisão em semestres da primeira correção.
- Impressão e PDF por período retomam o cabeçalho azul e título central. A impressão usa o documento próprio, sem sidebar ou popup.

Vendas e despesas continuam separadas pela natureza real; descontos líquidos, completude dos dados, tratamento de erro, datas válidas, contagem de quantidades, CSV escapado e bloqueio de documentos inválidos foram preservados. O gráfico de pizza mostra categorias com saldo positivo; ajustes negativos permanecem disponíveis na tabela equivalente.

## Validação

- 112 testes aprovados; 16 específicos de finanças, incluindo a nova regressão de valores históricos negativos.
- TypeScript, ESLint dos arquivos envolvidos e build de produção aprovados.
- Cinco PDFs reais gerados e conferidos quanto aos limites de página. O anual com valores de R$ 99.999.999,99 por mês cabe em uma página com os 12 meses; renderização inspecionada.
- Prévia local com dados fictícios, conferida em computador e celular. Tabelas mantêm rolagem interna e a página não transborda horizontalmente.
- Detector Impeccable: um aviso informativo sobre `#e0e0e0`; mantido intencionalmente por ser a cor do cabeçalho da tabela anterior solicitada pelo usuário.

As capturas e PDFs estão em `C:/Users/netes/.codex/visualizations/2026/10/01/01a0f7ec-7450-7841-b9ef-f49f060e680c/financeiro-restaurado`. Alterações ainda locais: a validação da versão publicada deve ocorrer após commit/push e deploy.
