---
version: 1
slug: "src-app-pedidos-page-tsx"
primary_target: "src/app/pedidos/page.tsx"
related_targets: []
---

# Pedidos — composição aprovada

Modo Operate. Rota `/pedidos`. Usuário principal no computador, teclado/mouse. Refinamento dentro da identidade azul/MUI e do PDV C aprovado.

Escolha humana em 01/10/2026 na comparação `b1acc312`: `tabela-janela`; buildPath comp; sem alteração da preferência. Imagem aprovada: `.impeccable/mocks/decision/pedidos-c.png`; sidecar aprovado. Três composições visualizadas; não repetir aprovação.

Composição: tabela ampla; busca e filtros compactos; Novo pedido leva ao PDV, Exportar secundário. Janela de consulta reúne status, cliente/contato, endereço histórico, atendimento/pagamento, itens, financeiros e ações num rodapé acessível. Fechar retorna à consulta, filtros e página preservados.

Aplicar ações conforme status e autorização: finalizar com confirmação; edição de encerrados bloqueada; cancelamento/duplicação/impressão preservados; excluir somente ADMIN. Confirmar no código as condições reais, não substituir por aparências da imagem.

Não literalizar: dados fictícios, timestamp inventado às10:24, busca por telefone sem contrato comprovado, totalizadores calculados apenas da página, todas as ações habilitadas para todos os status. Imagem não prova contraste ou responsividade. Em notebook/celular/zoom, adaptar largura e altura do diálogo e conservar foco/ações.

Estado: composição visual aprovada; nenhum componente de produção alterado nesta etapa. Implementação precisa preservar as correções anteriores e resolver os achados de audit pertinentes.

## Estado implementado — 02/10/2026

Esta seção atualiza o estado pré-implementação acima, preservando a decisão e a aprovação originais. Código atual: consulta em tabela, busca/situação descobertas e filtros adicionais progressivos; detalhe em diálogo `maxWidth="md"`, fullscreen abaixo de md. Título 24 px/peso 700; faixa baixa em três grupos Cliente/Telefone → Endereço histórico → Atendimento/Pagamento. Resumo financeiro abaixo dos itens, alinhado à direita, largura 320 px a partir de sm e 100% abaixo; total azul 24 px/peso 700. Rodapé de ações condicionado por estado e autorização.

Indicador monetário: “Vendas finalizadas na consulta”, respeitando o critério FINALIZADO/ENTRADA da RPC, distinto do total de pedidos e dos pendentes. Fechar conserva consulta. Permissões, proteção de encerrados, exclusão ADMIN, snapshots e descontos reais continuam sendo contratos do produto.

Sistema extraído em `DESIGN.md` e `.impeccable/design.json`. Evidência: `review/pedidos-desktop.png`, `review/pedidos-mobile.png`, `review/pedidos-detalhes-desktop.png`, código e `review/finish-verdict.md`. Ship limita-se aos cinco achados resolvidos; não certifica todos os estados, WCAG ou leitor de tela. Dados locais fictícios. Sem nova aprovação, publicação ou alteração de regras nesta documentação.
