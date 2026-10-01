# Auditoria de Clientes, PDV e Pedidos

Data: 01/10/2026. Projeto: PDV Lojas Manu. Este relatório precede novas correções: nesta etapa foram criados somente os documentos e as evidências da auditoria.

## Parecer

Os módulos compilam e a correção anterior de endereços possui testes passando. Entretanto, há falhas que podem deixar pedidos sem itens, reaplicar descontos de outra venda, produzir documentos incorretos e apresentar indicadores financeiros enganosos. Recomendo corrigir a integridade das operações e do estado do PDV antes de investir nos refinamentos visuais.

O catálogo contém **30 achados agrupados: 1 P0, 16 P1 e 13 P2**. Nem todos representam incidentes observados em produção: cada item distingue confirmação no código, reprodução local e dependência do banco real. O P0 é um bloqueador arquitetural de autenticação; a extensão da exposição depende das permissões do Supabase.

| Prioridade | Critério usado | Quantidade |
| --- | --- | ---: |
| P0 | Bloqueador para operação exposta: ausência de autenticação efetiva na aplicação | 1 |
| P1 | Perda/inconsistência de dados, valores ou documentos; função principal quebrada; barreira relevante de acessibilidade | 16 |
| P2 | Correção funcional com contorno, robustez, escala, clareza, consistência e refinamento de UX/visual | 13 |

## Escopo e método

Foram revisados as páginas de Clientes, PDV e Pedidos; os routers correspondentes; o store do PDV; filtros persistidos; componentes de endereço, confirmação, impressão e entrada; autenticação/contexto tRPC; tema/layout; PDF individual e exportações PDF/Excel; schemas, utilitários de datas/endereço e SQL disponível no repositório.

Foi usado o fluxo de auditoria da skill [Impeccable](C:/Users/netes/.agents/skills/impeccable/SKILL.md), acompanhado de inspeção do código, navegador local e reproduções com falhas controladas. Não foram cadastrados clientes, modificados pedidos nem executadas migrações no banco real.

### Validação realizada e limites

- `npm run test:enderecos`: **11 testes aprovados**.
- `npm run type-check`: **aprovado**.
- `npm run build`: **aprovado**. Os avisos de metadados de navegadores antigos e de lockfile na pasta superior não impediram a compilação.
- `npm run lint`: **falhou**. O script chama `next lint`, que foi interpretado como diretório nesta versão instalada do Next: `Invalid project directory .../lint`. A análise estática de lint não foi concluída.
- **18 registros de reprodução/evidência**, usando os routers e handlers atuais com banco em memória, em [evidencias.json](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/evidencias.json). Alguns registros demonstram condições simuladas ou confirmam expressões estáticas; não são 18 testes de ponta a ponta em produção.
- Script reproduzível: [reproducoes.cjs](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/reproducoes.cjs). Executar na raiz: `$env:TZ='America/Fortaleza'; node docs/auditoria-2026-10-01/reproducoes.cjs`.
- Inspeção visual de Clientes, cadastro, PDV e Pedidos em desktop e celular de **390 × 844**; inspeção de DOM/árvore de acessibilidade.
- O detector mecânico da skill retornou `[]`: [detector.json](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/detector.json). Isso não comprova ausência de bugs ou conformidade de acessibilidade.

**Limitação material:** o servidor local iniciou, mas as consultas ao Supabase falharam com `TypeError: fetch failed`. As telas vazias e os zeros vistos nas capturas representam esse cenário, e não provam que o banco esteja vazio. Não foi possível conferir pedidos reais, tabelas preenchidas, políticas RLS, constraints, triggers, RPCs nem limites efetivos de retorno. Os SQLs disponíveis não permitem confirmar integralmente essas configurações. A chamada HTTP local sem sessão chegou ao handler e retornou 500, não 401: [conexao-local.json](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/conexao-local.json).

## P0 — bloqueador

### P0-01 — Autenticação apenas no navegador e API pública

**Confirmado no código e na navegação local.** O login compara credenciais fixas incluídas no código entregue ao navegador e grava `authenticated` em `localStorage`. O contexto tRPC não verifica usuário/sessão e os procedimentos de consulta, alteração e exclusão usam `publicProcedure`. A proteção de página encontrada está no dashboard, enquanto Clientes, PDV e Pedidos carregaram diretamente sem login.

