# Propostas de composição do PDV

Etapa de imagens antes da implementação. Identidade azul/MUI preservada; uso principal no computador. Imagens com dados fictícios. **Proposta C — Duas áreas aprovada pelo usuário na página de comparação em 01/10/2026.**

## Estruturas consideradas

1. Bancada compacta: busca e edição de item acima do carrinho, contexto lateral e rodapé financeiro.
2. Carrinho de largura variável com inspector de item: favorece pedidos com vários itens e edição detalhada.
3. Atendimento guiado: cliente, itens e conferência em sequência, resumo persistente.
4. Duas áreas simultâneas: carrinho à esquerda, dados da venda à direita, financeiro persistente.
5. Três regiões: busca/resultados, carrinho e contexto; risco de pouca largura no notebook.
6. Venda orientada à entrada por código: linha de comando visível e carrinho abaixo; exige validar hábitos reais do operador.
7. Carrinho amplo: contexto numa faixa superior e itens dominando a tela, resumo persistente no rodapé.

Seed de superfície `27a14e7e`, modo Operate: propostas 7, 3, 4, nessa ordem. Identidade já estabelecida; não é escolha de marca. Consulta de seed retornou índices válidos, embora o processo Node no Windows tenha encerrado com erro após imprimir o resultado.

## Comparação oferecida

| Proposta | Prioridade | Risco |
| --- | --- | --- |
| A — Carrinho amplo | Máximo espaço para conferir itens | Dados extensos do cliente precisam de expansão |
| B — Atendimento guiado | Sequência explícita para quem precisa de orientação | Mais navegação para operadores experientes |
| C — Duas áreas | Montagem e dados da venda acessíveis juntos | Exige adaptação à largura útil do notebook |

A recomendação inicial é C pela proximidade com a organização existente e o acesso simultâneo a itens, cliente e pagamento. A escolha cabe ao usuário após ver as três imagens.

Os textos Salvar pedido e Pendente comunicam a regra atual. Uma futura transição direta para FINALIZADO não está incluída nesta aprovação visual. Demonstração: quatro linhas e sete unidades, subtotal R$ 339,30, desconto geral R$ 20,00, total R$ 319,30.

Após a escolha, registrar a composição aprovada e preparar seus estados vazio, preenchido e conferência, além das propostas de Pedidos e Clientes dentro da mesma linguagem. Aprovação da imagem não certifica teclado, cálculos, falhas ou responsividade da implementação.

## Cuidados ao traduzir as imagens para código

- Preservar todas as rotas e permissões existentes, inclusive Saídas Financeiras, abreviada na navegação das imagens.
- Manter preço, desconto de item, cor, desconto percentual/valor e duplicação disponíveis mesmo quando não aparecem expandidos na imagem.
- Adicionar continua desabilitado até existir produto válido; o estado preenchido do carrinho não valida automaticamente a busca vazia.
- Não tornar cliente obrigatório onde a regra permite pedido sem cliente. Na proposta guiada, permitir seguir sem cliente quando autorizado pelo contrato.
- Validar contraste de cores e foco na implementação; pixels gerados não são tokens medidos nem provas de conformidade.
- Adaptar densidade e navegação à largura útil de notebook; estas imagens são conceitos em 1536 × 1024, não prova funcional em 1366 × 768.
- Na proposta B refinada existe uma única ação para avançar. Observações, pagamento e desconto podem ser ajustados na conferência.

Comparação local encerrada após escolha humana — chave `534a1c63`. Resposta coletada: `optionId: duas-areas`, `buildPath: comp`, `buildPathFlipped: false`. A imagem aprovada é `.impeccable/mocks/decision/pdv-c.png`, com sidecar `approved: true`. As outras opções permanecem não aprovadas.

![Composição C aprovada](C:/projetos/lojasmanu/CDJWE-LOJASMANU/.impeccable/mocks/decision/pdv-c.png)

Esta aprovação fixa a composição do PDV e permite detalhá-la. A entrega atual continua sendo visual: não houve alteração de componentes de produção, execução de migrações, commit ou publicação.
