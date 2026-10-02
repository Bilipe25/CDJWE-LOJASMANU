# Correção do bloqueio de pop-up na impressão

02/10/2026. Esta correção substitui a reserva de nova janela descrita no relatório anterior.

O navegador ainda podia bloquear `window.open`, mesmo chamado durante o clique. O fluxo agora gera o PDF como Blob, carrega em um iframe temporário da própria página e chama a impressão do documento carregado. Não usa `window.open` nem `pdfMake.print`, que internamente depende de uma nova janela.

Aplicado a rascunhos/prévias do PDV e aos pedidos salvos. Download de PDF mantém seu fluxo independente. Carregamento tem limite de 30 segundos; erro orienta baixar o arquivo e imprimir no leitor. Frame e URL são liberados ao encerrar a impressão, sair da página ou iniciar outra impressão. Uma impressão substituída durante o carregamento é cancelada sem deixar a operação pendente.

Validação: 91 testes aprovados, incluindo chamada de impressão apenas após carregar, `window.open` proibido, falha do leitor, erro de carregamento, saída da página, substituição de impressão pendente, bytes reais do rascunho e download separado. Checagem de tipos aprovada. Chrome local carregou o PDF Blob no iframe da mesma aba, sem erro de console ou nova aba. O diálogo nativo e a impressão física não foram verificados pela automação.

A [documentação de impressão do MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) descreve impressão por iframe sem abrir outra página; a [referência de Window.print](https://developer.mozilla.org/en-US/docs/Web/API/Window/print) descreve o acionamento do diálogo nativo. A disponibilidade do leitor PDF embutido depende do navegador; Baixar PDF permanece a alternativa.

Alterações locais, ainda sem commit, push ou publicação.

Verificação final: build de produção aprovado; lint sem erros, com os 175 avisos anteriores do projeto.
