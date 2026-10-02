'use client';

import NextLink from 'next/link';
import { Box, Typography, Button, Paper, Alert, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer } from '@mui/material';
import { Refresh, PointOfSale, ArrowForward, PeopleOutline, Inventory2Outlined, ReceiptLongOutlined } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import { OperationalHeader, operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import StatusBadge from '@/components/common/StatusBadge';
import { trpc } from '@/lib/trpc/client';
import { formatDateBR } from '@/lib/utils/dateUtils';

const moeda = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const quantidade = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const painel = { ...operationalSurface, p: { xs: 2, sm: 2.5 }, minWidth: 0 };

export default function HomePage() {
  const { data, error, isLoading, isFetching, refetch } = trpc.relatorios.dashboard.useQuery({}, { refetchInterval: 60_000, staleTime: 30_000 });
  const linkVendas = (inicio: string, fim: string) => `/pedidos?filtro_status=FINALIZADO&filtro_tipoAtendimento=ENTRADA&filtro_dataInicio=${inicio}&filtro_dataFim=${fim}`;
  const resumo = [
    { label: 'Vendas hoje', value: data ? moeda(data.vendasHoje) : '—', detail: data ? formatDateBR(data.dataReferencia) : 'Data do pedido', href: data ? linkVendas(data.dataReferencia, data.dataReferencia) : undefined },
    { label: 'Vendas no mês', value: data ? moeda(data.vendasMes) : '—', detail: 'Até hoje · vendas finalizadas', href: data ? linkVendas(data.inicioMes, data.dataReferencia) : undefined },
    { label: 'Pedidos pendentes', value: data ? quantidade(data.pedidosPendentes) : '—', detail: 'Todos os tipos de atendimento', href: '/pedidos?filtro_status=PENDENTE' },
    { label: 'Clientes ativos', value: data ? quantidade(data.totalClientes) : '—', detail: 'Disponíveis para atendimento', href: '/clientes' },
  ];
  const serie = data?.serieSemana.map(d => ({ ...d, label: `${dias[new Date(`${d.data}T12:00:00Z`).getUTCDay()]} ${d.data.slice(8)}` })) ?? [];
  const estado = (vazio: string) => isLoading ? <Stack spacing={1.5} aria-label="Carregando dados"><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></Stack> : <Typography color="text.secondary" sx={{ py: 3 }}>{error ? 'Dados indisponíveis. Use Atualizar para tentar novamente.' : vazio}</Typography>;

  return <AppLayout>
    <OperationalHeader description={data ? `Visão do atendimento · ${formatDateBR(data.dataReferencia)} · horário de Fortaleza` : 'Visão do atendimento'} actions={<>
      <Button variant="outlined" startIcon={<Refresh />} onClick={() => void refetch()} disabled={isFetching}>{isFetching ? 'Atualizando…' : 'Atualizar'}</Button>
      <Button component={NextLink} href="/pdv" variant="contained" startIcon={<PointOfSale />}>Abrir PDV</Button>
    </>} />
    {error && <Alert severity={data ? 'warning' : 'error'} sx={{ mb: 2 }} role="alert">{data ? 'Não foi possível atualizar. Os valores abaixo são da última consulta bem-sucedida.' : 'Não foi possível carregar o dashboard. Tente atualizar.'}</Alert>}
    <Paper component="section" aria-label="Resumo do atendimento" sx={{ ...operationalSurface, mb: 2.5, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>
      {resumo.map(item => <Box key={item.label} sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">{item.label}</Typography>
        {isLoading ? <Skeleton height={42} /> : <Typography sx={{ fontSize: { xs: '1.3rem', sm: '1.75rem' }, fontWeight: 700, fontVariantNumeric: 'tabular-nums', mt: .5, overflowWrap: 'anywhere' }}>{item.value}</Typography>}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .5 }}>{item.detail}</Typography>
        {item.href && <Button component={NextLink} href={item.href} size="small" endIcon={<ArrowForward />} sx={{ mt: 1, ml: -1 }}>Consultar<span className="sr-only"> {item.label.toLowerCase()}</span></Button>}
      </Box>)}
    </Paper>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' }, gap: 2.5 }}>
      <Paper component="section" sx={painel} aria-labelledby="vendas-semana">
        <Typography id="vendas-semana" component="h2" variant="h6">Vendas nos últimos 7 dias</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Vendas finalizadas de entrada, pela data do pedido.</Typography>
        {!data ? estado('Sem dados para exibir.') : serie.every(d => d.vendas === 0) ? estado('Nenhuma venda finalizada neste período.') : <Box sx={{ height: 240, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={serie} accessibilityLayer margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis width={72} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
            <Tooltip formatter={v => [moeda(Number(v)), 'Vendas']} labelFormatter={(_, payload) => payload[0]?.payload?.data ? formatDateBR(payload[0].payload.data) : ''} />
            <Bar dataKey="vendas" fill="#0369a1" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
          </BarChart></ResponsiveContainer>
        </Box>}
        {data && <Box component="details" sx={{ mt: 2, '& summary': { cursor: 'pointer', color: 'primary.main', py: 1 } }}><summary>Ver valores por dia</summary>
          <Table size="small" aria-label="Vendas por dia"><TableBody>{serie.map(d => <TableRow key={d.data}><TableCell component="th" scope="row">{formatDateBR(d.data)}</TableCell><TableCell align="right">{moeda(d.vendas)}</TableCell></TableRow>)}</TableBody></Table>
        </Box>}
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="acoes-dashboard">
        <Typography id="acoes-dashboard" component="h2" variant="h6">Atendimento</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Acesse as ferramentas da operação.</Typography>
        <Stack spacing={1}>{[
          { label: 'Consultar pedidos', detail: 'Conferir, editar e imprimir', href: '/pedidos', icon: <ReceiptLongOutlined /> },
          { label: 'Clientes', detail: 'Consultar e cadastrar clientes', href: '/clientes', icon: <PeopleOutline /> },
          { label: 'Produtos', detail: 'Consultar o catálogo e preços', href: '/produtos', icon: <Inventory2Outlined /> },
        ].map(item => <Button key={item.href} component={NextLink} href={item.href} variant="outlined" startIcon={item.icon} endIcon={<ArrowForward />} sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.5, '& .MuiButton-endIcon': { ml: 'auto' } }}><Box sx={{ px: 1 }}><Typography component="span" display="block" fontWeight={600}>{item.label}</Typography><Typography component="span" variant="caption" color="text.secondary">{item.detail}</Typography></Box></Button>)}</Stack>
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="pedidos-recentes">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1 }}><Typography id="pedidos-recentes" component="h2" variant="h6">Pedidos recentes</Typography><Button component={NextLink} href="/pedidos" size="small">Ver todos</Button></Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Últimos 5 pedidos por data, até hoje · todos os atendimentos.</Typography>
        {!data || !data.ultimosPedidos.length ? estado('Nenhum pedido registrado até hoje.') : <TableContainer><Table size="small" sx={operationalTable} aria-label="Pedidos recentes">
          <TableHead><TableRow><TableCell>Pedido / cliente</TableCell><TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Situação</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
          <TableBody>{data.ultimosPedidos.map(p => <TableRow key={p.id} hover><TableCell>
            <Button component={NextLink} href={`/pedidos?id=${p.id}`} size="small" sx={{ ml: -1 }} aria-label={`Abrir pedido ${p.numero}`}>#{p.numero}</Button>
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{p.cliente_nome || 'Cliente não informado'}</Typography>
            <Typography variant="caption" color="text.secondary">{p.data ? formatDateBR(p.data) : 'Sem data'} · {p.tipo_atendimento_nome}</Typography>
            <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: .5 }}><StatusBadge status={p.status || ''} /></Box>
          </TableCell><TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><StatusBadge status={p.status || ''} /></TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{moeda(Number(p.total ?? 0))}</TableCell></TableRow>)}</TableBody>
        </Table></TableContainer>}
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="produtos-mes">
        <Typography id="produtos-mes" component="h2" variant="h6">Produtos vendidos no mês</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Os 5 produtos com maior quantidade nas vendas finalizadas.</Typography>
        {!data || !data.topProdutos.length ? estado('Nenhum produto vendido neste mês.') : <Stack component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }} spacing={0}>{data.topProdutos.map((p, index) => <Box component="li" key={p.produto_id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.5, borderBottom: index < data.topProdutos.length - 1 ? '1px solid' : undefined, borderColor: 'divider' }}>
          <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>{index + 1}.</Typography><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{p.produto_nome}</Typography>{p.categoria_nome && <Typography variant="caption" color="text.secondary">{p.categoria_nome}</Typography>}</Box><Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{quantidade(p.quantidade_vendida)} {p.unidade}</Typography>
        </Box>)}</Stack>}
      </Paper>
    </Box>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>Atualização automática a cada minuto. Valores de vendas consideram apenas pedidos finalizados do tipo entrada; pedidos futuros ficam fora dos períodos.</Typography>
  </AppLayout>;
}
