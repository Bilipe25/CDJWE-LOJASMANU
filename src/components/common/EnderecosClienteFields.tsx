'use client';
import { Alert, Box, Button, Divider, FormControlLabel, Radio, Stack, Typography } from '@mui/material';
import EnderecoFields from './EnderecoFields';
import { enderecoVazio, type EnderecoFormulario } from '@/lib/utils/endereco';
export type EnderecoCadastroFormulario = EnderecoFormulario & { id?: string; principal: boolean; ativo: boolean };
export default function EnderecosClienteFields({ value, onChange }: { value: EnderecoCadastroFormulario[]; onChange: (value: EnderecoCadastroFormulario[]) => void }) {
  const alterar = (indice: number, dados: Partial<EnderecoCadastroFormulario>) => onChange(value.map((e, i) => i === indice ? { ...e, ...dados } : e));
  return <Stack spacing={2}>
    <Alert severity="info">Os endereços dos pedidos já gravados são preservados. Desativar um endereço impede novas seleções, sem apagar o histórico.</Alert>
    {value.map((endereco, indice) => <Box key={endereco.id || `novo-${indice}`}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Typography component="h3" variant="subtitle1">Endereço {indice + 1}{!endereco.ativo ? ' — inativo' : ''}</Typography>
        <FormControlLabel label="Principal" control={<Radio checked={endereco.principal && endereco.ativo} disabled={!endereco.ativo} onChange={() => onChange(value.map((e, i) => ({ ...e, principal: i === indice })))} name="endereco-principal" />} />
      </Stack>
      <EnderecoFields value={endereco} onChange={dados => alterar(indice, dados)} />
      <Button color={endereco.ativo ? 'error' : 'primary'} onClick={() => endereco.id ? alterar(indice, { ativo: !endereco.ativo, principal: false }) : onChange(value.filter((_, i) => i !== indice))}>
        {endereco.id ? endereco.ativo ? 'Desativar este endereço' : 'Reativar este endereço' : 'Remover este endereço'}
      </Button>
      <Divider sx={{ mt: 2 }} />
    </Box>)}
    <Button variant="outlined" disabled={value.length >= 50} onClick={() => onChange([...value, { ...enderecoVazio, principal: !value.some(e => e.ativo && e.principal), ativo: true }])}>Adicionar endereço</Button>
  </Stack>;
}
