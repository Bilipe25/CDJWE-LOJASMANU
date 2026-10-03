# Auditoria de Saídas Financeiras e Relatórios

> Este documento registra a situação anterior às correções. Consulte [correcoes.md](correcoes.md) para a implementação e validação atuais. As referências de linha e `reproducoes.cjs` correspondem à base auditada, não à versão corrigida.

Data: 03/10/2026. Base analisada: commit `45d3080`, com as alterações anteriores de nomenclatura já presentes.

O principal problema dessas telas é a confiabilidade da informação financeira. Há totais calculados sobre uma amostra limitada, situações em que a despesa gravada difere do formulário e documentos que omitem registros ou misturam vendas e despesas. A interface também precisa melhorar a busca, a atualização dos dados e a clareza dos indicadores.

| Prioridade | Quantidade | Interpretação nesta auditoria |
| --- | ---: | --- |
| P0 | 0 confirmado | Exposição crítica, perda generalizada de dados ou indisponibilidade grave. |
| P1 | 8 | Gravação financeira divergente, informação financeira enganosa ou ação relevante oferecida que não funciona. |
| P2 | 16 | Consulta, apresentação, exportação, acessibilidade e usabilidade que exigem correção, sem um bloqueio crítico demonstrado. |

As quantidades representam grupos de causas; manifestações da mesma causa na tela e no PDF foram agrupadas. A classificação considera o uso diário do sistema por ADMIN e operadores.

## Escopo e limites

Foram analisadas as duas páginas, seus filtros, consultas tRPC, ações de criação/edição/finalização/cancelamento/exclusão, exportadores PDF e Excel/CSV, configurações de cache, componentes relacionados, SQL de relatórios e migrações de integridade/permissões.

A análise combina leitura do código com reproduções em PostgreSQL local em memória, usando dados fictícios. Alguns cenários executam os próprios handlers e expressões extraídos das páginas. **Não houve alteração na aplicação, migração no Supabase, acesso ao banco de produção ou gravação de registros reais.**

As funções SQL de relatórios foram reproduzidas a partir de `criar_todas_funcoes_relatorios.sql`, presente no repositório. Os resultados dependentes desse SQL precisam ser confrontados com as definições efetivamente publicadas no Supabase antes de uma migração. Os problemas diretamente identificados no frontend não dependem dessa conferência.

Não foi feita inspeção visual no navegador, renderização dos PDFs ou impressão física nesta etapa. Os achados visuais abaixo vêm dos estilos e da estrutura do código; a implementação deverá incluir essa validação visual.

## P0: nenhum confirmado no escopo verificado

As rotas analisadas usam procedimentos protegidos. Os testes locais de sessão, perfil autorizado, restrições do banco, exclusão por ADMIN, conflito de versão e proteção de pedidos encerrados passaram.

Isso é evidência favorável às proteções existentes, mas não certifica as permissões ou definições SQL do ambiente publicado. Não encontrei base para declarar um novo P0 confirmado.

## P1: correções prioritárias

### P1-01 — Estatísticas das saídas ficam incompletas após 1.000 registros

**Causa:** a página busca somente os primeiros 1.000 registros e calcula o valor total e as contagens por status nesse array. A quantidade geral usa o total retornado pelo servidor, criando indicadores com bases diferentes.

**Reprodução:** 1.005 saídas de R$ 1 retornaram contagem geral de 1.005, mas apenas 1.000 linhas para o cálculo: o valor visível ficou em R$ 1.000 em vez de R$ 1.005. As contagens por status também ficam limitadas à amostra.

**Correção proposta:** agregar valores e quantidades no banco, com critérios explícitos de período/status. A estatística não deve depender do tamanho da página. A função atual de estatísticas de pedidos não deve ser reaproveitada sem ajustar seu cálculo específico de vendas para saídas.

Fonte: [consulta limitada e cálculos de Saídas](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:156). Evidência: `estatisticasTruncadas`.

### P1-02 — Cliques repetidos e novas tentativas podem duplicar despesas

**Causa:** cada execução de `handleSalvarNovaSaida` gera uma nova `chave_requisicao`. O botão permanece disponível durante a operação e não há uma trava abrangendo o cadastro do destinatário e da despesa.

