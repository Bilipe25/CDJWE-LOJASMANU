---
version: 1
slug: "src-app-clientes-page-tsx"
primary_target: "src/app/clientes/page.tsx"
related_targets: []
---

# Clientes — composição aprovada

Modo Operate. Rota `/clientes`. Uso principal no computador, teclado/mouse. Identidade azul/MUI herdada do PDV C aprovado.

Escolha humana em 01/10/2026 na comparação `b5dcaac3`: `ficha-janela`; buildPath comp; sem alteração da preferência. Imagem aprovada: `.impeccable/mocks/decision/clientes-c.png`; sidecar aprovado. Três composições visualizadas; não repetir aprovação.

Composição: lista ampla com nome/contato, compras finalizadas, situação e ações; busca e seletor de situação compactos. Ficha em janela com contato, dois grupos Endereços e Histórico e rodapé Nova venda / Editar cliente / Fechar. Adaptação estreita empilha os grupos sem ocultar informação ou acesso por teclado.

Endereços estruturados, principal ativo único, acesso a outros endereços relevantes e preservação dos históricos. A demonstração mostra dois endereços, não define limite do produto. Histórico deve manter paginação/consulta real, não truncar ao três registros ilustrativos.

Nova venda no PDV passa cliente validado e preserva rascunho existente mediante confirmação. Cliente inativo não selecionável em nova venda. Ação de desativar é secundária; reativar usa semântica própria. Valores de compras seguem o critério de pedidos finalizados do servidor.

Não literalizar: dados fictícios, contadores derivados só da página, disponibilidade de todos os comandos a qualquer perfil, cores sem verificação, imagem como evidência funcional. Cadastro/edição devem herdar a gramática e conservar todos os campos estruturados; esconder optional não significa apagar dados.

Estado: composição aprovada, implementação ainda não iniciada. Sem mudanças de dados, migração, commit ou publicação nesta etapa.

## Estado implementado — 02/10/2026

Esta seção atualiza o estado pré-implementação acima, preservando a decisão e a aprovação originais. Código atual: ficha com largura máxima desktop de 900 px, nome 24 px/peso 700, contato em grid `1fr 1.5fr 1fr` a partir de sm e empilhado abaixo; Endereços/Histórico 6/6 a partir de md, empilhados em telas menores. Endereços usam raio explícito de 12 px. Histórico consulta 25 registros por página; tabela com Número/Total/Ações, data e status dentro da primeira célula. Três registros na segunda página da captura são dados do cenário, não limite.

Nova venda permanece condicionada a cliente ativo e confirmação de descarte quando há rascunho. Compras finalizadas não são soma irrestrita do histórico. Cadastro/edição mantêm campos e expansão dos endereços estruturados.

Sistema extraído em `DESIGN.md` e `.impeccable/design.json`. Evidência: `review/clientes-ficha-desktop.png`, `review/clientes-ficha-mobile.png`, código e `review/finish-verdict.md`. Ship limita-se aos cinco achados resolvidos da revisão; não certifica todos os estados, WCAG ou leitor de tela. Dados locais fictícios. Sem nova aprovação, publicação ou alteração de regras nesta documentação.
