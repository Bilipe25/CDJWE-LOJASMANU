# Propostas visuais — Pedidos e Clientes

Data: 01/10/2026. Impeccable + Imagegen. Etapa de imagens, sem alterações de código ou dados comerciais. Identidade e componentes ancorados na composição C do PDV já aprovada.

## Escolhas aprovadas

O usuário escolheu **C — Tabela e janela em Pedidos** e **C — Ficha em janela em Clientes** nas páginas de comparação. Respostas coletadas em 01/10/2026, buildPath comp, sem alteração da preferência. As recomendações B abaixo registram a análise antes da escolha; a decisão humana C prevalece.

Composições aprovadas: `.impeccable/mocks/decision/pedidos-c.png` e `.impeccable/mocks/decision/clientes-c.png`, com sidecars `approved: true`. PDV continua com `.impeccable/mocks/decision/pdv-c.png` já aprovado. Não repetir a aprovação dessas composições.

## Pedidos

| Opção | Composição | Uso e limite |
| --- | --- | --- |
| A | Pedidos por situação | Ajuda a enxergar pendências; mostra menos colunas. Não autoriza arrastar para mudar status. |
| B | Lista e pedido aberto | Permite consultar um pedido e trocar para outro mantendo contexto. Lista ocupa menos largura. |
| C | Tabela e janela | Preserva organização familiar; a janela cobre a lista durante a consulta. |

**Recomendação: B**, pela consulta simultânea e proximidade com o PDV aprovado. Busca, filtros e paginação permanecem; as ações dependem do status e do perfil autorizado. Finalizar pedido é a transição existente para FINALIZADO, com confirmação, não a ação de salvar um novo PENDENTE no PDV.

Comparação: http://127.0.0.1:59778/ — chave `b1acc312`. Seed de superfície `27a43595`: estruturas 5, 4, 2. Estruturas consideradas por ressonância: 1 tabela + painel; 2 tabela + diálogo; 3 detalhes expandidos na linha; 4 lista compacta + detalhe amplo; 5 cartões por situação. O script imprimiu resultado válido antes do aviso de encerramento do Node no Windows.

## Clientes

| Opção | Composição | Uso e limite |
| --- | --- | --- |
| A | Detalhes na linha | Ficha expande dentro da tabela; desloca as linhas abaixo. |
| B | Ficha lateral | Contato, endereços e histórico ao lado da lista; reduz a largura da lista. |
| C | Ficha em janela | Mantém tabela ampla; interrompe a leitura da lista até fechar. |

**Recomendação: B**, para reconhecer cliente, consultar endereços e iniciar atendimento sem reconstruir informações. Principal aparece somente no endereço principal. Todos os endereços ativos ficam acessíveis; inativos continuam disponíveis onde necessário, sem entrar na seleção de nova venda.

Comparação: http://127.0.0.1:64300/ — chave `b5dcaac3`. Seed de superfície `3d28cd9f`: estruturas 3, 1, 2. Estruturas consideradas por ressonância: 1 tabela + ficha lateral; 2 tabela + diálogo; 3 expansão na linha; 4 diretório compacto + ficha ampla; 5 busca com ficha dominante e resultados acessíveis. O script imprimiu resultado válido antes do aviso de encerramento do Node no Windows.

## Referências visuais e cuidados de implementação

Imagens finais em `.impeccable/mocks/decision/`: `pedidos-a.png`, `pedidos-b-v2.png`, `pedidos-c.png`, `clientes-a.png`, `clientes-b-v2.png`, `clientes-c.png`. Cada imagem tem prompt incorporado e sidecar; somente as duas C estão aprovadas nesta rodada. As versões B foram refinadas para remover Rascunho local e Atalhos copiados indevidamente da referência do PDV.

- Dados fictícios: oito pedidos, oito clientes e endereços de demonstração. Não são amostras nem alegações sobre a produção. Contadores das imagens não devem virar totais derivados apenas da página carregada.
- No pedido #1048: subtotal R$ 339,30 menos desconto R$ 20,00, total R$ 319,30. No histórico do cliente, compras finalizadas R$ 319,30 correspondem a R$ 249,00 + R$ 70,30; o pedido pendente é separado.
- Nova venda é proposta de navegação contextual para o PDV, com confirmação antes de substituir um rascunho existente. Não selecionar cliente inativo ou endereço inválido.
- Selecionar uma ficha exige botão/link acessível; clicar na linha é atalho adicional. Foco, teclado, feedback, zoom e leitor de tela precisam de validação no código.
- Endereço em Pedidos é o registro histórico do pedido; endereço em Clientes é o cadastro atual. Preservar a distinção na consulta e impressão.
- Busca por telefone em Pedidos é intenção de UX; confirmar contrato de pesquisa do servidor antes de alterar seu placeholder. Não prometer filtro que a consulta não execute.
- Preservar filtro por tipo, pagamento, cliente e datas, indicadores financeiros verdadeiros e exportação. Mais filtros não elimina campos. Indicadores compactos podem ter acesso secundário; não remover informações essenciais por causa da captura.
- As imagens mostram um pedido pendente. Edição/finalização/cancelamento de pedidos encerrados devem seguir as restrições existentes; exclusão continua restrita ao ADMIN.
- Não interpretar ícones ou rótulos gerados como novas capacidades. Atalhos das opções A não especificam teclas e não devem ser inventados. Horário ilustrativo no modal C não substitui a data civil real nem deve aparecer sem dado disponível.
- Os pixels das imagens não certificam contraste. Medir cores e usar tokens acessíveis na tradução para componentes. Não rasterizar controles ou texto do produto.
- A captura de conceito em 1536 × 1024 não prova densidade em notebook. Adaptar navegação recolhível, largura útil, rolagem e ações em 1366 × 768, 1024 × 768 e telas estreitas.
- A ficha mostra dois endereços e três pedidos por fidelidade da demonstração. Listas reais maiores precisam de expansão/paginação; não impor esse limite no produto.

Após aprovar, registrar as duas composições, detalhar os estados de criação/edição e endereços junto ao PDV, e então implementar os componentes e as correções P1/P2 da auditoria. Esta etapa não executou migrações, testes de backend, commit ou publicação.