**Reprodução:** duas chamadas simultâneas ao handler real criaram duas despesas distintas. A proteção do banco funciona quando a mesma chave é reutilizada; o frontend troca a chave a cada tentativa.

**Correção proposta:** manter uma chave estável por operação até a confirmação do resultado; bloquear submissões concorrentes desde o início; mostrar andamento e preservar a chave em uma tentativa após falha de comunicação. Aplicar a trava também às demais ações financeiras que ainda permitem repetição.

Fontes: [geração da chave](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:515), [botão de criação](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:1914). Evidências: `idempotencia` e `handlerCriacao`.

### P1-03 — O status escolhido na edição pode ser salvo como outro

**Causa:** o formulário oferece `PENDENTE`, `CONFIRMADO`, `FINALIZADO` e `CANCELADO`, mas o handler envia apenas `CONFIRMADO` ou `PENDENTE`. Escolher os dois estados encerrados resulta no envio de `PENDENTE`.

**Reprodução:** a edição de uma despesa pendente com a seleção “Finalizado” enviou e gravou `PENDENTE`, usando o próprio handler da página.

**Correção proposta:** separar a edição dos dados das ações de finalizar/cancelar. Usar as transições específicas já protegidas no backend, sem ampliar indiscriminadamente os estados aceitos pelo endpoint de edição. O formulário precisa informar exatamente qual ação será executada.

Fontes: [payload da edição](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:285), [opções de status](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:1495). Evidência: `edicaoStatus`.

### P1-04 — Destinatário e pagamento podem divergir do formulário

Há três manifestações relacionadas à associação dos campos:

- Ao digitar outro nome depois de selecionar um destinatário, `onInputChange` altera o texto sem limpar imediatamente o ID anterior. Salvar sem confirmar uma nova seleção pode manter o vínculo antigo.
- Ao limpar destinatário ou pagamento na edição, o handler envia `undefined`. Isso preserva o valor existente no banco; não representa a remoção escolhida no formulário.
- Se a criação de um novo destinatário falhar, o erro é registrado no console e a gravação da despesa continua.

**Reprodução:** a atualização com campos omitidos manteve os vínculos anteriores. O handler real de criação, com uma falha simulada no cadastro do destinatário, criou a despesa sem destinatário e seguiu o caminho de sucesso.

**Correção proposta:** distinguir seleção, texto livre e remoção; limpar IDs incompatíveis com o texto; enviar `null` para remoções explícitas; interromper o salvamento quando um destinatário solicitado não puder ser criado. Preservar os dados digitados para corrigir e tentar novamente.

Fontes: [gravação da edição](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:266), [falha ignorada na criação](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:493), [texto e ID do destinatário](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:1791). Evidências: `limpezaDeCampos` e `handlerCriacao`.

### P1-05 — Impressão e PDF de uma saída individual não foram implementados

**Causa:** o diálogo de impressão executa `alert('Implementar impressão…')` e `alert('Implementar download…')`. Antes disso, mostra mensagens de sucesso/andamento que sugerem uma ação funcional.

**Impacto:** a pessoa chega até a confirmação, mas não recebe o documento da despesa. Isso é um fluxo incompleto, não um bloqueio de popup.

**Correção proposta:** implementar documento individual de saída com número, data, destinatário, descrição, valor, pagamento e status. Reutilizar o mecanismo de impressão que já evita popups, com tratamento de falha. O documento deve identificar uma despesa, sem copiar textos de uma venda ou sugerir documento fiscal.

Fonte: [callbacks do diálogo](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:1145). Confirmado pela leitura dos handlers.

### P1-06 — Exportação de saídas omite as demais páginas sem informar

**Causa:** PDF e Excel recebem `pedidos`, o array da página atual. Os filtros são descritos no arquivo, mas o escopo parcial não é informado.

**Reprodução:** em uma consulta com 1.005 registros, a página de 10 linhas produziu um Excel com somente 10 registros. O total do arquivo também representa essa página, não a consulta inteira.