**Impacto:** a aplicação não impõe autorização real às operações. O impacto remoto sobre dados depende de RLS, permissões da chave e demais proteções externas, ainda não verificadas; não foi testada uma escrita anônima no banco real.

**Correção proposta:** autenticação com sessão validada no servidor, procedimentos protegidos, permissões por operação, políticas RLS alinhadas e retirada das credenciais fixas. Verificar as políticas reais antes de liberar o sistema em ambiente exposto.

Fontes: [AuthContext.tsx:46](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/contexts/AuthContext.tsx:46), [server.ts:5](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/lib/trpc/server.ts:5), [pedidos.ts:153](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/pedidos.ts:153).

## P1 — integridade e funções principais

### P1-01 — Criação, edição e exclusão de pedidos não são atômicas

**Reproduzido: R02, R03 e R04.** A criação grava cabeçalho e itens separadamente. A edição no PDV remove os itens antigos antes de adicionar os novos e atualizar o cabeçalho. A exclusão também remove itens antes do pedido. Uma falha intermediária deixou um pedido criado sem itens, e outra deixou um pedido existente com zero itens.

**Correção:** uma operação transacional no banco para cada ação completa, com rollback e retorno do pedido consolidado. Evitar a sequência de várias mutations independentes no navegador. Também conferir a ordem dos eventos que recalculam totais.

Fontes: [PDV:475](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:475), [router:176](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/pedidos.ts:176), [exclusão:410](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/pedidos.ts:410).

### P1-02 — Cliente e endereço podem ficar parcialmente gravados

**Reproduzido: R01.** A falha no endereço ocorre depois de inserir o cliente. O usuário recebe erro, mas o cliente permanece; tentar novamente pode gerar outro cadastro. A atualização também separa cliente e endereço.

**Correção:** transação envolvendo os dois registros, retorno consistente e tratamento de reenvio. Fonte: [clientes.ts:135](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/clientes.ts:135).

### P1-03 — Reenvio pode duplicar pedidos

**Reproduzido no banco em memória: R10; ausência de bloqueio confirmada no código.** A mesma requisição gerou dois pedidos. O botão de confirmação não bloqueia a operação enquanto o salvamento está em andamento e não há chave de idempotência no contrato.

**Correção:** bloquear todos os caminhos de confirmação durante o envio e garantir idempotência no servidor/banco. Um retry após resposta perdida deve retornar o pedido já criado. A numeração diferente não impede essa duplicidade. Fonte: [PDV:1733](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:1733).

### P1-04 — Descontos e totais não possuem invariantes suficientes

**Reproduzido: R05 e R12.** Item de R$ 10 com desconto de R$ 20 gerou subtotal de -R$ 10; o total foi apenas limitado a zero. A camada de API aceitou total de R$ 0,01 para itens de R$ 10 no banco em memória. Há campos editáveis sem validação conjunta entre preço, quantidade e desconto.

**Dependência:** triggers reais podem recalcular o total; não foram verificados. Isso não elimina o subtotal negativo no estado do PDV nem a lacuna do contrato da aplicação.

**Correção:** calcular valores no servidor, usar precisão monetária definida, impedir descontos superiores ao valor permitido e rejeitar quantidades/preços inválidos. Verificar também o recálculo quando muda somente o desconto geral.

Fontes: [pdv-store.ts:128](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/stores/pdv-store.ts:128), [PDV:350](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:350), [schema de pedido:153](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/pedidos.ts:153).

### P1-05 — Edição não hidrata corretamente desconto, número e data do pedido

**Confirmado no código; handler de impressão reproduzido: R13.** O carregamento da edição preenche campos locais e itens, mas não restaura integralmente `pedidoAtual`. O desconto aparece no campo local, enquanto o salvamento usa o desconto do store. A impressão lê número/data/desconto desse mesmo store, podendo usar o rascunho anterior ou valores iniciais.

**Correção:** hidratar o pedido inteiro em uma única operação, com totais recalculados e identidade preservada; imprimir o modelo consolidado. Fonte: [PDV:192](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:192).

