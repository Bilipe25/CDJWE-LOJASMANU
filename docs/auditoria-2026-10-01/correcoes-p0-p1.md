# Correções P0 e P1 — Clientes, PDV e Pedidos

Data: 01/10/2026. Referência: [auditoria original](./relatorio.md).

As correções dos **1 P0 e 16 P1** foram implementadas no projeto e na migração SQL. Os testes locais passaram. A migração **foi aplicada no Supabase remoto em 01/10/2026**, após confirmação explícita do usuário. A conta `cdjweltda@gmail.com`, criada pelo usuário no Supabase Auth, foi habilitada como **ADMIN ativo**. A publicação da aplicação atualizada e o aceite visual final continuam pendentes.

## Correspondência com a auditoria

| Achado | Correção implementada | Verificação |
| --- | --- | --- |
| P0-01 — acesso público | Login por Supabase Auth; JWT verificado no servidor a cada contexto; operador ativo obrigatório; todas as páginas e procedures protegidas; exclusão de pedido exige ADMIN; RLS e permissões da migração bloqueiam anônimos e escrita direta nas entidades principais, incluindo tabelas legadas de importação. Credenciais fixas e flag de login removidas. | Testes do middleware, contexto, SQL/RLS e HTTP 401. Permissões e RLS verificados no Supabase real; publicação da aplicação pendente. |
| P1-01 — pedidos parciais | Criação, edição integral, exclusão e alterações de itens usam uma RPC transacional. Falhas desfazem cabeçalho e itens. Numeração é obtida dentro da transação, com bloqueio adicional para RPCs legadas. | Rollback de criação, edição e exclusão; erro de numeração. |
| P1-02 — cliente/endereço parciais | Cliente e endereço são gravados na mesma transação, incluindo edição e desativação. | Rollback de cadastro e atualização; 11 regressões de endereço. |
| P1-03 — reenvio duplicado | Chave persistida por nova venda; deduplicação por operador/chave no banco; rejeição da mesma chave com dados diferentes; confirmação bloqueada durante envio. Duplicação mantém a confirmação aberta em caso de falha para permitir retry com a mesma chave. | Reenvio dos routers e da API HTTP; duplicação idempotente. |
| P1-04 — valores inválidos | Quantidade/preço/descontos validados; totais calculados com arredondamento de centavos no store e banco; desconto geral recalculado; finalização confere e recalcula pedidos antigos. Saídas sem itens mantêm valor manual. | Totais adulterados, descontos excessivos, arredondamento, atualização e finalização de legado inválido. |
| P1-05 — edição incompleta | Hidratação integral de identidade, número, versão, data, cliente/endereço, pagamento, contato, observação, descontos e itens; impressão usa o modelo consolidado. | Store e detalhe HTTP preservam campos. Aceite visual da edição pendente. |
| P1-06 — rascunho divergente | Dados usados no envio vêm do store persistido; migração de rascunho antigo; nova venda zera identidade/desconto; limpar carrinho elimina desconto; reset retorna à primeira etapa móvel. | Reset, limpar carrinho e hidratação do store. Retomada por reload no navegador pendente. |
| P1-07 — atalhos | Listener acompanha os valores atuais; Enter limitado aos campos do item; Escape trata somente a busca/seleção em foco; não limpa cliente ao atuar em produto. | Revisão do código e type-check; teste interativo de teclado pendente. |
| P1-08 — busca ignorada | Busca por número/nome aplicada no SQL antes da paginação; termos literais preservam pontuação; lista e indicadores compartilham o filtro. | Número existente/inexistente, apóstrofo, `%`, `_`, vírgula e número grande. |
| P1-09 — erro vira vazio | Alertas e retry em Clientes, Pedidos, detalhes e catálogos; indicadores indisponíveis exibem traço; edição indisponível bloqueia o formulário e preserva o rascunho. | Propagação de erro nos routers/HTTP e revisão das renderizações. Aceite visual dos alertas pendente. |
| P1-10 — indicadores | Agregação no banco, independente da página/limite de retorno; vendas/compras somam somente FINALIZADO + ENTRADA; hoje usa `finalizado_em` em Fortaleza; filtros compartilhados. | Universo com diferentes status/tipos e 1.005 registros. |
| P1-11 — status/concorrência | Versão obrigatória e bloqueio da linha; conflito não sobrescreve dados; encerrados não podem ser editados/finalizados novamente; finalização/cancelamento somente de PENDENTE/CONFIRMADO. Mensagens de conflito preservadas na interface. | Conflito dos routers e HTTP 409; encerrados e alterações de itens bloqueados. |
| P1-12 — cache | Invalidação do conjunto dependente após mutations em Clientes, PDV e Pedidos, incluindo cadastro rápido; cache e rascunho limpos ao sair. | Revisão dos caminhos de mutation. Navegação integrada pendente. |
| P1-13 — data no PDF | Campos DATE usam utilitários de data civil; novo rascunho e rodapé usam dia local. | Regressão de 01/10/2026 e horário local após 21h. |
| P1-14 — contraste | Ações primárias/secundárias usam `#0369a1` com branco; resumo da confirmação usa o mesmo fundo. | Contraste calculado aproximadamente 5,9:1; confirmação visual pendente. |
| P1-15 — teclado na impressão | Opções de impressão/download são botões nativos com foco visível; preço editável possui foco e suporte a Enter/Espaço. | Revisão de semântica/handlers; percurso real de teclado pendente. |
| P1-16 — zoom bloqueado | Removidos `maximumScale` e `userScalable` restritivos do viewport. | Revisão da configuração; teste em dispositivo/zoom 200% pendente. |