**Correção proposta:** oferecer “Toda a consulta” e, se útil, “Página atual”, com quantidade visível. Para a consulta completa, usar busca em lotes ou exportação no servidor, preservando filtros e ordenação. Não substituir por outro limite fixo. Informar período, critérios e quantidade exportada no documento.

Fontes: [exportação PDF](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:412), [exportação Excel](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:442). Evidência: `exportacaoSaidas`.

### P1-07 — O detalhamento anual mistura vendas e despesas

**Causa:** uma linha recebida pode ter `total_vendas` e `total_despesas` para a mesma forma de pagamento e mês. O frontend escolhe um deles: `total_vendas > 0 ? total_vendas : total_despesas`. A classificação visual de despesa depende do nome conter “DESPESA” ou ser “DIZIMO”, em vez da natureza do movimento.

**Reprodução:** PIX com R$ 90 de vendas e R$ 30 de despesas mostrou somente R$ 90 na linha detalhada. Uma despesa de R$ 20 em DINHEIRO não foi reconhecida pelo critério visual de despesa.

**Limite do achado:** o agregado geral de despesas continuou correto em R$ 50 nesse cenário. O erro está nas linhas por forma de pagamento, em seus subtotais e na interpretação que a tabela/PDF permite; não foi demonstrado que todo total anual esteja incorreto.

**Correção proposta:** manter vendas e despesas separadas no modelo, na tabela, no resumo e no PDF; calcular saldo explicitamente. A forma de pagamento não determina a natureza do movimento. Conferir a função anual publicada antes de ajustar seu contrato, preservando eventuais regras específicas de dízimo.

Fontes: [transformação anual](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:462), [classificação visual](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:931), [SQL de referência](C:/projetos/lojasmanu/CDJWE-LOJASMANU/criar_todas_funcoes_relatorios.sql:112). Evidência: `anual`.

### P1-08 — Falhas de consulta podem parecer ausência de movimento

**Causa:** as consultas principais usam `data` e `isLoading`, sem apresentar seus estados de erro. Os cálculos convertem dados ausentes em zero e as listas exibem estados vazios. A exportação anual não bloqueia a geração enquanto a consulta está carregando ou falhou.

**Impacto:** após uma falha sem dados em cache, a tela pode parecer um período sem vendas/despesas. Também é possível acionar a exportação anual antes de ter dados válidos: o exportador recebe arrays vazios e totais zero, sem uma proteção prévia. Isso permite uma tentativa de geração inválida ou incompleta; o resultado no PDF ainda precisa de reprodução renderizada.

**Correção proposta:** distinguir carregamento, resultado vazio, erro e atualização de dados anteriores. Mostrar uma mensagem com “Tentar novamente”; apresentar atualização em andamento; bloquear documentos quando não houver um resultado válido para os filtros selecionados. Consultas parcialmente bem-sucedidas devem indicar qual seção falhou.

Fontes: [consultas de Relatórios](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:60), [defaults dos indicadores](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:87), [exportador anual](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:175), [consultas de Saídas](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:144). Confirmado pelo fluxo do código; falha de rede no navegador ainda não simulada.

## P2: consulta, consistência e usabilidade