### P1-06 — Rascunho, cancelamento e próxima venda possuem estados divergentes

**Confirmado no código e reproduzido: R18.** O store persiste o pedido, mas cliente/pagamento/observação da tela são estados locais inicializados separadamente. Atualizar a página pode preservar itens e perder os campos usados no envio. Cancelar limpa o carrinho, mas conserva o desconto do store: a próxima venda de R$ 50 ficou em R$ 40 após desconto anterior de R$ 10. O reset da venda também não retorna `activeStep` à primeira etapa no celular.

**Correção:** uma fonte de verdade para o rascunho, hidratação explícita e ações distintas para limpar itens, cancelar venda e iniciar outra. Fontes: [store:121](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/stores/pdv-store.ts:121), [PDV:553](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:553), [cancelar:1547](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:1547).

### P1-07 — Atalhos podem adicionar produto com valores antigos ou no campo errado

**Confirmado no código; comparação de closures: R06.** O listener global não acompanha mudanças de preço, desconto, cor e outros valores capturados. A reprodução comparou preço antigo de R$ 10 com preço atual de R$ 20. Enter adiciona produto mesmo quando o foco está em outro campo; Escape executa dois blocos e também limpa cliente.

**Correção:** ler estado atual, restringir atalhos pelo alvo/foco e criar um único tratamento por comando. Testar Enter em observações, seletores e confirmação. Fonte: [PDV:271](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:271).

### P1-08 — Busca textual de pedidos não filtra os resultados

**Confirmado no código e reproduzido: R09.** A tela guarda a busca e mostra o filtro, mas não o envia na consulta. O schema do router também não aceita busca. Pesquisar `999999` retornou o pedido `100` na reprodução.

**Correção:** definir busca por número/cliente no contrato e aplicá-la antes da paginação, com contagem coerente. Fontes: [consulta:166](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pedidos/page.tsx:166), [campo:863](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pedidos/page.tsx:863), [router:33](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/pedidos.ts:33).

### P1-09 — Falhas de consulta aparecem como lista vazia e valores zero

**Observado no navegador local com erro de conexão real.** Clientes/Pedidos mostram estados de ausência de registros e indicadores zero quando a API falha. O carregamento do pedido para edição no PDV também não apresenta um estado dedicado de falha; a interface pode continuar como uma venda comum.

**Correção:** separar carregamento, sucesso vazio, erro e dado desatualizado; oferecer retry e impedir que uma edição indisponível seja tratada como venda nova. Preservar o rascunho. Fontes: [Clientes:122](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/clientes/page.tsx:122), [Pedidos:166](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pedidos/page.tsx:166), [PDV:696](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:696).

### P1-10 — Indicadores financeiros usam critérios inconsistentes

**Confirmado no código.** Pendentes conta apenas a página atual. Total de vendas soma todos os status, incluindo cancelados; o significado para orçamento depende dos tipos configurados. Hoje usa a data do pedido, não necessariamente a data de finalização, e compara com o dia UTC. Clientes também soma pedidos sem excluir cancelados. Há fallback que troca o universo do total quando a consulta geral falha.

O endpoint relacionado `pedidos.estatisticas` limita a amostra a 1.000, usa filtro `tipo_atendimento` incompatível com o nome visto na view disponível e transforma erros em zeros; esse endpoint não alimenta os cards atuais.

**Correção:** definir as regras de cada indicador e agregar no banco; explicitar período, filtros e status. Não apresentar erro como zero. Fontes: [cards:231](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pedidos/page.tsx:231), [clientes.stats:25](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/clientes.ts:25), [endpoint:309](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/pedidos.ts:309).

### P1-11 — Transições de status não são protegidas pelo servidor

**Reproduzido: R11.** Um pedido cancelado foi finalizado diretamente pelo router. A proteção visual de ações não constitui uma regra no servidor; operações de itens/edição não verificam uniformemente o status. Não há controle de versão observado para concorrência entre operadores.

**Correção:** matriz de transições validada no servidor, política explícita de reabertura e bloqueio ou autorização para alterar pedidos finalizados/cancelados. Adicionar detecção de alteração concorrente na transação de salvamento. Fonte: [pedidos.ts:380](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/pedidos.ts:380).

