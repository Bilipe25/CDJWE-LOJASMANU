import { z } from 'zod';

// Contrato único para criação e edição, inclusive o cadastro rápido do PDV.
export const enderecoSchema = z.object({
  logradouro: z.string().trim().min(1, 'Informe o logradouro do endereço'),
  numero: z.string().trim().max(20).optional(),
  complemento: z.string().trim().max(100).optional(),
  bairro: z.string().trim().max(100).optional(),
  cidade: z.string().trim().max(100).optional(),
  estado: z.string().trim().max(2).transform((value) => value.toUpperCase()).optional(),
  cep: z.string().trim().max(20).optional(),
  principal: z.boolean().default(true),
});

export type EnderecoInput = z.input<typeof enderecoSchema>;
