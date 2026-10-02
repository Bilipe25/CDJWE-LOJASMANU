'use client';
import { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, FormControlLabel, Radio, Stack, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import EnderecoFields from './EnderecoFields';
import { enderecoVazio, formatarEndereco, type EnderecoFormulario } from '@/lib/utils/endereco';
export type EnderecoCadastroFormulario = EnderecoFormulario & { id?: string; principal: boolean; ativo: boolean };
export default function EnderecosClienteFields({ value, onChange }: { value: EnderecoCadastroFormulario[]; onChange: (value: EnderecoCadastroFormulario[]) => void }) {
  const [expandido, setExpandido] = useState<number | false>(0);
  const alterar = (indice: number, dados: Partial<EnderecoCadastroFormulario>) => onChange(value.map((e, i) => i === indice ? { ...e, ...dados } : e));
  return <Stack spacing={2}>
    <Alert severity="info">Os endereços dos pedidos já gravados são preservados. Desativar um endereço impede novas seleções, sem apagar o histórico.</Alert>
    {value.map((endereco, indice) => <Accordion key={endereco.id || `novo-${indice}`} expanded={expandido === indice} onChange={(_, aberto) => setExpandido(aberto ? indice : false)} disableGutters sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ minWidth: 0 }}><Typography variant="subtitle2">Endereço {indice + 1} {endereco.principal && endereco.ativo && <Chip label="Principal" size="small" variant="outlined" color="primary" />}{!endereco.ativo && ' — inativo'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{formatarEndereco(endereco) || 'Preencha os dados do endereço'}</Typography></Box>
      </AccordionSummary>
      <AccordionDetails>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Typography component="h3" variant="subtitle1">Endereço {indice + 1}{!endereco.ativo ? ' — inativo' : ''}</Typography>
        <FormControlLabel label="Principal" control={<Radio checked={endereco.principal && endereco.ativo} disabled={!endereco.ativo} onChange={() => onChange(value.map((e, i) => ({ ...e, principal: i === indice })))} name="endereco-principal" />} />
      </Stack>
      <EnderecoFields value={endereco} onChange={dados => alterar(indice, dados)} />
      <Button color={endereco.ativo ? 'error' : 'primary'} onClick={() => endereco.id ? alterar(indice, { ativo: !endereco.ativo, principal: false }) : onChange(value.filter((_, i) => i !== indice))}>
        {endereco.id ? endereco.ativo ? 'Desativar este endereço' : 'Reativar este endereço' : 'Remover este endereço'}
      </Button>
      </AccordionDetails>
    </Accordion>)}
    <Button variant="outlined" disabled={value.length >= 50} onClick={() => { setExpandido(value.length); onChange([...value, { ...enderecoVazio, principal: !value.some(e => e.ativo && e.principal), ativo: true }]); }}>Adicionar endereço</Button>
  </Stack>;
}