### P1-12 — Atualizações não invalidam todo o conjunto de dados dependente

**Confirmado no código; manifestação depende do cache existente.** As mutations do PDV não invalidam uniformemente lista, detalhe e estatísticas. A atualização da lista em Pedidos não invalida `getById`. Há cache de um minuto e de cinco minutos para dados gerais. Voltar de uma edição pode mostrar valores anteriores, inclusive no detalhe usado para impressão.

**Correção:** política comum de invalidação/atualização de cache por entidade, incluindo clientes e indicadores dependentes. Fontes: [Pedidos:278](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pedidos/page.tsx:278), [Providers:216](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/providers.tsx:216), [PDV:449](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:449).

### P1-13 — PDF individual pode mostrar a data do dia anterior

**Reproduzido: R15/R17.** `2026-10-01` convertido com `new Date(...).toLocaleDateString('pt-BR')` em Fortaleza resultou em `30/09/2026`. O store também usa dia UTC ao iniciar pedido, criando divergência perto da meia-noite UTC.

**Correção:** usar utilitários de data civil já existentes para campos DATE e timezone explícito para timestamps. Fonte: [pedido-pdf.ts:52](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/lib/pdf/pedido-pdf.ts:52).

## P1 — acessibilidade

### P1-14 — Texto branco dos botões principais tem contraste insuficiente

