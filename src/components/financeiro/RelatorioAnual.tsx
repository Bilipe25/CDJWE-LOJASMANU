'use client';
import { Box, Card, Typography, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Alert } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { AnualFinanceiro } from '@/server/financeiro';
const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const valor = (v: number) => v === 0 ? '—' : moeda(v);
export default function RelatorioAnual({ dados }: { dados: AnualFinanceiro }) {
  if (!dados.linhas.length) return <Alert severity="info">Não há vendas ou saídas financeiras finalizadas para o ano {dados.ano}.</Alert>;
  return <>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Somente registros finalizados. Vendas e despesas têm linhas separadas; valores negativos do histórico conservam o sinal. Role a tabela para consultar todos os meses.</Typography>
    <TableContainer sx={{ mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Table size="small" aria-label="Relatório mensal por natureza e pagamento" sx={{ '& th, & td': { border: '1px solid #e0e0e0', fontVariantNumeric: 'tabular-nums' }, '& td:not(:first-of-type)': { whiteSpace: 'nowrap' }, '& th:first-of-type, & td:first-of-type': { position: 'sticky', left: 0, minWidth: 180, zIndex: 1 } }}>
        <TableHead><TableRow><TableCell sx={{ bgcolor: '#e0e0e0', fontWeight: 700 }}>TRANSAÇÕES</TableCell>{meses.map(m => <TableCell key={m} align="center" sx={{ bgcolor: '#e0e0e0', fontWeight: 700 }}>{m}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {dados.linhas.map((l, indice) => {
            const despesa = l.natureza === 'Despesa', fundo = despesa ? '#ffebee' : indice % 2 ? '#f9fafb' : '#fff';
            return <TableRow key={JSON.stringify([l.natureza, l.pagamento])} sx={{ bgcolor: fundo }}>
              <TableCell sx={{ bgcolor: fundo, fontWeight: 600, color: despesa ? '#b91c1c' : 'text.primary' }}>{l.natureza} / {l.pagamento}</TableCell>
              {l.valores.map((v, i) => <TableCell key={i} align="right" sx={{ color: despesa ? '#b91c1c' : v ? '#047857' : 'text.secondary', fontWeight: v ? 600 : 400 }}>{valor(v)}</TableCell>)}
            </TableRow>;
          })}
          {([
            { titulo: 'TOTAL VENDAS', campo: 'vendas', fundo: '#e0f2fe', cor: '#075985' },
            { titulo: 'SAÍDAS FINANCEIRAS', campo: 'despesas', fundo: '#ffebee', cor: '#b91c1c' },
            { titulo: 'SALDO', campo: 'saldo', fundo: '#f1f5f9', cor: '#334155' },
          ] as const).map(l => <TableRow key={l.campo} sx={{ bgcolor: l.fundo }}><TableCell sx={{ bgcolor: l.fundo, color: l.cor, fontWeight: 700 }}>{l.titulo}</TableCell>{dados.meses.map(m => <TableCell key={m.mes} align="right" sx={{ color: l.cor, fontWeight: 700 }}>{valor(m[l.campo])}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>
    <Box sx={{ mb: 4, p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc', borderRadius: 2 }}>
      <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mb: 3, color: 'primary.main' }}>TOTAL GERAL DAS TRANSAÇÕES</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
        {dados.linhas.map(l => <Card key={JSON.stringify([l.natureza, l.pagamento])} sx={{ p: 2, minWidth: 0, bgcolor: l.natureza === 'Despesa' ? '#ffebee' : 'white' }}><Typography variant="body2" sx={{ mb: 0.5, color: l.natureza === 'Despesa' ? '#b91c1c' : 'text.secondary' }}>{l.natureza} / {l.pagamento}</Typography><Typography variant="h6" sx={{ fontWeight: 700, overflowWrap: 'anywhere', color: l.natureza === 'Despesa' ? '#b91c1c' : '#047857' }}>{moeda(l.total)}</Typography></Card>)}
        {([{ titulo: 'TOTAL VENDAS', total: dados.vendas, fundo: '#0369a1' }, { titulo: 'SAÍDAS FINANCEIRAS', total: dados.despesas, fundo: '#b91c1c' }, { titulo: 'SALDO DO ANO', total: dados.saldo, fundo: '#334155' }]).map(l => <Card key={l.titulo} sx={{ p: 2, minWidth: 0, bgcolor: l.fundo, color: '#fff' }}><Typography variant="body2" sx={{ mb: 0.5 }}>{l.titulo}</Typography><Typography variant="h6" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{moeda(l.total)}</Typography></Card>)}
      </Box>
    </Box>
    <Card sx={{ p: { xs: 2, sm: 3 } }}><Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3 }}><TrendingUp sx={{ color: 'primary.main', fontSize: 28 }} /><Typography component="h2" variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>TOTAL VENDAS — Evolução Mensal</Typography></Box>
      <Box sx={{ height: { xs: 250, md: 350 }, bgcolor: '#fafafa', borderRadius: 1, p: 1 }} aria-label="Evolução mensal; valores disponíveis na tabela de transações"><ResponsiveContainer><LineChart data={dados.meses.map(m => ({ ...m, nome: meses[m.mes - 1] }))} accessibilityLayer><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="nome" tick={{ fontSize: 11 }} /><YAxis width={65} tick={{ fontSize: 11 }} /><Tooltip formatter={v => moeda(Number(v))} /><Legend /><Line type="monotone" dataKey="vendas" name="Vendas" stroke="#1976d2" strokeWidth={4} dot={{ r: 5 }} isAnimationActive={false} /><Line type="monotone" dataKey="despesas" name="Saídas financeiras" stroke="#b91c1c" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></Box>
    </Card>
  </>;
}
