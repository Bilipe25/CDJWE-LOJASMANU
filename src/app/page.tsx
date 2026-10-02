'use client';

import { useEffect } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Paper, Alert, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Tooltip as MuiTooltip, IconButton, useTheme } from '@mui/material';
import { Refresh, PointOfSale, ArrowForward, InfoOutlined } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';
import AppLayout from '@/components/layout/AppLayout';
import { OperationalHeader, operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import StatusBadge from '@/components/common/StatusBadge';
import { trpc } from '@/lib/trpc/client';
import { formatDateBR } from '@/lib/utils/dateUtils';
import { formatarTipoAtendimento } from '@/lib/utils/tipo-atendimento';

type PedidoResumo = inferRouterOutputs<AppRouter>['relatorios']['dashboardPedidos']['ultimosPedidos'][number];
type Estado = { isPending: boolean; isFetching: boolean; error: unknown; dataUpdatedAt: number; refetch: () => unknown };
const moeda = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const quantidade = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
const horario = (value: number) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }).format(new Date(value));
const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const painel = { ...operationalSurface, p: { xs: 2, sm: 2.5 }, minWidth: 0 };
const consulta = { refetchInterval: 60_000, staleTime: 30_000, retry: 1 };
const linkVendas = (inicio: string, fim: string) => `/pedidos?filtro_status=FINALIZADO&filtro_tipoAtendimento=ENTRADA&filtro_dataInicio=${inicio}&filtro_dataFim=${fim}`;
const linkPendentes = '/pedidos?filtro_status=PENDENTE&filtro_ordenarPor=data&filtro_direcao=asc';

function EstadoConsulta({ estado, nome }: { estado: Estado; nome: string }) {
  return <Box sx={{ mb: 1.5 }}>
    {!!estado.error && <Alert severity={estado.dataUpdatedAt ? 'warning' : 'error'} action={<Button color="inherit" disabled={estado.isFetching} onClick={() => void estado.refetch()} sx={{ minHeight: 44 }}>Tentar novamente<span className="sr-only">: {nome}</span></Button>}>
      {estado.dataUpdatedAt ? 'Não foi possível atualizar. Os dados anteriores foram mantidos.' : 'Não foi possível carregar esta seção. Tente novamente.'}
    </Alert>}
    {estado.dataUpdatedAt > 0 && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: estado.error ? 1 : 0 }}>Última consulta: {horario(estado.dataUpdatedAt)} · Fortaleza</Typography>}
  </Box>;
}
function Carregando({ nome }: { nome: string }) {
  return <Stack spacing={1} role="status" aria-label={'Carregando ' + nome}><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></Stack>;
}

function TabelaPedidos({ pedidos, fila = false }: { pedidos: PedidoResumo[]; fila?: boolean }) {
  return <TableContainer><Table size="small" sx={operationalTable} aria-label={fila ? 'Pedidos pendentes mais antigos' : 'Pedidos recentes'}>
    <TableHead><TableRow><TableCell>Pedido / cliente</TableCell><TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Situação</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
    <TableBody>{pedidos.map(p => <TableRow key={p.id} hover>
      <TableCell><Button component={NextLink} href={`/pedidos?id=${p.id}`} size="small" sx={{ minHeight: 44, px: 0, py: .5, display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: 1, textAlign: 'left', width: '100%' }} aria-label={`Abrir pedido ${p.numero} de ${p.cliente_nome || 'cliente não informado'}`}>
        <Box component="span" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>#{p.numero}</Box>
        <Box component="span" sx={{ minWidth: 0 }}><Typography component="span" display="block" variant="body2" fontWeight={600} color="text.primary" sx={{ overflowWrap: 'anywhere' }}>{p.cliente_nome || 'Cliente não informado'}</Typography>
          <Typography component="span" display="block" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>{p.data ? formatDateBR(p.data) : 'Sem data'} · {p.tipo_atendimento_nome ? formatarTipoAtendimento(p.tipo_atendimento_nome) : 'Atendimento não informado'}</Typography></Box>
      </Button>
        <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: .5 }}><StatusBadge status={p.status || ''} /></Box>
      </TableCell>
      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><StatusBadge status={p.status || ''} /></TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{moeda(Number(p.total ?? 0))}</TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>;
}

