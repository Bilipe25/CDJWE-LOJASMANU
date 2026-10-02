let limparAnterior: (() => void) | undefined;

// Print the PDF in the current document. No window.open or popup permission is needed.
export function imprimirPDFNaPagina(pdf: Blob): Promise<void> {
  limparAnterior?.();
  const url = URL.createObjectURL(pdf);
  const frame = document.createElement('iframe');
  frame.title = 'Impressão do pedido';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, { position: 'fixed', bottom: '0', left: '0', width: '1px', height: '1px', border: '0', opacity: '0', pointerEvents: 'none' });
  return new Promise<void>((resolve, reject) => {
    let concluido = false;
    let removido = false;
    let alvo: Window | null = null;
    const limpar = () => {
      if (removido) return;
      removido = true;
      clearTimeout(timeout);
      alvo?.removeEventListener('afterprint', limpar);
      window.removeEventListener('pagehide', cancelar);
      frame.remove();
      URL.revokeObjectURL(url);
      if (limparAnterior === cancelar) limparAnterior = undefined;
    };
    const falhar = () => {
      if (concluido) return;
      concluido = true;
      limpar();
      reject(new Error('Não foi possível abrir a impressão. Baixe o PDF e imprima pelo leitor do navegador.'));
    };
    const timeout = setTimeout(falhar, 30_000);
    const cancelar = () => {
      if (!concluido) {
        concluido = true;
        reject(new Error('A preparação da impressão foi interrompida. Tente novamente.'));
      }
      limpar();
    };
    limparAnterior = cancelar;
    window.addEventListener('pagehide', cancelar, { once: true });
    frame.onerror = falhar;
    frame.onload = () => {
      if (concluido) return;
      alvo = frame.contentWindow;
      if (!alvo) return falhar();
      try {
        clearTimeout(timeout);
        alvo.addEventListener('afterprint', limpar, { once: true });
        alvo.focus();
        alvo.print();
        concluido = true;
        resolve();
      } catch { falhar(); }
    };
    frame.src = url;
    try { document.body.appendChild(frame); } catch { falhar(); }
  });
}
