'use client';
import { Box, TextField, MenuItem, Alert } from '@mui/material';
import DestinatarioField from './DestinatarioField';
import type { FormularioSaida } from '@/lib/utils/operacao-saida';
export default function SaidaForm({ valor, onChange, pagamentos, disabled, erro }: {
  valor: FormularioSaida; onChange: (valor: FormularioSaida) => void;
  pagamentos: { id: string; nome: string }[]; disabled: boolean; erro: string;
}) {
  return <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
    {erro && <Alert severity="error" role="alert">{erro}</Alert>}
    <DestinatarioField selecionado={valor.cliente_id ? { id: valor.cliente_id, nome: valor.destinatario_nome } : null} texto={valor.destinatario_nome}
      disabled={disabled} onChange={(p, nome) => onChange({ ...valor, cliente_id: p?.id || '', destinatario_nome: nome })}
      onInput={nome => onChange({ ...valor, cliente_id: '', destinatario_nome: nome })} />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <TextField label="Valor da despesa" type="number" size="small" required disabled={disabled} value={valor.valor || ''}
        onChange={e => onChange({ ...valor, valor: Number(e.target.value) })} slotProps={{ htmlInput: { min: 0.01, max: 99999999.99, step: 0.01 } }} />
      <TextField label="Data" type="date" size="small" required disabled={disabled} value={valor.data}
        onChange={e => onChange({ ...valor, data: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField select label="Forma de pagamento" size="small" disabled={disabled} value={valor.forma_pagamento_id}
        onChange={e => onChange({ ...valor, forma_pagamento_id: e.target.value })}>
        <MenuItem value="">Não informada</MenuItem>{pagamentos.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
      </TextField>
      <TextField select label="Situação do registro" size="small" disabled={disabled} value={valor.status}
        onChange={e => onChange({ ...valor, status: e.target.value as FormularioSaida['status'] })} helperText="Finalize ou cancele pelas ações da consulta.">
        <MenuItem value="PENDENTE">Pendente</MenuItem><MenuItem value="CONFIRMADO">Confirmado</MenuItem>
      </TextField>
    </Box>
    <TextField label="Descrição / observação" multiline minRows={3} disabled={disabled} value={valor.observacao}
      onChange={e => onChange({ ...valor, observacao: e.target.value })} slotProps={{ htmlInput: { maxLength: 5000 } }} />
  </Box>;
}
