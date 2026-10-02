disposition: fix

Insumos limitados: não foi fornecido um QUALITY BAR separado; o mundo é o refinamento Operate/MUI existente. Os cinco blocos foram explicitados pelo implementador durante a revisão. Não inspecionei estados de cadastro/erro/conferência sem captura; a revisão funcional usa os trechos de código e os testes relatados, sem navegador. Revisão independente em subagente, usando o contrato de finish-reviewer.md.

## persistence

Pass: PRODUCT.md existe; os três approved-brief.md e surface briefs registram a escolha humana C, buildPath comp e as imagens aprovadas. As três imagens aprovadas e todas as 13 capturas nomeadas no pacote foram abertas com view_image. Capturas legíveis, topo e conteúdo compatíveis, sem regiões vazias/pretas; versões estreitas efetivamente mostram reflow. hero-repro.png existe, com a mesma proporção da composição. O bitmap mede 1528 × 1019, embora o viewport relatado seja 1536 × 1024; PDV/Pedidos móveis medem 382 × 826 versus viewport relatado 390 × 844, e Clientes móveis 390 × 843. Essa pequena reescala não elimina a evidência de composição, mas não permite afirmar correspondência de pixel nas dimensões declaradas. DESIGN.md ausente: documentação posterior à revisão, conforme contrato, não um defeito nesta fase. Seeds de Pedidos 27a43595 e Clientes 3d28cd9f corroboram os surface rolls; não exijo novo roll/aprovação do mundo preservado. Typecheck/build passaram; testes 65/65 e detector [] relatados; lint sem erros e diff --check passaram.

## fidelity

Inventário independente dos comps: PDV possui dois painéis, carrinho maior à esquerda, contexto completo à direita e financeiro/Salvar em rodapé; Pedidos possui tabela sob filtros e janela com título forte, faixa informativa em três grupos, itens, financeiro à direita e ações; Clientes possui tabela e janela cerca de 850 px, nome forte, faixa de contato distribuída, Endereços/Histórico balanceados e rodapé contextual. Todos usam branco/slate frio, azul, sans convencional e geometria discreta, sem materiais pictóricos.

| Elemento | Julgamento | Evidência |
|---|---|---|
| TYPE | adaptation / contradicted | Sans atual e numerais tabulares são adaptação autorizada pelos três briefs, sem troca de fonte obrigatória. Títulos de Pedido/ficha renderizados próximos a 16 px têm peso focal muito inferior aos aproximadamente 24 px dos comps; nome na ficha perde liderança visual. |
| MATERIAL | match | Superfícies de UI reais, MUI e ícones da biblioteca; os comps não prometem fotografia, textura ou recortes. Sem obrigação de produzir assets raster. |
| GROUND | match | Comp PDV amostrado em campo externo: RGB 246,247,249; reprodução: 249,250,252. Ambos near-white frio, consistente com #f8fafc e com a ressalva aprovada de não literalizar tons gerados. |
| Navegação/marca | adaptation | Menu completo, Saídas Financeiras, empresa/configuração e conexão preservados por verdade do produto e briefs; não copiar abreviações/dados da imagem. |
| PDV duas áreas + rodapé | match | Carrinho à esquerda, contexto à direita e total/Salvar persistentes. Empilhamento 1024 e duas etapas móveis autorizados. |
| PDV densidade no viewport do comp | contradicted | Em hero-repro/pdv-desktop o editor de Desconto Geral passa abaixo do rodapé; no comp completo está integralmente visível. Cabeçalho duplicado e espaçamento vertical acumulado afastam o contexto do total. É corrigível por densidade, sem retirar campos. |
| PDV ações/edição | adaptation | Busca vazia desabilita Adicionar, campos de produto selecionado são progressivos; preço/cor/desconto/duplicação preservados por contrato. Mobile edita quantidade/preço/desconto em diálogo. |
| Pedidos tabela/filtros | adaptation | Busca/situação descobertos e filtros adicionais progressivos; colunas reais/paginação prevalecem sobre os exemplos. Ações iconográficas MUI mantêm acessibilidade por aria-label. |
| Pedidos resumo da janela | contradicted | O comp agrupa Cliente/Telefone, Endereço e Atendimento/Pagamento numa faixa baixa. A implementação troca por dois cards altos, começando por Informações do Pedido; altera agrupamento, ordem de leitura e densidade. |
| Pedidos financeiro/janela | contradicted | Total fica no fim de uma faixa cinza de largura integral e com escala quase igual às demais linhas. Comp concentra resumo à direita e faz total forte. Ação Finalizar permanece única principal e status/permissões limitam comandos. |
| Clientes ficha/contexto | match | Contato, todos os endereços, Principal, Histórico e Nova venda estão presentes; captura desktop demonstra 26–28 de 28, não truncamento aos três exemplos. |
| Clientes largura/contacto/geometria | contradicted | maxWidth="lg" produz janela aproximadamente 1200 px, contra cerca de 850 no comp; contato fica comprimido na esquerda, grupos 5/7 e cards com borderRadius:2 equivalem a 24 px no theme de base 12. O comp tem ficha mais concentrada e endereços com geometria discreta. |
| Reflow móvel | adaptation | Brief exige empilhamento e acesso às ações; capturas mostram grupos empilhados e rodapé da ficha. Histórico abaixo da dobra é aceitável por rolagem própria. Não prova todos os estados estreitos. |
| Estado salvo Pendente | match | Captura pdv-salvo-mobile e código confirmam sucesso apenas depois da mutation; rascunho é limpo no caminho de sucesso e pedido pode ser aberto. |

