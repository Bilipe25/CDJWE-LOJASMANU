// Reserve a janela durante o clique, antes de importações, consultas ou carregamento do logo.
export async function comJanelaImpressao(
  acao: 'print' | 'download',
  gerar: (janela?: Window) => Promise<void>,
) {
  let janela: Window | undefined;
  if (acao === 'print') {
    const aberta = window.open('', '_blank');
    if (!aberta) throw new Error('O navegador bloqueou a impressão. Permita pop-ups para este site e tente novamente.');
    janela = aberta;
    janela.opener = null;
    janela.document.title = 'Preparando impressão';
    janela.document.body.textContent = 'Preparando o documento para impressão…';
  }
  try {
    await gerar(janela);
  } catch (erro) {
    janela?.close();
    throw erro;
  }
}
