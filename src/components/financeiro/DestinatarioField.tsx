'use client';
import { useState } from 'react';
import { Autocomplete, TextField, Chip, Box, Button, Alert } from '@mui/material';
import { trpc } from '@/lib/trpc/client';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
export interface Destinatario { id: string; nome: string; ativo?: boolean | null }
export default function DestinatarioField({ selecionado, texto, onChange, onInput, disabled = false, historico = false, criar = true }: {
  selecionado: Destinatario | null; texto: string; onChange: (valor: Destinatario | null, texto: string) => void;
  onInput?: (texto: string) => void; disabled?: boolean; historico?: boolean; criar?: boolean;
}) {
  const [busca, setBusca] = useState(''); const [limite, setLimite] = useState(25);
  const debounced = useDebouncedValue(busca);
  const consulta = trpc.clientes.list.useQuery({ search: debounced || undefined, limit: limite, ativo: historico ? null : true }, { enabled: !disabled });
  const cadastro = trpc.clientes.getById.useQuery({ id: selecionado?.id || '' }, { enabled: !!selecionado?.id && !selecionado.nome });
  const escolhido = selecionado ? { ...selecionado, nome: selecionado.nome || cadastro.data?.nome || 'Carregando destinatário…' } : null;
  return <Box>
    <Autocomplete<Destinatario, false, false, boolean> freeSolo={criar} disabled={disabled}
      options={consulta.data?.clientes ?? []} filterOptions={opcoes => opcoes}
      value={escolhido ?? (criar ? texto : null)} inputValue={criar ? texto : undefined}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={opcao => typeof opcao === 'string' ? opcao : opcao.nome}
      loading={consulta.isFetching} loadingText="Buscando destinatários…" noOptionsText="Nenhum destinatário encontrado"
      onInputChange={(_, valor, motivo) => {
        if (motivo === 'input') { setBusca(valor); setLimite(25); onInput?.(valor); }
        if (motivo === 'clear') { setBusca(''); setLimite(25); onChange(null, ''); }
      }}
      onChange={(_, valor) => onChange(typeof valor === 'string' ? null : valor, typeof valor === 'string' ? valor : valor?.nome ?? '')}
      renderOption={(props, opcao) => { const { key, ...resto } = props; return <li key={key} {...resto}>{opcao.nome}{opcao.ativo === false && <Chip size="small" label="Inativo" sx={{ ml: 1 }} />}</li>; }}
      renderInput={params => <TextField {...params} size="small" label={criar ? 'Fornecedor / destinatário (opcional)' : 'Destinatário'} helperText={criar ? (selecionado ? 'Destinatário selecionado' : 'Selecione um cadastro ou digite um novo nome') : undefined} slotProps={{ htmlInput: { ...params.inputProps, maxLength: 200 } }} />}
    />
    {consulta.isError && <Alert severity="error" sx={{ mt: 1 }} action={<Button color="inherit" onClick={() => void consulta.refetch()}>Tentar novamente</Button>}>Não foi possível buscar os destinatários.</Alert>}
    {consulta.data && consulta.data.total > consulta.data.clientes.length && <Button size="small" disabled={consulta.isFetching || limite >= 1000} onClick={() => setLimite(v => Math.min(v + 25, 1000))}>Carregar mais destinatários ({consulta.data.clientes.length} de {consulta.data.total})</Button>}
  </Box>;
}