export default function HomePage() {
  const router = useRouter();
  const theme = useTheme();
  const vendas = trpc.relatorios.dashboardVendas.useQuery(undefined, consulta);
  const pendentes = trpc.relatorios.dashboardPendentes.useQuery(undefined, consulta);
  const clientes = trpc.relatorios.dashboardClientes.useQuery(undefined, consulta);
  const recentes = trpc.relatorios.dashboardPedidos.useQuery(undefined, consulta);
  // O ranking entra depois da primeira carga: não atrasa o atendimento no batch inicial.
  const primeiraCargaConcluida = !vendas.isPending && !pendentes.isPending && !clientes.isPending && !recentes.isPending;
  const produtos = trpc.relatorios.dashboardProdutos.useQuery(undefined, { enabled: primeiraCargaConcluida, refetchInterval: 300_000, staleTime: 300_000, retry: 1 });
  const atualizando = [vendas, pendentes, clientes, recentes, produtos].some(q => q.isFetching);
  const atualizar = () => {
    void Promise.all([vendas.refetch(), pendentes.refetch(), clientes.refetch(), recentes.refetch(), ...(primeiraCargaConcluida ? [produtos.refetch()] : [])]);
  };
  useEffect(() => {
    const atalho = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyV' && !event.repeat && !event.defaultPrevented && !document.querySelector('[role="dialog"]')) {
        event.preventDefault(); router.push('/pdv');
      }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, [router]);

  const resumo = [
    { label: 'Vendas hoje', value: vendas.data ? moeda(vendas.data.vendasHoje) : '—', detail: vendas.data ? formatDateBR(vendas.data.dataReferencia) : 'Data do pedido', href: vendas.data ? linkVendas(vendas.data.dataReferencia, vendas.data.dataReferencia) : undefined, action: 'Ver vendas de hoje', estado: vendas, ajuda: 'Total de pedidos finalizados do tipo entrada, pela data do pedido. Não representa recebimentos em caixa.' },
    { label: 'Vendas no mês', value: vendas.data ? moeda(vendas.data.vendasMes) : '—', detail: 'Até hoje · vendas finalizadas', href: vendas.data ? linkVendas(vendas.data.inicioMes, vendas.data.dataReferencia) : undefined, action: 'Ver vendas do mês', estado: vendas, ajuda: 'Pedidos finalizados do tipo entrada, desde o início do mês até hoje, pela data do pedido.' },
    { label: 'Pedidos pendentes', value: pendentes.data ? quantidade(pendentes.data.pedidosPendentes) : '—', detail: 'Todos os atendimentos e períodos', href: linkPendentes, action: 'Ver pendentes', estado: pendentes },
    { label: 'Clientes ativos', value: clientes.data ? quantidade(clientes.data.totalClientes) : '—', detail: 'Disponíveis para atendimento', href: '/clientes', action: 'Ver clientes ativos', estado: clientes },
  ];
  const serie = vendas.data?.serieSemana.map(d => ({ ...d, label: `${dias[new Date(`${d.data}T12:00:00Z`).getUTCDay()]} ${d.data.slice(8)}` })) ?? [];
  const semVendas = !!vendas.data && serie.every(d => d.vendas === 0);
  const totalSemana = serie.reduce((total, dia) => total + Math.round(dia.vendas * 100), 0) / 100;
  const consultasConcluidas = [vendas, pendentes, clientes, recentes, produtos].filter(q => q.dataUpdatedAt > 0).length;
  const consultaComErro = [vendas, pendentes, clientes, recentes, produtos].some(q => q.error);

  return <AppLayout>
    <OperationalHeader description={vendas.data ? `Atendimento e vendas · ${formatDateBR(vendas.data.dataReferencia)} · Fortaleza` : 'Atendimento e vendas · horário de Fortaleza'} actions={<>
      <Button variant="outlined" startIcon={<Refresh />} onClick={atualizar} disabled={atualizando}>{atualizando ? 'Atualizando…' : 'Atualizar'}</Button>
      <MuiTooltip title="Abrir PDV · Alt + Shift + V"><Button component={NextLink} href="/pdv" variant="contained" startIcon={<PointOfSale />} aria-keyshortcuts="Alt+Shift+V">Abrir PDV</Button></MuiTooltip>
    </>} />
    <Box component="span" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {atualizando ? 'Atualizando consultas. As seções disponíveis continuam acessíveis.' : consultaComErro ? 'Algumas consultas falharam. Os dados disponíveis continuam acessíveis; tente novamente na seção com erro.' : consultasConcluidas ? 'Consultas concluídas. Confira o horário em cada seção.' : 'Aguardando as consultas do atendimento.'}
    </Box>
    <Box component="section" aria-label="Resumo do atendimento" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 2.5 }}>
      {resumo.map(item => <Paper key={item.label} sx={{ ...operationalSurface, p: { xs: 1.5, sm: 2 }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: .5, minHeight: 44 }}>
          <Typography variant="body2" color="text.secondary">{item.label}</Typography>
          {item.ajuda && <MuiTooltip title={item.ajuda} arrow><IconButton aria-label={'Sobre ' + item.label} size="small" sx={{ color: 'text.secondary' }}><InfoOutlined fontSize="small" /></IconButton></MuiTooltip>}
        </Box>
        {item.estado.isPending ? <Skeleton height={36} width="75%" /> : <Typography variant="h5" component="div" sx={{ fontSize: { xs: 'h6.fontSize', sm: 'h5.fontSize' }, color: 'primary.dark', fontWeight: 700, lineHeight: 1.4, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{item.value}</Typography>}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .5, flexGrow: 1 }}>{item.detail}</Typography>
        {item.estado.dataUpdatedAt > 0 && <Typography variant="caption" color="text.secondary" display="block">Consulta: {horario(item.estado.dataUpdatedAt)}</Typography>}
        {!!item.estado.error && <Box sx={{ mt: 1 }}><Typography variant="caption" color="error.main" display="block">{item.estado.dataUpdatedAt ? 'Atualização indisponível; valor anterior mantido.' : 'Consulta indisponível.'}</Typography><Button size="small" color="error" disabled={item.estado.isFetching} onClick={() => void item.estado.refetch()} sx={{ minHeight: 44 }}>Tentar novamente<span className="sr-only">: {item.label}</span></Button></Box>}
        {item.href && <Button component={NextLink} href={item.href} size="small" endIcon={<ArrowForward />} sx={{ mt: 1, px: 0, minHeight: 44, alignSelf: 'flex-start', textAlign: 'left', '& .MuiButton-endIcon': { flexShrink: 0 } }}>{item.action}</Button>}
      </Paper>)}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' }, alignItems: 'start', gap: 2.5 }}>
      <Paper component="section" sx={painel} aria-labelledby="pendentes-dashboard" aria-busy={pendentes.isFetching}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: .5 }}>
          <Typography id="pendentes-dashboard" component="h2" variant="h6">Pendentes para retomar</Typography>
          <Button component={NextLink} href={linkPendentes} size="small" sx={{ minHeight: 44 }}>Ver todos os pendentes</Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Até 5 pedidos, do mais antigo ao mais recente pela data do pedido. Todos os atendimentos, sem filtro de período.</Typography>
        <EstadoConsulta estado={pendentes} nome="pedidos pendentes" />
        {pendentes.isPending ? <Carregando nome="pedidos pendentes" /> : pendentes.data && (pendentes.data.pedidos.length ? <TabelaPedidos pedidos={pendentes.data.pedidos} fila /> : <Box sx={{ py: 2 }}><Typography>Nenhum pedido pendente.</Typography><Typography variant="body2" color="text.secondary">Você pode iniciar um atendimento no PDV.</Typography><Button component={NextLink} href="/pdv" sx={{ mt: 1, minHeight: 44 }}>Iniciar atendimento</Button></Box>)}
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="vendas-semana" aria-busy={vendas.isFetching}>
        <Typography id="vendas-semana" component="h2" variant="h6">Vendas nos últimos 7 dias</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 1.5 }}>Pedidos finalizados de entrada, pela data do pedido.</Typography>
        <EstadoConsulta estado={vendas} nome="vendas" />
        {vendas.isPending ? <Carregando nome="vendas" /> : vendas.data && (semVendas ? <Box sx={{ py: 1 }}>
          <Typography variant="body2">Nenhuma venda finalizada neste período.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Pedidos pendentes e orçamentos não entram neste total.</Typography>
        </Box> : <>
          <Typography variant="h5" component="div" sx={{ color: 'primary.dark', fontWeight: 700, fontVariantNumeric: 'tabular-nums', mb: 1 }}>{moeda(totalSemana)}</Typography>
          <Box sx={{ height: 220, width: '100%' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={serie} accessibilityLayer margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
            <XAxis dataKey="label" tick={{ fontSize: theme.typography.caption.fontSize, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
            <YAxis width={64} tick={{ fontSize: theme.typography.caption.fontSize, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} tickFormatter={v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
            <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider, borderRadius: theme.shape.borderRadius, color: theme.palette.text.primary, fontSize: theme.typography.body2.fontSize }} formatter={v => [moeda(Number(v)), 'Vendas']} labelFormatter={(_, payload) => payload[0]?.payload?.data ? formatDateBR(payload[0].payload.data) : ''} />
            <Bar dataKey="vendas" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
          </BarChart></ResponsiveContainer></Box>
        </>)}
        {vendas.data && <Box component="details" sx={{ mt: 1.5, borderTop: '1px solid', borderColor: 'divider', '& summary': { cursor: 'pointer', color: 'primary.main', typography: 'body2', fontWeight: 600, py: 1.5, minHeight: 44 } }}><summary>Ver valores por dia</summary>
          <Table size="small" aria-label="Vendas por dia"><TableBody>{serie.map(d => <TableRow key={d.data}><TableCell component="th" scope="row">{formatDateBR(d.data)}</TableCell><TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{moeda(d.vendas)}</TableCell></TableRow>)}</TableBody></Table>
        </Box>}
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="pedidos-recentes" aria-busy={recentes.isFetching}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: .5 }}><Typography id="pedidos-recentes" component="h2" variant="h6">Pedidos recentes</Typography><Button component={NextLink} href="/pedidos" size="small" sx={{ minHeight: 44 }}>Ver todos os pedidos</Button></Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Últimos 5 por data, até hoje · todos os atendimentos e situações.</Typography>
        <EstadoConsulta estado={recentes} nome="pedidos recentes" />
        {recentes.isPending ? <Carregando nome="pedidos recentes" /> : recentes.data && (recentes.data.ultimosPedidos.length ? <TabelaPedidos pedidos={recentes.data.ultimosPedidos} /> : <Typography color="text.secondary" sx={{ py: 2 }}>Nenhum pedido registrado até hoje. Inicie um atendimento no PDV.</Typography>)}
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="produtos-mes" aria-busy={produtos.isFetching}>
        <Typography id="produtos-mes" component="h2" variant="h6">Produtos vendidos no mês</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 1.5 }}>Os 5 produtos com maior quantidade nas vendas finalizadas de entrada{produtos.data ? ' · ' + new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' }).format(new Date(produtos.data.dataReferencia + 'T12:00:00Z')) : ''}.</Typography>
        <EstadoConsulta estado={produtos} nome="produtos vendidos" />
        {produtos.isPending ? <Carregando nome="produtos vendidos" /> : produtos.data && (produtos.data.topProdutos.length ? <Stack component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }} spacing={0}>{produtos.data.topProdutos.map((p, index) => <Box component="li" key={p.produto_id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.5, borderBottom: index < produtos.data.topProdutos.length - 1 ? '1px solid' : undefined, borderColor: 'divider' }}>
          <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>{index + 1}.</Typography><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{p.produto_nome}</Typography>{p.categoria_nome && <Typography variant="caption" color="text.secondary">{p.categoria_nome}</Typography>}</Box><Typography variant="body2" sx={{ color: 'primary.dark', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{quantidade(p.quantidade_vendida)} {p.unidade}</Typography>
        </Box>)}</Stack> : <Typography color="text.secondary" sx={{ py: 2 }}>Nenhum produto vendido neste mês em pedidos finalizados de entrada.</Typography>)}
      </Paper>
    </Box>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>Indicadores e pedidos atualizam a cada minuto; produtos, a cada 5 minutos. Os horários das consultas usam Fortaleza. Vendas consideram pedidos finalizados de entrada; pedidos futuros ficam fora dos períodos de vendas. Atalho para abrir PDV: Alt + Shift + V.</Typography>
  </AppLayout>;
}