**Medido no DOM:** fundo `rgb(14,165,233)`, texto branco normal de 15 px, contraste aproximado **2,77:1** no botão Novo Cliente. A combinação reaparece no tema e em ações principais. A exigência de contraste para texto normal é 4,5:1: [WCAG 2.2 — contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Correção:** escurecer a cor usada com texto branco ou ajustar o tratamento do texto, validar estados hover/disabled e manter o azul atual onde não prejudicar leitura. Fonte do tema: [providers.tsx](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/providers.tsx).

### P1-15 — Opções de impressão não funcionam como controles de teclado

**Confirmado no componente.** Imprimir e Baixar são `Paper` com `onClick`, sem semântica de botão, foco ou tratamento de Enter/Espaço. Editar preço por clique em texto também necessita de alternativa acessível.

**Correção:** controles nativos acessíveis, foco visível e percurso de teclado completo. Referência: [WCAG — teclado](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html). Fonte: [PrintConfirmDialog.tsx:67](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/components/common/PrintConfirmDialog.tsx:67).

### P1-16 — Configuração global restringe zoom no celular

**Confirmado no código e meta viewport:** `maximum-scale=1` e `user-scalable=no`. Alguns navegadores podem ignorar a restrição, mas o projeto solicita o bloqueio.

**Correção:** permitir zoom e verificar formulários a 200%, preservando conteúdo e ações. Referência: [WCAG — redimensionamento do texto](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). Fonte: [layout.tsx:31](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/layout.tsx:31).

## P2 — correções e melhorias

### P2-01 — Apagar dados opcionais não limpa o cadastro

**Reproduzido: R07/R08.** CPF, telefone e email vazios são enviados como `undefined`; o update omite esses campos. Limpar todo o endereço também omite sua atualização. Telefone/observação no PDV usam padrão semelhante na edição.

**Correção:** diferenciar campo ausente de limpeza explícita, aceitando `null` onde apropriado. Para endereço vinculado a pedidos, definir se a ação limpa campos ou desativa o registro, sem apagar histórico inadvertidamente. Fontes: [Clientes:338](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/clientes/page.tsx:338), [PDV:508](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:508).

### P2-02 — Cliente inativo desaparece sem caminho de reativação

**Confirmado no código.** O cadastro permite desativar, mas a listagem força `ativo=true`. A interface não permite encontrar os inativos para reativar, embora as estatísticas os contabilizem.

**Correção:** filtro Ativos/Inativos/Todos e ação de reativação com contexto. Fonte: [clientes.ts:57](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/clientes.ts:57).

### P2-03 — Exportação limitada à página e dados da empresa inconsistentes

**Confirmado no código.** PDF/Excel recebem apenas `pedidos` da página atual. O diálogo informa a quantidade; portanto, não é uma exportação silenciosa de todas as páginas, mas falta uma opção para todo o resultado filtrado. A impressão individual monta endereço da empresa; a exportação recebe configuração bruta, enquanto os geradores esperam `endereco` já formatado.

**Correção:** escolher Página atual/Todos os filtrados, buscar os registros de forma paginada e normalizar os dados da empresa em um adaptador comum. Fontes: [Pedidos:517](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pedidos/page.tsx:517), [quantidade:1747](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pedidos/page.tsx:1747).

### P2-04 — Busca de produto promete código, mas filtra apenas nome

**Confirmado no código.** O PDV solicita nome ou código; o router usa somente `ilike('nome')`.

**Correção:** pesquisar também código, priorizar correspondência exata e testar leitor de código sem afetar atalhos. Fontes: [PDV:797](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:797), [produtos.ts:52](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/produtos.ts:52).

### P2-05 — Limpar produto no Autocomplete não limpa a seleção controlada

**Confirmado no handler.** `onChange` ignora `newValue=null`; a seleção anterior e seus valores continuam no estado.

**Correção:** reset coerente de produto, cor, quantidade, preço e desconto ao limpar; validar também blur e seleção por teclado. Fonte: [PDV:787](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pdv/page.tsx:787).

### P2-06 — Gestão de endereços e histórico ainda precisam de regra completa

**Limitação funcional e melhoria de modelo.** Clientes edita apenas principal/primeiro; PDV pode selecionar múltiplos. Não há gestão completa de múltiplos endereços nem proteção observada contra múltiplos principais. O pedido guarda vínculo ao endereço mutável: alterar o cadastro altera uma futura reimpressão antiga. Essa última limitação já está documentada em [ENDERECOS_CLIENTES.md](C:/projetos/lojasmanu/CDJWE-LOJASMANU/ENDERECOS_CLIENTES.md).

**Correção proposta:** lista de endereços com principal explícito, regra de unicidade no banco e cópia dos dados usados na venda se o negócio exigir fidelidade histórica. Não confundir isso com a perda de campos corrigida anteriormente.

### P2-07 — Consultas amplas podem truncar dados e degradar desempenho

**Risco demonstrado sob limite simulado: R14; configuração real pendente.** Pedidos busca até 10.000 registros para calcular cards; Clientes soma pedidos sem paginação e busca todos os endereços de um lote de clientes. Se o limite do Supabase cortar os endereços, um cliente pode aparecer sem endereço completo mesmo tendo cadastro.

**Correção:** agregações SQL/RPC, projeção enxuta, paginação consistente e busca específica dos endereços necessários. Verificar `max_rows` efetivo e índices com volume real. Fonte: [clientes.ts:80](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/clientes.ts:80).

### P2-08 — Filtros persistidos aceitam estado inválido e excessivo

**Confirmado no código; cenários de navegação ainda precisam de E2E.** Página e tamanho vindos de URL/storage não são validados; podem ser negativos ou `NaN`. A URL serializa o objeto inteiro do cliente, quando bastaria o ID. Há timeout de limpeza da URL sem cancelamento. Após remoções, falta ajuste explícito para uma página que deixe de existir.

**Correção:** schema dos filtros, limites e defaults seguros, apenas IDs na URL, timeout cancelável e recuperação da paginação. Fonte: [usePedidosFiltros.ts:60](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/hooks/usePedidosFiltros.ts:60).

### P2-09 — Fluxo móvel e detalhes visuais geram atrito

**Observado:** o card Total em Compras quebra `R$` e valor em linhas diferentes, com altura divergente; no PDV móvel o cliente fica após a etapa de itens e não é acessível inicialmente. Há dois indicadores de calendário no mesmo campo de data de Pedidos no navegador testado.

**Confirmado por leitura responsiva:** preço/desconto da tabela deixam de estar disponíveis em alguns breakpoints; a composição usa regras diferentes para `md` e `lg`, exigindo validação em tablet. Não foi possível avaliar tabelas preenchidas no celular.

**Melhorias:** permitir iniciar pelo cliente, preservar contexto entre etapas, ações para editar item no celular, cards com valores indivisíveis e altura consistente, um único controle de data e teste em 768/1024 px. Para alvos de interação, validar pelo menos o critério de 24 px com suas exceções; 44 px pode ser adotado como conforto de toque, sem confundir com o mínimo AA: [WCAG — tamanho do alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### P2-10 — Rótulos acessíveis ausentes ou sem associação

**Confirmado no DOM/código.** Busca de Clientes depende de placeholder; seletores Status/Tipo/Forma Pgto. não possuem `labelId`/nome acessível associado, apesar do texto visual. Alguns botões de ícone no carrinho não têm nome explícito.

**Correção:** label persistente ou `aria-label`, IDs associados, nome para ícones e leitura de erros pelo leitor de tela. Fonte: [Pedidos:879](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/pedidos/page.tsx:879), [Clientes:474](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/clientes/page.tsx:474).

### P2-11 — Tema e animações precisam de consistência

**Confirmado no código.** Há referências a `primary.50` sem esse tom definido no tema, além de variações manuais de cores/estilos. Linhas usam atraso de `index × 0,05 s`; a linha 50 pode começar cerca de 2,45 s depois. Não foi encontrado tratamento de redução de movimento nos fluxos revisados.

**Correção:** tokens válidos para estados, limites de animação, respeito à preferência de movimento reduzido e linguagem visual comum para cards, diálogos e tabelas. Fontes: [PrintConfirmDialog:78](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/components/common/PrintConfirmDialog.tsx:78), [Clientes:535](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/app/clientes/page.tsx:535).

### P2-12 — Indicador “Sistema Online” não reflete a conexão

**Observado:** a mensagem permaneceu verde/online durante as falhas de API. O texto é fixo. A infraestrutura offline existente não comprova uma fila integrada ao fluxo de salvamento revisado.

**Correção:** diferenciar disponibilidade da rede, conexão com o serviço e envio pendente. Preservar rascunho e oferecer retry. Se a operação offline for requisito, implementar/testar sincronização com idempotência. Fonte: [AppLayout.tsx:304](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/components/layout/AppLayout.tsx:304).

### P2-13 — Regras duplicadas e contratos permissivos aumentam regressões

**Confirmado no código; melhorias preventivas.** Clientes possui cadastro completo e PDV cadastro rápido com regras/entradas diferentes. A montagem de impressão, formatação e estado estão espalhadas; há uso frequente de `any`/casts que permite compilar contratos incoerentes. O schema de CPF limita tamanho, sem validação completa observada; não há prevenção completa de duplicidade de cliente na aplicação.

**Correção:** compartilhar validação e modelo de formulário, adaptadores tipados para pedido/documento, normalização de CPF/telefone e detecção de cadastro existente com regra de unicidade definida pelo negócio. Não foi comprovada duplicidade real de clientes. Não tornar telefone único sem considerar contatos compartilhados.

**Qualidade automatizada:** reparar o script de lint para executar o ESLint suportado pela versão instalada e acrescentar testes de transação, idempotência, rascunho/edição, filtros e documentos. Os testes de endereços não cobrem essas outras falhas. Fonte: [package.json:11](C:/projetos/lojasmanu/CDJWE-LOJASMANU/package.json:11).

**Numeração relacionada:** R16 mostrou que `create` ignora o erro da RPC de próximo número; o banco em memória aceitou número nulo. Uma constraint real pode rejeitar esse insert. Tratar o erro explicitamente e atribuir número dentro da transação é necessário. Fonte: [pedidos.ts:176](C:/projetos/lojasmanu/CDJWE-LOJASMANU/src/server/routers/pedidos.ts:176).

## O que já funciona bem

- Endereço possui schema, campos e formatação compartilhados entre Clientes/PDV; o backend confere se o endereço pertence ao cliente.
- A seleção e restauração de endereço considera o cliente carregado e possui mensagem de falha/retry nesse ponto.
- Os 11 testes de endereços dão uma base real de regressão; type-check e build estão saudáveis.
- Existem utilitários corretos para data civil, que podem substituir a conversão incorreta do PDF.
- Paginação, filtros, exportadores separados e layout responsivo oferecem uma base útil para as correções, sem exigir reescrever o projeto inteiro.

## Avaliação de qualidade da interface

Escala editorial de 0 a 4 por dimensão, baseada no fluxo de auditoria aplicado. Não representa certificação WCAG nem medição de performance em produção.

| Dimensão | Nota | Motivo principal |
| --- | ---: | --- |
| Acessibilidade | 1/4 | Contraste, zoom, controles de impressão e associação de rótulos |
| Desempenho | 2/4 | Consultas excessivas, limites de amostra e animações por linha; sem benchmark conectado |
| Responsividade | 2/4 | Formulários adaptam; fluxo móvel, cards e tablet exigem ajustes |
| Tema/consistência | 2/4 | Base visual comum, mas tokens inexistentes e tratamentos duplicados |
| Integridade da implementação | 1/4 | Compila, porém transações, estado, erros e contratos apresentam falhas importantes |
| **Total** | **8/20** | **Base aproveitável, com correções essenciais antes de considerar os fluxos estáveis** |

## Ordem recomendada de correção

1. **Acesso e banco:** sessão no servidor, RLS/permissões verificadas; conferir schema, RPCs, triggers, constraints e migração de endereço já preparada.
2. **Integridade de pedidos/clientes:** operações transacionais, idempotência, regras de valores/status e detecção de conflito entre operadores. Tratar falhas sem perder dados.
3. **Estado do PDV:** modelo único, hidratação de edição, retomada do rascunho, reset completo, atalhos e impressão correta.
4. **Consultas e documentos:** busca real, indicadores agregados, cache, datas, exportação completa e mensagens de erro.
5. **Cadastro e experiência:** limpeza de campos, inativos, múltiplos endereços, validação compartilhada, acessibilidade e ajustes visuais/responsivos.

### Critérios de aceite para a próxima etapa

- Forçar falha entre gravação de cabeçalho e itens: nenhuma gravação parcial nem perda de itens antigos.
- Clicar duas vezes e reenviar a mesma requisição após timeout: somente um pedido criado.
- Dois operadores editando o mesmo pedido: conflito informado, sem sobrescrita silenciosa.
- Editar sem mudar nada: preservar cliente/endereço/desconto/data/número e comparar tela, banco e PDF.
- Cancelar venda com desconto e iniciar outra; recarregar página com rascunho; salvar nova venda no celular: estado consistente em todas as ações.
- Buscar número inexistente/existente, código de produto, cliente e CPF/telefone normalizados; testar mais de uma página.
- Conferir totais com pendentes, cancelados e finalizados; aplicar período/filtros e validar universo indicado.
- Testar volume acima do limite real de retorno do Supabase e exportar todos os filtrados.
- Testar DATE e timestamps em Fortaleza, incluindo horário após 21h; conferir PDF e tela.
- Operar por teclado, permitir zoom a 200%, testar leitor de tela e larguras 390/768/1024/1440 px com dados preenchidos.
- Confirmar acesso negado sem sessão e permissões por perfil, com banco de teste; testar falhas/offline com rascunho preservado.

## Evidência visual

As imagens abaixo foram capturadas no servidor local. Listas/indicadores vazios resultam das falhas de conexão mencionadas.

| Captura | Conteúdo |
| --- | --- |
| [Cadastro desktop](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/clientes-desktop.png) | Diálogo de criação de cliente |
| [Cadastro móvel](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/clientes-form-mobile.png) | Campos e disposição do formulário |
| [Clientes móvel](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/clientes-mobile.png) | Cards e listagem |
| [PDV desktop](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/pdv-desktop.png) | Composição inicial |
| [PDV móvel](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/pdv-mobile.png) | Primeira etapa e acesso ao cliente |
| [Pedidos desktop](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/pedidos-desktop.png) | Filtros, indicadores e estado vazio após falha |
| [Pedidos móvel](C:/projetos/lojasmanu/CDJWE-LOJASMANU/docs/auditoria-2026-10-01/pedidos-mobile.png) | Filtros expandidos |

Esta auditoria identifica ações concretas para estabilizar os módulos. A validação final de funcionamento integrado exige repetir os critérios de aceite com Supabase conectado e dados de teste, após as correções.