## ceiling

O acabamento permanece no mundo Operate existente; não há dispositivo ornamental ou material físico a acrescentar. O compromisso ainda não foi alcançado na densidade do PDV, escala dos títulos de janela e contenção da ficha de Clientes. THESIS, OWN-WORLD e STORY são preservados; FIRST VIEWPORT falha parcialmente no desconto/contexto do PDV no tamanho do comp; FORM preserva a macrocomposição mas diverge nos agrupamentos internos assinalados. Não há motivo para rebuild do mundo inteiro. A prevenção de descarte, validação de cliente ativo, histórico paginado, snapshot e controles por status/ADMIN estão presentes nos trechos amostrados. O critério monetário de Pedidos diverge do rótulo exibido. Piso: sem kickers/side-stripes/hard shadows no render; toasts de atalhos/busca ainda usam emoji como ícone, em conflito com o sistema MUI prometido.

## material_fixes

1. Fidelidade/FIRST VIEWPORT — src/app/pdv/page.tsx e src/components/common/SaleSection.tsx: compactar cabeçalho duplicado, padding e intervalos dos grupos em desktop para mostrar Cliente/endereço, atendimento/pagamento, observação e editor completo do desconto geral acima do rodapé em 1536 × 1024 com os quatro itens do pacote; manter financeiro/Salvar fixos, campos reais e adaptação rolável em 1366/1024; recapturar hero-repro e pdv-desktop com o estado atual.
2. Fidelidade/TYPE — src/app/pedidos/page.tsx, diálogo de detalhes: título em escala próxima a 24 px, faixa informativa baixa com três grupos na ordem Cliente/Telefone → Endereço histórico → Atendimento/Pagamento, e subtotal/desconto/total concentrados à direita abaixo dos itens com total destacado; preservar data real, observações, desconto por item, estado e ações condicionadas. Verificar na mesma captura pedidos-detalhes-desktop.
3. Fidelidade/TYPE/geometria — src/app/clientes/page.tsx, ficha: limitar largura desktop à faixa 850–900 px, elevar nome à escala de título (~24 px), distribuir telefone/e-mail/CPF em faixa de contato, equilibrar Endereços/Histórico e usar borderRadius:'12px' nos endereços; conservar 25 registros por página, rolagem, informação completa e rodapé. Verificar clientes-ficha-desktop e clientes-ficha-mobile sem overflow lateral ou ações escondidas.
4. Verdade/semântica — src/app/pedidos/page.tsx: substituir “Valor da consulta” por “Vendas finalizadas na consulta” ou “Vendas finalizadas (entrada)” com escopo claro; a RPC em supabase/migrations/202610010001_p0_p1_integridade.sql:299 soma somente FINALIZADO/ENTRADA, não todos os 28 pedidos mostrados. Verificar filtro PENDENTE exibindo zero nesse indicador sem sugerir soma dos totais da lista; manter a RPC.
5. Piso/ícones — src/app/pdv/page.tsx:274,282,311 e src/app/pedidos/page.tsx:159: substituir 🔍/👤/➕ dos toasts por Search/Person/Add de MUI ou omitir o ícone; verificar F2/F3 e atalho de cadastro/busca com o mesmo sistema iconográfico dos controles.

## keep

Preservar identidade azul/MUI, macrocomposições aprovadas, um CTA principal, salvar PENDENTE, rascunho ao cancelar/falhar, permissões, snapshots completos, descontos reais, histórico paginado e adaptações móveis; corrigir os cinco pontos numa única rodada sem repetir aprovação das imagens.
