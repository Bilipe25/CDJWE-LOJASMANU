export interface CamposEndereco {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export interface EnderecoCliente extends CamposEndereco {
  id: string;
  principal?: boolean | null;
}

export type EnderecoFormulario = Required<{ [K in keyof CamposEndereco]: string }>;

export const enderecoVazio: EnderecoFormulario = {
  logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '',
};

export function formatarEndereco(endereco?: CamposEndereco | null): string {
  if (!endereco) return '';
  const { logradouro, numero, complemento, bairro, cidade, estado, cep } = endereco;
  return [logradouro, numero, complemento, bairro, cidade, estado, cep?.trim() ? `CEP: ${cep.trim()}` : '']
    .map((campo) => campo?.trim())
    .filter(Boolean)
    .join(', ');
}

// undefined escolhe o principal; null preserva um pedido explicitamente sem endereço.
// Um ID inexistente nunca deve ser substituído silenciosamente por outro endereço.
export function selecionarEndereco<T extends EnderecoCliente>(enderecos: T[], id?: string | null): T | null {
  if (id === null) return null;
  if (id !== undefined) return enderecos.find((endereco) => endereco.id === id) ?? null;
  return enderecos.find((endereco) => endereco.principal) ?? enderecos[0] ?? null;
}

export function temDadosEndereco(endereco: CamposEndereco): boolean {
  return Object.values(endereco).some((campo) => Boolean(campo?.trim()));
}
