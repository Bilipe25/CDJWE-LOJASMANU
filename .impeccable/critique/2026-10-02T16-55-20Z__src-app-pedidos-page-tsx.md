---
target: pagina de pedidos
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-10-02T16-55-20Z
slug: src-app-pedidos-page-tsx
---
Method: dual-agent (A: /root/pedidos_design_assessment · B: /root/pedidos_evidence_assessment)

# Crítica da página de Pedidos — 02/10/2026

Alvo: src/app/pedidos/page.tsx. Modo Operate. Fonte atual e versão publicada https://lojasmanu.vercel.app/pedidos. Avaliação de lista, quatro cards, filtros, detalhe e exportação. Nenhum pedido alterado.

## Veredito

A composição tabela + janela serve ao trabalho da loja. Os novos cartões combinam com a página e devem ser preservados. O próximo avanço deve tornar a consulta mais rápida e precisa, conservando a identidade azul: menos cápsulas na tabela, filtros confiáveis, indicadores explicados e exportação coerente.

## Saúde do design

| Heurística | Nota /4 | Evidência |
|---|---:|---|
| Visibilidade do estado | 3 | Loading inicial e retry existem; refetch de consulta não tem sinal claro na lista. |
| Mundo real | 3 | Reais/datas/cliente familiares; critérios financeiros e abreviações precisam clareza. |
| Controle e liberdade | 3 | Fechar e limpar filtros preservam caminhos; datas inválidas são apagadas. |
| Consistência | 2 | Exportação usa roxo/gradiente fora do sistema azul. |
| Prevenção de erros | 2 | Estados e permissões protegidos; período invertido elimina silenciosamente o filtro. |
| Reconhecimento | 3 | Labels/ARIA/status textuais; pagamento truncado aumenta inspeção. |
| Eficiência | 2 | Busca e filtros úteis; cabeçalhos não ordenam e não há acelerador explícito. |
| Estética e minimalismo | 3 | Cards planos e limpos; até cinco chips por linha fragmentam leitura. |
| Recuperação de erros | 2 | Retry de consultas existe; erro de período não explica nem preserva intenção. |
| Ajuda contextual | 2 | Tooltips presentes; indicadores e confirmação podem explicar critérios melhor. |
| Total | 25/40 | Aceitável; base utilizável, refinamentos relevantes. |

Nota indicativa de UX, não certificação WCAG nem resultado de testes de operações.

## O que funciona

1. Cards compactos alinhados à tabela, usando borda/fundo/azul existentes.
2. Busca e Status visíveis, demais filtros progressivos e filtros ativos removíveis.
3. Detalhe reúne endereço histórico, cliente, itens, totais e rodapé acessível; ações condicionadas ao estado e perfil.

## Cinco prioridades

### 1. [P1] Período invertido apaga o filtro silenciosamente

Fonte: src/lib/schemas/filtros-pedidos.ts:17, usado por src/hooks/usePedidosFiltros.ts. Quando data inicial supera a final, a validação zera ambas. A consulta pode passar de um período restrito para todos os períodos sem explicar o problema. É um achado confirmado no código; não foi provocado no navegador de produção.

Correção: preservar os valores digitados, exibir erro junto às datas e manter a última consulta válida até corrigir. Bloquear exportação enquanto os filtros estiverem inválidos. Comando: impeccable harden.

### 2. [P2] Cinco chips por linha disputam atenção

Fonte: src/app/pedidos/page.tsx:738 (número), :770 (tipo), :779 (pagamento), :799 (itens), :811 (status); verificação visual desktop. Número, tipo, pagamento, quantidade e status usam cápsulas. Pagamento fica limitado a 120px e truncado mesmo na tela ampla.

Correção: número como texto azul e alvo claro de abertura; quantidade como texto; pagamento legível sem cápsula/ícone redundante; manter badge para status e marca semântica de tipo quando útil. Preservar as informações e os cartões. Comando: impeccable distill / typeset.

### 3. [P2] Consulta repetida tem pouca aceleração e feedback

Fonte: src/app/pedidos/page.tsx:173, :720 e :850. A página oferece busca/filtros/paginação, mas cabeçalhos estáticos e ausência de indicação de atualização ao trocar filtros deixam o operador sem uma leitura rápida do que mudou.

