const ehEntrada = (valor?: string | null) => valor?.trim().toLocaleUpperCase('pt-BR') === 'ENTRADA';

/** Traduz somente a exibição do tipo; consultas e gravações continuam usando o código original. */
export function formatarTipoAtendimento(nome?: string | null, codigo?: string | null): string {
  if (ehEntrada(nome) || ehEntrada(codigo)) return 'Venda';
  if (nome && codigo) return `${nome} (${codigo})`;
  return nome || '-';
}

/** O PDV mantém o código entre parênteses para deixar explícita a operação selecionada. */
export function formatarTipoAtendimentoPDV(nome?: string | null, codigo?: string | null): string {
  if (ehEntrada(nome) || ehEntrada(codigo)) return 'Venda (ENTRADA)';
  return formatarTipoAtendimento(nome, codigo);
}
