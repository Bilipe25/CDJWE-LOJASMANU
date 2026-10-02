---
target: critique pdv
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-10-02T13-34-03Z
slug: src-app-pdv-page-tsx
---
Method: dual-agent (A: /root/pdv_critique_design · B: /root/pdv_critique_evidence)

# Crítica do PDV — 02/10/2026

**28/40 — Bom.** O PDV tem uma base operacional coerente. A maior oportunidade está na clareza dos descontos e da conferência, seguida de reduzir o espaço ocupado durante a montagem. A composição de duas áreas e a identidade azul devem ser preservadas. Nenhum P0 foi identificado na amostra; foram priorizados dois P1 e dois P2. Esta etapa não alterou a aplicação.

## Saúde do design

Notas de 0 a 4; todos os dez critérios se aplicam a esta ferramenta operacional.

| # | Heurística | Nota | Evidência principal |
|---|---|---:|---|
| 1 | Visibilidade do estado | 3 | Rascunho, conexão e total visíveis; desconto digitado pode diferir do aplicado. |
| 2 | Linguagem do trabalho real | 3 | Campos familiares; ajuda chama conferência de finalização, embora salvar gere Pendente. |
| 3 | Controle e liberdade | 3 | Cancelamento e descarte protegido; exclusão individual sem desfazer. |
| 4 | Consistência | 3 | Duas áreas coerentes; desconto desaparece em larguras maiores. |
| 5 | Prevenção de erros | 3 | Busca e inclusão protegidas; validação móvel não leva ao campo ausente. |
| 6 | Reconhecimento | 3 | Busca e atalhos descobríveis; seções móveis fechadas não resumem seleções. |
| 7 | Eficiência | 3 | Enter e F2/F3 ajudam; Ctrl+P conflita com impressão do navegador. |
| 8 | Estética e minimalismo | 3 | Hierarquia limpa; prévia azul grande compete com o total do pedido. |
| 9 | Recuperação de erros | 2 | Retry disponível; erros obrigatórios dependem de toast sem foco no campo. |
| 10 | Ajuda e documentação | 2 | Ajuda de atalhos existe, mas diverge dos atalhos e do fluxo atual. |
| | **Total** | **28/40** | **Bom: base sólida com pontos fracos a corrigir.** |

## Especificidade e impressão geral

A estrutura é apropriada para atendimento: produtos e carrinho à esquerda, cliente e pagamento à direita, financeiro persistente. A linguagem MUI é convencional, mas a organização atende ao trabalho da loja. Ganhar personalidade aqui significa melhorar densidade, leitura dos valores e clareza das ações.

O detector retornou **sete avisos**, todos da regra `design-system-font-size`, em `src/app/pdv/page.tsx`: linha1017 (`0.7rem`) e linhas1768,1785,1802,1823,1840,1857 (`0.9rem`). O processo terminou com código1, mas produziu JSON utilizável. Os seis avisos de atalhos representam uma decisão repetida de componente, não seis defeitos independentes. A divergência com DESIGN.md é real; o detector não comprova ilegibilidade nem falta de identidade. O chip de cor pequeno merece inspeção específica. Não houve overlay, pois o navegador só permite avaliação DOM de leitura.

## O que funciona

- O total e as ações permanecem acessíveis no computador e no celular.
- Busca progressiva, estado vazio e Enter ajudam a começar e adicionar itens rapidamente.
- A conferência e o sucesso previstos no código distinguem pedido Pendente de venda finalizada. Essa regra deve ser mantida.

## Problemas prioritários

### 1. [P1] Desconto por item desaparece no desktop amplo

**Evidência observada pelas duas avaliações:** com quantidade1, preço R$89,90 e desconto R$10,00, a linha mostra total R$79,90. Em1366px há legenda de desconto; em1536px ela desaparece. A coluna própria também está escondida. O administrador precisa calcular a diferença ou editar o item para entender o valor. A conferência também não discrimina esse desconto, conforme revisão do código.

**Correção:** mostrar desconto por linha em todas as larguras e na conferência, por legenda compacta ou coluna. Preservar o total líquido e a distinção entre desconto do item e geral.

**Fonte:** `src/app/pdv/page.tsx`, linhas989,1007,1069 e1483. **Evidências:** `docs/critique-pdv-2026-10-02/assessment-a/desktop-cart.jpg` e `desktop-xl-discount.jpg`. **Comando:** `$impeccable clarify`, seguido de `$impeccable polish`.

### 2. [P1] Validação móvel pode apontar para uma etapa invisível

**Evidência de código:** Salvar pedido aparece na etapa Itens. Quando falta atendimento ou pagamento, a validação mostra toast e expande a seção, mas não troca para Cliente e pagamento nem foca o campo. A pessoa permanece sem enxergar o requisito. As capturas confirmam a separação de etapas; o clique de validação não foi exercitado.

**Correção:** abrir a etapa correta, expandir a seção, focar o primeiro campo inválido e apresentar erro junto dele.

