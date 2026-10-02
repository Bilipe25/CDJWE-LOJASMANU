import { z } from 'zod';
import { enderecoSchema } from './endereco';

export const somenteDigitos = (valor: string) => valor.replace(/\D/g, '');
export function cpfValido(valor: string) {
  const cpf = somenteDigitos(valor);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    const soma = Array.from(cpf.slice(0, tamanho)).reduce((total, digito, index) => total + Number(digito) * (tamanho + 1 - index), 0);
    const resto = (soma * 10) % 11;
    if (Number(cpf[tamanho]) !== (resto === 10 ? 0 : resto)) return false;
  }
  return true;
}
export const normalizarTelefone = (valor: string) => {
  const digitos = somenteDigitos(valor);
  return /^55\d{10,11}$/.test(digitos) ? digitos.slice(2) : digitos;
};
const cpfSchema = z.string().trim().transform(v => somenteDigitos(v) || null)
  .refine(v => v === null || cpfValido(v), 'CPF inválido. Confira os 11 dígitos.').nullable().optional();
const telefoneSchema = z.string().trim().transform(v => normalizarTelefone(v) || null)
  .refine(v => v === null || /^\d{10,11}$/.test(v), 'Informe telefone com DDD (10 ou 11 dígitos).').nullable().optional();
const emailSchema = z.string().trim().transform(v => v.toLowerCase() || null)
  .refine(v => v === null || z.string().email().max(255).safeParse(v).success, 'Email inválido.').nullable().optional();
export const enderecoCadastroSchema = enderecoSchema.extend({ id: z.string().uuid().optional(), ativo: z.boolean().default(true) });
export const clienteSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório.').max(200), cpf: cpfSchema,
  telefone: telefoneSchema, email: emailSchema, ativo: z.boolean().default(true),
  endereco: enderecoSchema.nullable().optional(), enderecos: z.array(enderecoCadastroSchema).max(50).optional(),
});
export const clienteUpdateSchema = clienteSchema.partial().extend({ id: z.string().uuid() });
export type ClienteCadastro = z.input<typeof clienteSchema>;
