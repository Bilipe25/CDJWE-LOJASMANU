---
name: PDV Lojas Manu
description: Interface operacional para montar vendas e consultar pedidos e clientes.
colors:
  primary: "#0369a1"
  primary-light: "#38bdf8"
  field-hover: "#0ea5e9"
  success: "#047857"
  warning: "#92400e"
  error: "#b91c1c"
  info: "#1d4ed8"
  background: "#f8fafc"
  paper: "#ffffff"
  text: "#0f172a"
  text-secondary: "#475569"
  divider: "#e2e8f0"
typography:
  title:
    fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.4
  section:
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  total:
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
  button:
    fontWeight: 600
rounded:
  surface: "12px"
  control: "10px"
  chip: "8px"
  navigation: "24px"
spacing:
  compact: "8px"
  field: "12px"
  group: "16px"
  panel: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 24px"
  button-outlined:
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "10px 24px"
  operational-surface:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.surface}"
  field:
    rounded: "{rounded.control}"
  status-chip:
    rounded: "{rounded.chip}"
  navigation-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.navigation}"
---

# Design System: PDV Lojas Manu

## Overview

O mundo atual é **Operate**, dentro da identidade azul/MUI existente. A interface concentra busca, dados verificáveis e a próxima ação em superfícies claras. A densidade atende principalmente computador com teclado e mouse; telas estreitas reorganizam o trabalho e conservam acesso às ações.

Este registro descreve o código após a rodada de implementação de `/pdv`, `/pedidos` e `/clientes`, incluindo componentes compartilhados. As composições locais continuam nos respectivos registros de superfície. Não foi escolhido um novo nome metafórico ou uma nova identidade nesta documentação.

**Key Characteristics:**

- Azul nas ações principais, navegação ativa e totais.
- Branco e slate com bordas discretas e grupos compactos.
- Sans da aplicação, valores tabulares e estados textuais.
- MUI para controles, ícones, foco, diálogos e feedback.

## Colors

### Primary

O azul operacional identifica a ação principal e a página ativa. O tom claro pertence ao theme; o azul de hover dos campos marca interação. O theme também possui `secondary.main` igual ao primary: isso não constitui um segundo acento visual independente.

### Neutral

O fundo frio separa o espaço de trabalho do papel branco. Texto escuro lidera; texto secundário identifica apoio e cabeçalhos de tabela. Divider separa grupos e delimita superfícies.

Verde, âmbar, vermelho e azul informativo têm papéis semânticos. `StatusBadge` associa PENDENTE a warning, FINALIZADO a success, CANCELADO a error, CONFIRMADO a info e INATIVO a default, sempre com texto.

**The Estado explícito Rule.** Salvar no PDV comunica Pendente; a apresentação não deve sugerir Finalizado. Indicadores de vendas finalizadas permanecem distintos do total de pedidos da consulta.

## Typography

A pilha sans declarada está no frontmatter e em `src/app/providers.tsx`. Inter é a primeira preferência; não há carregamento de Inter comprovado no layout inspecionado, portanto não se afirma que seja a fonte efetivamente renderizada em todos os ambientes.

PDV, Pedidos e Clientes usam um único título de página na barra superior, semanticamente h1 com a aparência h6 existente. `OperationalHeader` reúne somente descrição e ações, sem repetir o título no conteúdo. As seções usam h6; o conteúdo e apoio usam body/body2/caption MUI. Títulos de pedido e nome na ficha têm override de 24 px e peso 700. Total persistente do PDV usa h5; total no detalhe do pedido recebe 24 px. Não se força um novo display ou uma nova escala para reproduzir o bitmap aprovado.

**The Conferência numérica Rule.** Tabelas operacionais, resumos e total do PDV usam numerais tabulares para facilitar a conferência. Manter valores e datas no formato brasileiro adotado pelo produto.

## Layout

Navegação desktop em sidebar de 240 px; conteúdo e rodapé do PDV respeitam essa largura. Abaixo de md, a navegação usa drawer temporário. O theme mantém os breakpoints MUI; estes não foram redefinidos pelo projeto.

O ritmo local usa espaçamento MUI em passos observados de 8, 12, 16, 20 e 24 px. Painéis operacionais usam padding responsivo de 12/20 px; tabelas usam padding horizontal 8/16 px e vertical 10 px. Cabeçalhos e ações permitem quebra de linha. Esses passos descrevem o uso atual, sem impor uma escala nova a todas as páginas.