## Validação concluída

- `npm test`: **45 aprovados, zero falhas**. Os testes executam os routers e a migração em PostgreSQL local via PGlite; a migração é aplicada e reaplicada nas fixtures. Quatro testes adicionais conferem precisão monetária, triggers de cálculo, numeração MAX legada, pré-requisitos/views e bloqueio das tabelas antigas, conforme metadados lidos no Supabase real. O loader dos testes de store não executa persistência real do navegador.
- `npm run type-check`: aprovado.
- `npm run build`: aprovado. Permanecem avisos anteriores sobre metadados de navegadores, lockfile da pasta superior e `localstorage-file` do ambiente.
- Integração HTTP com Next real e simulador local: leitura/criação anônimas e token inválido retornam 401; operador autorizado acessa o detalhe completo; reenvio não duplica; versão antiga retorna 409; busca inexistente retorna zero; falha de consulta retorna erro.
- Migração e habilitação de ADMIN concluídas no banco real. O teste HTTP usa Auth/PostgREST simulados e SQL real em banco descartável. Os testes adicionais reproduzem os triggers observados; as mutations de cliente/pedido remotas não foram exercitadas com dados de produção.
- Verificação remota por SQL: contagens comerciais iguais antes/depois; novas colunas e campos da view presentes; RLS habilitado; anônimos sem acesso às tabelas/views/RPCs do PDV; escrita direta nas quatro entidades principais negada ao papel `authenticated`.
- Verificação efetiva em transação somente leitura, com `SET LOCAL ROLE authenticated` e identidade da conta autorizada: ADMIN lê views, lista e indicadores; lista/indicadores têm a mesma contagem; conta não habilitada lê zero clientes/pedidos; API não altera papéis nem executa as RPCs legadas de escrita. O teste terminou com rollback e resultado `APROVADO`. Isso verifica autorização SQL, sem simular um login HTTP real com senha/JWT.

O navegador integrado mostrou o redirecionamento inicial ao login, mas recusou a conexão local na etapa final (`ERR_CONNECTION_REFUSED`), inclusive com o servidor respondendo HTTP 200 pelo terminal. Assim, não foi concluído o percurso visual/teclado com as mudanças finais. A integração MUI/Next para cache de estilos no SSR também foi adicionada e compilada; seu efeito visual ainda precisa do aceite no navegador. As capturas da auditoria original são históricas, anteriores às correções.

Os testes de reenvio usam chamadas concorrentes na fixture PGlite, que atende um banco local em uma conexão; não são um teste de carga com múltiplas conexões de produção. O bloqueio e a versão são executados dentro das funções PostgreSQL.

O script `npm run lint` continua com o problema P2 já registrado na auditoria (`next lint`). Não foi considerado um check aprovado. Os demais P2 seguem fora desta entrega, salvo ajustes adjacentes necessários aos P0/P1. O script histórico `reproducoes.cjs` descreve o código anterior; os testes atuais estão em `tests`.

## Ativação no Supabase

Esta versão depende da migração. A configuração local disponibiliza somente a chave pública; o SQL Editor administrativo aberto no Chrome foi usado para conferir o banco `fuqycopmtebzypcsuzpa`, projeto lojasmanu, PostgreSQL 17.6. O pacote [ativacao-supabase.sql](./ativacao-supabase.sql) foi conferido integralmente no editor e **executado com sucesso**, reunindo o pré-requisito de endereço, a migração e a habilitação exclusiva da conta autorizada em uma transação. Também foi executado com sucesso em banco local descartável. O SQL Editor retornou apenas `cdjweltda@gmail.com / ADMIN / true` na lista de operadores.