| ID | Achado e impacto | Correção proposta | Evidência principal |
| --- | --- | --- | --- |
| P2-01 | **Busca de Saídas não é enviada à consulta.** Digitar altera o filtro persistido e sua contagem, mas não restringe os registros. | Conectar busca ao servidor com debounce, reset da paginação e busca por campos claramente informados. | [Parâmetros da lista](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:144); input na linha 811. |
| P2-02 | **Indicadores de Saídas usam critérios diferentes da tabela.** Ignoram filtros e somam pendentes e canceladas junto às finalizadas. Isso dificulta interpretar “gastos registrados”. | Definir “Na consulta” ou “Geral”; distinguir valor finalizado, pendente e cancelado. Manter a regra explícita em tela e documento. É uma questão de critério/clareza adicional ao corte de P1-01. | [Cálculos globais](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:188). |
| P2-03 | **Datas e ano não têm validação suficiente.** Relatórios aceita período invertido e retorna vazio; o ano digitado pode virar `NaN`. A criação de saída não valida previamente uma data obrigatória vazia. | Validar datas reais, ordem do período e ano inteiro dentro de limites definidos, tanto na UI quanto na API. Mostrar erro no campo antes de consultar/salvar. | [Contrato de Relatórios](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/relatorios.ts:10); [campo de ano](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:855). Reprodução: `periodoInvertido`. |
| P2-04 | **Filtros persistidos não são validados e a página pode ficar fora do resultado.** O hook mescla qualquer JSON salvo; não há ajuste ao reduzir a quantidade disponível. O estado de expansão salvo não controla o acordeão. | Validar/normalizar estado persistido, limitar tamanho/página a opções válidas, ajustar página após redução de resultados e ligar ou remover a persistência da expansão. | [Hook de filtros](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/hooks/useSaidasFiltros.ts:42); [acordeão](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:771). |
| P2-05 | **Ações exibidas não acompanham permissões e transições.** A tela oferece edição de saída finalizada e exclusão ao operador, embora o servidor negue. Finalizar/cancelar aparece somente para pendentes, deixando confirmadas sem esses atalhos. | Derivar ações do perfil e status, preservando a validação do servidor. Explicar bloqueios pertinentes e permitir as transições válidas de confirmadas. | [Ações por linha](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:1050). Reprodução: `protecoes`. |
| P2-06 | **Destinatários ficam limitados aos primeiros 1.000 ativos.** A filtragem é local; fornecedores fora desse lote e destinatários inativos do histórico não são encontrados pelo seletor. | Busca remota paginada; permitir consultar associações históricas sem oferecer inativos como novos cadastros inadvertidamente. Usar o registro vinculado na edição. | [Consulta de clientes](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:162); [padrão de ativos](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/clientes.ts:15). |
| P2-07 | **CSV quebra com vírgulas, aspas e quebras de linha.** O exportador concatena células sem escape. | Usar serializador CSV ou XLSX; preservar acentos e valores numéricos; liberar a URL temporária depois do download. Alinhar a mensagem “Excel” ao formato CSV oferecido. | [Serialização](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:143). Reprodução: produto `Kit, "Especial"` gera uma linha incompatível com as seis colunas (`csv`). |
| P2-08 | **“Itens vendidos” conta linhas, não unidades.** No SQL de referência, um produto com quantidade 5 conta como 1. | Somar quantidades para “Unidades vendidas” ou renomear para “Linhas de itens”, conforme a intenção. Conferir a definição publicada. | [Agregação SQL](C:/projetos/lojasmanu/CDJWE-LOJASMANU/criar_todas_funcoes_relatorios.sql:28). Reprodução: `periodoProdutos`. |
| P2-09 | **Valores por produto e total de vendas usam bases diferentes sem esclarecer.** O SQL por produto soma itens; o período soma pedidos após desconto geral. | Exibir a base de cálculo. Se a análise deve ser líquida por produto, ratear desconto geral com critério determinístico e arredondamento reconciliado com o pedido. | [Valor por produto](C:/projetos/lojasmanu/CDJWE-LOJASMANU/criar_todas_funcoes_relatorios.sql:75). Reprodução: produtos somam R$ 100 e a venda líquida R$ 90 (`periodoProdutos`). |
| P2-10 | **Distribuição por categoria usa somente o top 10 de produtos e depois corta em cinco categorias.** A participação visual não representa o conjunto completo do período. | Agregar todas as categorias no banco; apresentar “Outras” quando houver corte. Se for mantida a amostra, nomeá-la explicitamente. | [Montagem do gráfico](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:93). |
| P2-11 | **Impressão por período imprime a página do aplicativo.** Usa `window.print()` sem uma composição ou stylesheet de impressão dedicada; navegação, controles e conteúdo rolável ficam sujeitos ao layout de tela. | Criar documento de relatório com cabeçalho, critérios, indicadores e tabelas, esconder controles e validar quebras de página em A4. | [Impressão](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:171); ausência de regras de impressão no layout/CSS global. Resultado impresso ainda não renderizado. |
| P2-12 | **Dados da empresa não são normalizados para os exportadores de Saídas.** Os exportadores esperam `endereco` textual; as configurações usam campos estruturados. Também não há controle do carregamento dessas configurações. | Criar adaptador compartilhado para nome, documento, endereço completo e contatos; definir como tratar configuração ausente ou falha antes de exportar. | [Configuração enviada diretamente](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:415); [contrato do PDF](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/lib/pdf/saidas-export-pdf.ts:29). |
| P2-13 | **Atualização é pouco transparente e as ações recarregam toda a página.** Não há ação de atualizar ou horário da consulta; a configuração global desativa refetch no foco. Várias mutações usam reload após 500 ms. | Invalidar/refazer consultas pertinentes após mutações, manter filtros e foco, mostrar “Atualizado às…” e oferecer atualização manual. Definir atualização automática conforme o uso simultâneo, sem presumir que `staleTime` seja polling. | [Reload da edição](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:302); [cache global](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/providers.tsx). |
| P2-14 | **Ações da linha também acionam a abertura de detalhes.** Duplicar/finalizar/cancelar/excluir não interrompem a propagação do clique para a linha. A linha clicável não oferece comportamento equivalente por teclado; o botão explícito de visualizar é ocultado em telas pequenas. | Separar ação e navegação, interromper propagação e oferecer botão/link acessível em todos os tamanhos. Evitar escala da linha no hover, que desloca a leitura da tabela. | [Linha clicável](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:964); [ações](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:1067). |
| P2-15 | **Há lacunas de acessibilidade em gráficos e diálogos locais.** O gráfico diário não oferece uma tabela equivalente; alguns botões de fechar não têm nome acessível explícito e os diálogos locais não vinculam título por `aria-labelledby`. | Fornecer tabela/resumo acessível para os gráficos, habilitar suporte de teclado compatível com a biblioteca e nomear/associar controles e títulos. Validar teclado, foco e leitor de tela. O `ConfirmDialog` compartilhado já possui associação de título; o achado é dos diálogos locais. | [Diálogo de detalhes](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:1177); estrutura dos gráficos em Relatórios. |
| P2-16 | **Contraste e linguagem visual destoam das telas já refinadas.** Indicadores de Saídas usam texto branco sobre gradientes claros e cores saturadas. Há decoração redundante, hierarquia pouco consistente e um gradiente colocado em `bgcolor` no resumo anual, que não produz o fundo pretendido. | Usar superfícies claras/neutras, texto escuro, cores semânticas contidas, cards compactos e alinhamentos consistentes com Pedidos/Dashboard. Corrigir a propriedade CSS do gradiente ou substituir por superfície simples. | [Gradientes de Saídas](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/saidas/page.tsx:651); [fundo anual](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/relatorios/page.tsx:1026). |