Correção: sinal discreto “Atualizando consulta”, atalho documentado para focar busca, presets de período como Hoje/Este mês e acesso rápido a pendentes. Ordenação por data/número/total deve ocorrer no servidor sobre toda a consulta, nunca somente nas dez linhas carregadas. Comando: impeccable shape / harden.

### 4. [P2] Exportação destoa da interface e exige rolagem excessiva

Fonte: src/app/pedidos/page.tsx:1254 e :1282; verificação visual do diálogo pelo pai. Cabeçalho roxo em gradiente, seleção de oito colunas em blocos altos e hover que desloca lateralmente os itens contrastam com a consulta plana azul.

Correção: título neutro, checkbox em lista/grid compacta, sem movimento lateral; conservar escopo Página atual/Todos os filtrados, resumo, progresso e bloqueios existentes. Excel/PDF permanecem ações claras. Comando: impeccable layout / polish.

### 5. [P2] Cards precisam explicar alcance e atualização dos números

Fonte: src/app/pedidos/page.tsx:175 e :520; src/components/common/OperationalPage.tsx:25. Repetição de “na consulta” e todos os valores com mesma ênfase deixam pouco contexto sobre filtros e critério financeiro. Loading e indisponibilidade usam o mesmo travessão.

Correção: frase comum “Indicadores dos pedidos filtrados”; rótulos curtos, ajuda que explique o critério real de vendas finalizadas/ENTRADA e a data usada para hoje; skeleton no carregamento e travessão + erro na falha. Manter os quatro cartões compactos e não mudar o cálculo para soma da página. Comando: impeccable clarify / polish.

## Personas, carga cognitiva e jornada

Alex: várias consultas exigem filtros/paginação e inspeção de pagamento truncado; ordenação e atalhos ajudariam.
Sam: botões de abrir têm nomes por pedido e status textual; linha clicável possui alternativa de teclado. Foco completo, leitor de tela e zoom não foram certificados.
Jordan: Novo pedido e busca são claros; S/MOVIMENTO e critérios de “hoje”/vendas podem criar dúvida.

Nove colunas não são automaticamente nove decisões. O excesso é a repetição de cápsulas para dados comuns. Filtros adicionais agrupam cinco campos justificáveis. Detalhe distingue ação principal de secundárias. Exportação concentra escopo, colunas e formato; compactar a seleção reduz procura.

Jornada: consulta estável → detalhe claro → dúvida nos critérios e filtros → ação protegida por confirmação. A prioridade é conservar previsibilidade e confiança.

## Ajustes menores

- “1 item” em vez de “1 itens”.
- Telefones com máscara consistente apenas na apresentação.
- “Forma de pagamento” em vez de “Forma Pgto.”.
- Estado vazio baseado em todos os filtros: busca sem resultado atualmente pode dizer que pedidos aparecerão quando forem criados.
- Confirmação com verbo específico (Finalizar/Cancelar/Excluir) e número, cliente e total visíveis.
- Revisar possível disputa de navegação no detalhe aberto por ?id: Editar chama router.push('/pdv?edit=...') e em seguida o fechamento pode chamar router.push('/pedidos'). Risco identificado em fonte :280, :319, :1084; precisa reprodução antes de concluir falha de runtime.
- O diálogo legado de edição parcial não tem abertura no fluxo atual inspecionado: não promover a crítica desse diálogo a defeito do caminho visível.

## Detector e limites

Detector executado uma vez: 5 avisos, duas regras, todos em src/app/pedidos/page.tsx.
design-system-color:1254, dois hexadecimais = um problema de gradiente roxo.
design-system-font-size:764,1298,1307: tamanhos MUI usuais; provável lacuna na rampa documentada, não prova de ilegibilidade.
OperationalPage.tsx sem achados. Exit code 1 com JSON utilizável.

Desktop publicado inspecionado. Sem mutações, exportação efetiva, testes de falha, mobile/zoom, contraste medido ou certificação a11y. Sem overlay porque evaluate é somente leitura. Nenhum servidor iniciado.

## Perguntas para a próxima etapa

1. Prioridade: confiabilidade/rapidez da consulta ou leitura visual da tabela?
2. Escopo: cinco prioridades e ajustes menores ou apenas as prioridades?
