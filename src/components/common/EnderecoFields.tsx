'use client';

import { Grid, TextField } from '@mui/material';
import MaskedInput from './MaskedInput';
import { EnderecoFormulario } from '@/lib/utils/endereco';

interface Props {
  value: EnderecoFormulario;
  onChange: (value: EnderecoFormulario) => void;
}

export default function EnderecoFields({ value, onChange }: Props) {
  const alterar = (campo: keyof EnderecoFormulario, texto: string) => {
    onChange({ ...value, [campo]: campo === 'estado' ? texto.toUpperCase() : texto });
  };
  const faltaLogradouro = !value.logradouro.trim() && Object.values(value).some((campo) => campo.trim());

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField fullWidth label="Logradouro" value={value.logradouro}
          onChange={(event) => alterar('logradouro', event.target.value)} placeholder="Ex: Rua das Flores"
          error={Boolean(faltaLogradouro)} helperText={faltaLogradouro ? 'Informe a rua ou avenida para salvar o endereço.' : undefined} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Número" value={value.numero} inputProps={{ maxLength: 20 }}
          onChange={(event) => alterar('numero', event.target.value)} placeholder="123 ou S/N" />
      </Grid>
      <Grid item xs={12} sm={8}>
        <TextField fullWidth label="Complemento" value={value.complemento} inputProps={{ maxLength: 100 }}
          onChange={(event) => alterar('complemento', event.target.value)} placeholder="Apto, bloco, referência" />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Bairro" value={value.bairro} inputProps={{ maxLength: 100 }}
          onChange={(event) => alterar('bairro', event.target.value)} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <MaskedInput fullWidth maskType="cep" label="CEP" value={value.cep}
          onChange={(texto) => alterar('cep', texto)} placeholder="00000-000" />
      </Grid>
      <Grid item xs={12} sm={8}>
        <TextField fullWidth label="Cidade" value={value.cidade} inputProps={{ maxLength: 100 }}
          onChange={(event) => alterar('cidade', event.target.value)} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Estado (UF)" value={value.estado} inputProps={{ maxLength: 2 }}
          onChange={(event) => alterar('estado', event.target.value)} placeholder="CE" />
      </Grid>
    </Grid>
  );
}