No PDV, lg distribui carrinho/contexto em 8/4 colunas. Em 1024 px as áreas empilham; abaixo de md há duas etapas. O rodapé financeiro fica fixo, com área inferior reservada no conteúdo e safe-area no celular. A consulta de Pedidos usa tabela e diálogo md; Clientes usa lista e ficha de até 900 px. Os detalhes de cada composição estão em `.impeccable/surfaces/`.

## Elevation & Depth

`operationalSurface` usa uma borda de divider e nenhuma sombra, inclusive no hover. Grupos internos usam fundo frio. O theme geral ainda possui cards de 16 px com sombras; o override operacional de 12 px e plano prevalece nas superfícies deste refinamento, sem afirmar que todo o app foi convertido.

Botões recebem a sombra de hover definida no theme. AppBar, diálogos e toasts mantêm elevação MUI/theme; o rodapé do PDV usa sombra superior suave. Valores exatos de sombra, foco e movimento estão no sidecar.

**The Superfície operacional Rule.** Usar o componente compartilhado para os painéis das três rotas; não acrescentar elevação no hover desses painéis.

## Shapes

Superfícies operacionais e grupos recentes usam cantos de 12 px; botões e campos, 10 px; chips, 8 px. A navegação usa `sx borderRadius: 2`, que neste theme equivale a 24 px. Valores numéricos de `sx` multiplicam o raio-base de 12 px: não os interpretar como pixels.

Alguns containers e diálogos legados mantêm outros múltiplos do theme. A regra de 12 px descreve as superfícies operacionais e grupos explícitos, não uma uniformidade inexistente no código.

## Components

### Buttons

Ação principal contained azul, rótulo em caixa natural e peso 600. Outlined/text apoiam editar, imprimir e fechar; destruição usa semântica de erro. O theme define padding de 10 px por 24 px e raio de controle. IconButtons possuem mínimo de 44 px por 44 px. Estados disabled e carregamento acompanham a validade e andamento reais da operação.

### Inputs / Fields

Campos outlined MUI com labels, raio de controle e hover azul. Busca usa ícone MUI e indicação do que pode ser procurado. Campos adicionais aparecem progressivamente, preservando dados e validação. Foco global visível usa outline de 2 px, offset de 3 px e cor primary; não retirar a identificação do campo em erro ou disabled.

### Chips

`StatusBadge` é pequeno, outlined, peso 600 e texto semântico. Principal/inativo nos endereços têm identificação própria; não comunicar estado apenas por cor.

### Cards / Containers

Painéis de tarefa reutilizam `operationalSurface`; tabelas reutilizam `operationalTable`. Cabeçalhos de tabela têm fundo frio, texto secundário e peso 600; linhas podem receber hover MUI sem escala decorativa. `SaleSection` fica aberto no desktop e pode usar Accordion em contexto compacto.

### Navigation

Navegação completa, ícones MUI e página atual com fundo azul e `aria-current="page"`. Desktop persistente, móvel em drawer. Marca, configuração, conexão e opções reais prevalecem sobre abreviações de mockups.

### Dialogs and feedback

Detalhes mantêm título, conteúdo rolável e ações contextualizadas. Fechar a consulta conserva filtros/página. Confirmações protegem descarte de rascunho e transições de estado; erros e loading não simulam sucesso. Toasts de atalhos/busca usam ícones MUI. A gramática desta rodada não usa entrada de página ou escala de linha ao hover; as transições existentes respeitam reduced motion.

## Do's and Don'ts

### Do:

- **Do** reutilizar superfícies, tabelas, cabeçalhos e estados compartilhados das rotas operacionais.
- **Do** manter total e ação de salvar acessíveis no PDV com espaço reservado para o rodapé.
- **Do** mostrar endereço histórico do pedido e endereços completos na ficha.
- **Do** distinguir Pendente, Finalizado e os indicadores financeiros pelo critério real do servidor.

### Don't:

- **Don't** transformar exemplos de quatro itens, dois endereços ou três linhas visíveis em limites do produto.
- **Don't** esconder preço, cor, descontos, dados estruturados ou permissões para copiar o mockup.
- **Don't** copiar dados fictícios ou controles flutuantes do ambiente de desenvolvimento.
- **Don't** interpretar este registro como certificação WCAG ou validação de todos os estados da aplicação.
