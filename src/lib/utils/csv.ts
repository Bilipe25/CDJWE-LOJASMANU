export function serializarCSV(linhas: (string | number | null | undefined)[][]) {
  return '\ufeff' + linhas.map(linha => linha.map(valor => {
    let texto = typeof valor === 'number' ? valor.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 20 }) : String(valor ?? '');
    // Texto livre nunca deve virar fórmula ao abrir em uma planilha.
    if (typeof valor === 'string' && /^[\s]*[=+@-]/.test(texto)) texto = "'" + texto;
    return '"' + texto.replace(/"/g, '""') + '"';
  }).join(';')).join('\r\n');
}
export function baixarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = nome;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
