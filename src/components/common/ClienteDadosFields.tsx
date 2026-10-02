'use client';
import { useId, useState } from 'react';
import { Stack, TextField } from '@mui/material';
import MaskedInput from './MaskedInput';
import { clienteSchema } from '@/lib/schemas/cliente';
export interface DadosClienteFormulario { nome: string; cpf: string; telefone: string; email: string }
export default function ClienteDadosFields({ value, onChange }: { value: DadosClienteFormulario; onChange: (value: DadosClienteFormulario) => void }) {
  const id = useId(); const [tocados, setTocados] = useState<Partial<Record<keyof DadosClienteFormulario, boolean>>>({});
  const validacao = clienteSchema.safeParse(value);
  const erro = (campo: keyof DadosClienteFormulario) => tocados[campo] && !validacao.success ? validacao.error.issues.find(i => i.path[0] === campo)?.message : undefined;
  const campo = (nome: keyof DadosClienteFormulario) => ({ id: `${id}-${nome}`, fullWidth: true, value: value[nome], error: !!erro(nome), helperText: erro(nome), onBlur: () => setTocados(p => ({ ...p, [nome]: true })) });
  return <Stack spacing={2}>
    <TextField {...campo('nome')} label="Nome completo" required autoFocus inputProps={{ maxLength: 200 }} onChange={e => onChange({ ...value, nome: e.target.value })} />
    <MaskedInput {...campo('cpf')} maskType="cpf" label="CPF" inputProps={{ inputMode: 'numeric' }} onChange={cpf => onChange({ ...value, cpf })} />
    <MaskedInput {...campo('telefone')} maskType="phone" label="Telefone com DDD" inputProps={{ inputMode: 'tel' }} onChange={telefone => onChange({ ...value, telefone })} />
    <TextField {...campo('email')} label="Email" type="email" inputProps={{ maxLength: 255 }} onChange={e => onChange({ ...value, email: e.target.value })} />
  </Stack>;
}
