# PDV Lojas Manu

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

ADMIN e operadores autorizados que atendem clientes e registram pedidos.
Uso principal confirmado: computador com teclado e mouse.

## Product Purpose

Cadastrar e localizar clientes, montar pedidos no PDV, acompanhar pedidos e
emitir documentos. O usuário quer uma operação moderna, útil, fácil e rápida.
O maior atrito confirmado está em montar e finalizar a venda no PDV.

## Operating Context

Loja de móveis. O dashboard serve ao dono/gerente e operadores, com o mesmo painel de vendas e operação. Comparações usam histórico real; sem metas cadastradas nesta etapa.

O fluxo existente permite selecionar produto, quantidade, preço, desconto e cor;
associar cliente/endereço; informar tipo de atendimento, pagamento e observação;
conferir, salvar e imprimir pedidos. Clientes e pedidos possuem busca, filtros,
paginação e consultas de histórico. Celular e tablet são superfícies existentes,
mas não foram confirmados como o ambiente principal deste refinamento.

## Capabilities and Constraints

Aplicação existente em Next.js/React, MUI, tRPC, Zustand e Supabase.
Idioma português do Brasil, valores em reais e datas civis brasileiras.
Autenticação e autorização verificadas no servidor; escrita transacional,
idempotência, controle de versão e proteção de pedidos encerrados.
Cliente pode ter vários endereços, com principal ativo único. Pedidos preservam
uma cópia do endereço usado. Não há fila de sincronização offline comprovada.
Refinamentos devem preservar essas regras e os contratos das correções P0/P1/P2.

## Evidence on Hand

Código das rotas `/pdv`, `/pedidos`, `/clientes` e componentes relacionados.
Auditoria e correções em `docs/auditoria-2026-10-01/`.
Há testes locais e um simulador do Supabase com dados fictícios.
Capturas locais não representam dados ou operações de produção.

## Product Principles

- Priorizar a venda no computador e a clareza da próxima ação.
- Diminuir cliques, troca de contexto e procura de informações.
- Tornar cliente, endereço, itens, descontos e total verificáveis antes de salvar.
- Conservar rascunho e informar falhas sem simular sucesso.
- Aprovar o desenho da experiência antes de alterar a implementação.

## Open Decisions

Volume típico de itens por pedido, funções específicas
de cada operador, necessidades especiais de acessibilidade e metas quantitativas
de tempo ainda não foram informados. Não inventar esses fatos.