No P2-16, o cálculo das cores declaradas, usando texto branco opaco, resultou em contraste de aproximadamente **1,34:1 a 3,25:1** nos extremos dos gradientes. Os rótulos com opacidade menor pioram a leitura. A referência para texto comum é 4,5:1; texto grande exige 3:1. Isso sustenta a correção, embora a medição final deva considerar o posicionamento real do texto no navegador. [WCAG 2.2 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Refinamentos de UX e visual propostos

**Saídas Financeiras:** tratar a tela como uma consulta operacional de despesas. Usar uma descrição curta, ação principal “Nova despesa”, filtros compactos e resumo com quantidade, valor finalizado e valor pendente, sempre identificando o escopo. Na tabela, alinhar valores à direita, padronizar datas/status e concentrar ações secundárias em um menu, mantendo visualizar acessível. O formulário deve distinguir destinatário escolhido de novo nome, apresentar validações locais e deixar o status coerente com a ação executada.

**Relatórios:** apresentar período, critérios e atualização junto ao resumo. Priorizar receita, despesa e saldo quando esses conceitos forem reunidos. Usar tabelas e gráficos complementares, com base de cálculo explícita. No anual, separar natureza financeira de pagamento e manter os totais reconciliáveis. Em telas menores, oferecer uma leitura mensal ou resumo antes da tabela larga de doze meses.

**Documentos:** adotar cabeçalho discreto, identificação da empresa, período, critérios, números tabulares e totais destacados. Evitar copiar os gradientes da tela para impressão. Repetir cabeçalhos de tabelas, impedir cortes de linhas e informar paginação/data de geração. O documento individual de saída deve ter identidade e linguagem próprias de despesa.

Essas são propostas fundamentadas no código e nos fluxos, não mockups aprovados ou validação visual de uma nova interface. Os refinamentos visuais podem ser apresentados em imagens antes da implementação, conforme a preferência já informada para o projeto.

## Ordem de implementação recomendada

1. **Gravação confiável:** P1-02, P1-03 e P1-04; alinhar as ações com permissões/status (P2-05).
2. **Cálculos e consulta confiáveis:** P1-01, P1-07 e P1-08; corrigir busca, datas, critérios dos indicadores e bases dos relatórios.
3. **Documentos completos:** P1-05 e P1-06; corrigir CSV, endereço da empresa e impressão por período.
4. **Uso diário e apresentação:** atualização sem reload, filtros/paginação, ações acessíveis, contraste e harmonização visual.

As mudanças em agregações SQL devem ser versionadas em migrações que preservem RLS, autenticação e grants. Não é adequado reaplicar indiscriminadamente os scripts antigos de criação de funções. Também devem permanecer intactos os códigos internos `ENTRADA`/`SAIDA`; o rótulo visível de venda continua “Venda”, conforme a decisão anterior.

## Critérios de aceite das correções

- Com mais de 1.000 saídas, quantidade e valor correspondem ao conjunto completo definido pelos critérios.
- Dois cliques e uma tentativa após falha de comunicação não criam duas despesas para a mesma operação.
- Finalização e cancelamento usam transições explícitas; não há sucesso com status diferente do solicitado.
- Limpar campos remove os vínculos; trocar o destinatário não mantém um ID incompatível; falha no cadastro solicitado interrompe o salvamento.
- ADMIN e operador veem somente ações aplicáveis; o servidor continua negando operações não autorizadas.
- Venda e despesa no mesmo pagamento/mês aparecem separadamente e reconciliam com os totais gerais, na tela e no PDF.
- Erro de consulta não aparece como saldo zero; exportação não usa dados ausentes ou de filtros anteriores.
- Exportação completa inclui todas as linhas filtradas, sem depender da página aberta; exportação parcial é identificada.
- Períodos inválidos são rejeitados; busca retorna registros coerentes; paginação não deixa o usuário em uma página vazia indevida.
- Quantidades, descontos e distribuição de categorias têm definições claras e resultados conferíveis.
- CSV com vírgulas/aspas/quebras de linha abre corretamente; documentos incluem endereço completo e critérios.
- Impressão A4 e PDF são renderizados e conferidos; teclado, foco, contraste e comportamento em telas menores são validados.

## Verificações executadas e evidências

| Verificação | Resultado |
| --- | --- |
| Reproduções locais de cálculos, gravação, exportação e proteções | Concluídas em banco em memória, com dados fictícios. |
| Seis testes selecionados de autenticação, autorização e integridade em `tests/p0-p1.test.cjs` | 6 passaram; 0 falharam. Não corresponde à execução de toda a suíte. |
| `npm run type-check` | Passou. |
| ESLint dos seis arquivos principais da auditoria | 0 erros; **110 avisos**, principalmente tipos `any` e declarações não usadas. |
| Supabase publicado, navegador, PDFs renderizados e impressão física | Não verificados nesta etapa. |

Arquivos de apoio:

- [Script reproduzível](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-financeiro-2026-10-03/reproducoes.cjs).
- [Resultados das reproduções](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-financeiro-2026-10-03/evidencias.json).

Para executar as reproduções a partir da raiz do projeto: `node docs/auditoria-financeiro-2026-10-03/reproducoes.cjs`.

Também recomendo remover logs de conteúdo financeiro do frontend/API, substituir `any` por contratos de saída validados e unificar a definição do calendário comercial de Fortaleza. Antes de aceitar períodos muito extensos, deve-se conferir o limite de linhas das RPCs no Supabase publicado. São pontos preventivos; não foram contados como P0/P1 reproduzidos.

Este relatório encerra a etapa de diagnóstico. Nenhuma correção na aplicação foi aplicada, e não foi feito commit ou push.