Contagens anteriores e posteriores: **407 clientes, 204 endereços, 1.643 pedidos e 700 itens**. As colunas estruturadas de endereço e telefone já existiam; a view recebeu os campos adicionais e versão. As cinco tabelas legadas `tblClientes`, `tblPedidos`, `tblItensPedidos`, `tblProdutos` e `tblCores` tinham permissões públicas; o pacote retirou o acesso dos papéis da API a essas tabelas, preservando seu conteúdo e a manutenção administrativa. Nenhuma delas é referenciada pelo código em `src`. O registro de políticas/ACLs anterior está em [permissoes-antes-supabase.txt](./permissoes-antes-supabase.txt); esse registro de metadados não é um backup dos dados comerciais.

Evidências da aplicação: [ADMIN ativo](./admin-ativado-supabase.png), [verificação de schema/permissões](./verificacao-remota-supabase.txt), [verificação efetiva de RLS](./verificacao-rls-remota.txt). As consultas de verificação estão em [verificar-supabase.sql](./verificar-supabase.sql) e [verificar-rls-supabase.sql](./verificar-rls-supabase.sql). O pacote de ativação não exclui nem reescreve dados comerciais.

Antes da migração, o site publicado abriu o PDV com a sessão antiga identificada como `lojasmanu`, enquanto esta versão usa e-mail/Supabase Auth. **A versão antiga agora perdeu acesso ao banco**; falta publicar a aplicação atualizada. Nenhum deploy foi realizado nesta etapa. Os passos abaixo registram o procedimento da ativação concluída e os checks restantes; não é necessário recriar a conta ou repetir a migração para continuar a publicação.

1. Conferir uma cópia de homologação do schema real, principalmente views, constraints, triggers e RPC `obter_proximo_numero_pedido()`. Fazer backup antes da alteração de permissões.
2. Se ainda faltarem, aplicar [campos de endereço](../../ADD_CAMPOS_ENDERECO_MIGRATION.sql) e [telefone de contato](../../ADD_TELEFONE_CONTATO_MIGRATION.sql).
3. Aplicar [202610010001_p0_p1_integridade.sql](../../supabase/migrations/202610010001_p0_p1_integridade.sql) pelo SQL Editor ou pela ferramenta administrativa já usada no projeto. Requer PostgreSQL com views `security_invoker` (15+). O script preserva as colunas existentes e acrescenta versão; políticas restritivas anteriores permanecem válidas.
4. Usar contas reais de **Authentication → Users** e habilitar somente as pessoas autorizadas em `public.pdv_operadores`. A migração não habilita automaticamente todas as contas. Exemplo para uma conta existente, substituindo o UUID e escolhendo seu papel:

```sql
INSERT INTO public.pdv_operadores (user_id, papel, ativo)
VALUES ('UUID_DA_CONTA_EXISTENTE', 'ADMIN', true)
ON CONFLICT (user_id) DO UPDATE
SET papel = EXCLUDED.papel, ativo = EXCLUDED.ativo;
```

O outro papel disponível é `OPERADOR`. Só ADMIN pode excluir pedidos. O navegador não recebe permissão de conceder papéis. Senhas devem ser administradas pelo fluxo do Supabase; nenhuma senha de produção deve ser colocada no código.

5. Coordenar a atualização do frontend/API com a migração e habilitação dos operadores. O frontend antigo usa acesso anônimo e deixará de funcionar após o fechamento das permissões. O novo frontend exige e-mail/senha do Supabase Auth e as novas RPCs.
6. Repetir o aceite em homologação: login/logout e acesso direto; criar/editar cliente com endereço completo; editar pedido preservando data/número/desconto; retry após resposta perdida; dois operadores com versões diferentes; finalizar/cancelar; busca/indicadores; imprimir; rascunho por reload; falhas/offline; teclado e zoom 200% em desktop/celular.

Pedidos encerrados permanecem sem reabertura/edição/exclusão neste fluxo; a duplicação gera um novo pedido pendente. `finalizado_em` é preenchido nas novas finalizações. O histórico anterior fica sem data de finalização quando ela não existe, pois não é possível inferi-la com precisão pela data original do pedido. Nenhum histórico foi reescrito automaticamente.

## Reproduzir os testes locais

Na raiz do projeto:

```powershell
npm test
npm run type-check
npm run build
```

Para repetir a integração HTTP, iniciar em um terminal o simulador descartável:

```powershell
node tests/helpers/simulador-supabase.cjs
```

Em outro terminal, configurar apenas aquele processo de desenvolvimento:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:3311'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='chave-publica-somente-teste'
npm run dev -- --hostname 127.0.0.1 --port 3110
```

Em um terceiro terminal:

```powershell
node tests/helpers/verificar-http.cjs
```

Executar uma vez por instância nova do simulador: ele fornece um pedido inicial número 1, e o teste cria dados descartáveis. Os helpers não são importados pela aplicação. A conta fictícia funciona somente nesse simulador local. Encerrar os dois servidores após o teste e usar um terminal novo para desenvolvimento com a configuração real.