**Fonte:** `src/app/pdv/page.tsx`, linhas410,1139 e1381. **Evidências:** `mobile-items.jpg` e `mobile-context.jpg`. **Comando:** `$impeccable harden`.

### 3. [P2] Desconto geral não distingue intenção de valor aplicado

**Evidência de código e apresentação:** campo digitado e desconto aplicado são estados separados. O botão OK aplica; salvar usa o valor aplicado anteriormente. Não há indicação clara de alteração pendente. Trocar R$ por % mantém o número sem esclarecer a mudança de significado. A divergência de valores não foi exercitada no navegador.

**Correção:** definir aplicação explícita ou atualização automática. Na opção explícita, usar Aplicar desconto, indicar alteração não aplicada e resolver esse estado antes da conferência. Tratar claramente a troca entre R$ e %.

**Fonte:** `src/app/pdv/page.tsx`, linhas379,1333 e1377. **Comandos:** `$impeccable clarify` e `$impeccable harden`.

### 4. [P2] Prévia do produto ocupa espaço demais na montagem

**Evidência visual:** em1366×768, os campos e o bloco azul de prévia empurram o carrinho para baixo. A prévia repete nome e valores e ganha peso semelhante ao financeiro. O operador precisa distinguir total do produto ainda não adicionado e total efetivo do pedido.

**Correção:** compactar a prévia em uma linha junto à edição; manter quantidade, preço, desconto e cor disponíveis. Dar maior destaque ao total do pedido e à ação principal.

**Fonte:** `src/app/pdv/page.tsx`, linhas795 e900. **Evidência:** `desktop-selected.jpg`. **Comandos:** `$impeccable distill` e `$impeccable layout`.

## Carga cognitiva e jornada

**Moderada: três falhas entre oito critérios.** Agrupamento, hierarquia geral, uma decisão por vez, blocos de campos e revelação progressiva funcionam. O foco se divide entre prévia e financeiro; a edição oferece cinco decisões simultâneas, além dos oito destinos de navegação; no celular é preciso lembrar o conteúdo de seções fechadas. Isso justifica melhorar a apresentação, sem remover recursos necessários.

O vazio orienta bem; selecionar produto transmite segurança; adicionar confirma progresso. A confiança cai quando a diferença de preço não é explicada ou a validação aponta para contexto oculto. O sucesso foi avaliado apenas pelo código.

## Impacto por perfil

- **Operador experiente:** atalhos aceleram, mas desconto oculto obriga cálculo/edição; Ctrl+P interfere com o comando usual de imprimir.
- **Operador novo:** ajuda que fala em finalização pode confundir o significado de Salvar pedido. Explicar criação de Pendente e etapa posterior em Pedidos reduz dúvida.
- **Administrador:** precisa discriminar desconto de item e geral para conferir valores e margens.
- **Atendimento no celular:** seções fechadas sem resumo e validação sem mudança de etapa aumentam esforço de memória.

## Ajustes menores

- Alinhar ajuda e mensagens de F10/F12; substituir finalização por conferência quando apropriado.
- Rever Ctrl+P para cadastro de produto.
- Oferecer desfazer na remoção de item.
- Resumir cliente, atendimento e pagamento nas seções móveis fechadas.
- Trocar Tipo por Desconto em no editor.
- Normalizar/documentar tamanhos de fonte; verificar chip de cor em contexto real.
- Rever o momento do convite de instalação PWA, observado sobre a área de trabalho.

## Evidência e limites

A inspecionou desktop1366×768, desktop1536×1024 e celular390×844, incluindo vazio, seleção e carrinho. B inspecionou desktop1536×730: sem overflow horizontal do documento nessa amostra, foco visível e controles nomeados na árvore de acessibilidade. B encontrou três avisos MUI de valor de select fora das opções durante carregamento da fixture; isso não confirma falha em produção. A salvou seis capturas; B não salvou captura em arquivo.

Dados locais sintéticos, um item; não houve gravação de pedido, teste de produção, leitor de tela, medição de contraste, zoom ou teste de carrinho extenso. As duas avaliações foram independentes; o detector só entrou na síntese após A concluir. B enfrentou timeouts iniciais, mas abriu e fechou uma aba própria na última tentativa. A restaurou o viewport e fechou sua aba. Sem injeção mutável, foi usado código, CLI, capturas, DOM e árvore de acessibilidade; nenhuma sobreposição visual foi criada.

A revisão automática bloqueou o clique em Salvar pedido por possível persistência, pois a autorização desta etapa é apenas crítica. Não houve nova tentativa; conferência e sucesso ficaram limitados à leitura do código.

## Perguntas para a próxima etapa

1. Para o desconto geral, prefere **Aplicar desconto explicitamente** ou **atualizar o total automaticamente ao editar um valor válido**?
2. Quer trabalhar **nas quatro prioridades** ou **nas quatro prioridades e nos ajustes menores**?
