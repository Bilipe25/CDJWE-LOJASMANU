'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Paper, Alert, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Tooltip as MuiTooltip, IconButton, FormControl, Select, MenuItem, useTheme } from '@mui/material';
import { Refresh, PointOfSale, ArrowForward, InfoOutlined, PaymentsOutlined, ReceiptLongOutlined, LocalOfferOutlined, AccessTime, ArrowUpward, ArrowDownward, Remove, ChairOutlined, BedOutlined, DoorSlidingOutlined, TableRestaurantOutlined, TvOutlined, Inventory2Outlined } from '@mui/icons-material';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';
import type { PeriodoDashboard } from '@/lib/schemas/dashboard';
import AppLayout from '@/components/layout/AppLayout';
import { operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import StatusBadge from '@/components/common/StatusBadge';
import { trpc } from '@/lib/trpc/client';
import { formatDateBR } from '@/lib/utils/dateUtils';
import { formatarTipoAtendimento } from '@/lib/utils/tipo-atendimento';

type PedidoResumo = inferRouterOutputs<AppRouter>['relatorios']['dashboardPedidos']['ultimosPedidos'][number];
type Desempenho = inferRouterOutputs<AppRouter>['relatorios']['dashboardDesempenho'];
type Estado = { isPending: boolean; isFetching: boolean; error: unknown; dataUpdatedAt: number; refetch: () => unknown };
const moeda = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const quantidade = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
const percentual = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Math.abs(value)) + '%';
const horario = (value: number) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }).format(new Date(value));
const intervalo = (value: { dataInicio: string; dataFim: string }) => formatDateBR(value.dataInicio) + '–' + formatDateBR(value.dataFim);
const painel = { ...operationalSurface, p: 2, minWidth: 0 };
const consulta = { refetchInterval: 60_000, staleTime: 30_000, retry: 1 };
const linkVendas = (inicio: string, fim: string) => '/pedidos?filtro_status=FINALIZADO&filtro_tipoAtendimento=ENTRADA&filtro_dataInicio=' + inicio + '&filtro_dataFim=' + fim;
const linkPendentes = '/pedidos?filtro_status=PENDENTE&filtro_ordenarPor=data&filtro_direcao=asc';
const ajudaVendas = 'Pedidos finalizados do tipo Venda, pela data do pedido, no calendário de Fortaleza. O total já inclui descontos. Não representa recebimentos em caixa ou lucro.';

function EstadoConsulta({ estado, nome }: { estado: Estado; nome: string }) {
  if (!estado.error) return null;
  return <Alert sx={{ mb: 2 }} severity={estado.dataUpdatedAt ? 'warning' : 'error'} action={<Button color="inherit" disabled={estado.isFetching} onClick={() => void estado.refetch()} sx={{ minHeight: 44 }}>Tentar novamente<span className="sr-only">: {nome}</span></Button>}>
    {estado.dataUpdatedAt ? 'Atualização indisponível. Dados da consulta de ' + horario(estado.dataUpdatedAt) + ' mantidos.' : 'Não foi possível carregar ' + nome + '.'}
  </Alert>;
}
function Ajuda({ texto, nome }: { texto: string; nome: string }) {
  return <MuiTooltip title={texto} arrow><IconButton aria-label={'Sobre ' + nome} size="small" sx={{ color: 'text.secondary', minWidth: 44, minHeight: 44 }}><InfoOutlined fontSize="small" /></IconButton></MuiTooltip>;
}
function Carregando({ nome }: { nome: string }) {
  return <Stack spacing={1} role="status" aria-label={'Carregando ' + nome}><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></Stack>;
}
function Variacao({ valor, anterior }: { valor: number | null; anterior: string }) {
  if (valor === null) return <Typography variant="caption" color="text.secondary">Sem base comparável</Typography>;
  const Icone = valor > 0 ? ArrowUpward : valor < 0 ? ArrowDownward : Remove;
  return <MuiTooltip title={'Valor anterior: ' + anterior} arrow><Box tabIndex={0} sx={{ display: 'flex', alignItems: 'center', gap: .5, flexWrap: 'wrap', color: valor > 0 ? 'success.main' : valor < 0 ? 'error.main' : 'text.secondary', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2, borderRadius: .5 } }}>
    <Icone sx={{ fontSize: 16 }} aria-hidden="true" /><Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}><span className="sr-only">{valor > 0 ? 'Aumento de ' : valor < 0 ? 'Queda de ' : 'Variação de '}</span>{percentual(valor)}</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', xl: 'inline' } }}>vs. anterior</Typography>
  </Box></MuiTooltip>;
}
function TabelaPedidos({ pedidos }: { pedidos: PedidoResumo[] }) {
  return <TableContainer><Table size="small" sx={{ ...operationalTable, '& td, & th': { px: { xs: 1, sm: 1.5 }, py: { xs: 1, sm: .25 } } }} aria-label="Pedidos recentes">
    <TableHead><TableRow><TableCell>Pedido / cliente</TableCell><TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Situação</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
    <TableBody>{pedidos.map(p => <TableRow key={p.id} hover>
      <TableCell><Button component={NextLink} href={'/pedidos?id=' + p.id} size="small" sx={{ minHeight: { xs: 44, sm: 40 }, px: 0, py: { xs: .5, sm: 0 }, display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: 1, textAlign: 'left', width: '100%' }} aria-label={'Abrir pedido ' + p.numero + ' de ' + (p.cliente_nome || 'cliente não informado')}>
        <Box component="span" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>#{p.numero}</Box>
        <Box component="span" sx={{ minWidth: 0 }}><Typography component="span" display="block" variant="body2" fontWeight={600} color="text.primary" sx={{ overflowWrap: 'anywhere' }}>{p.cliente_nome || 'Cliente não informado'}</Typography>
          <Typography component="span" display="block" variant="caption" color="text.secondary" fontWeight={400}>{p.data ? formatDateBR(p.data) : 'Sem data'} · {p.tipo_atendimento_nome ? formatarTipoAtendimento(p.tipo_atendimento_nome) : 'Atendimento não informado'}</Typography></Box>
      </Button><Box sx={{ display: { xs: 'block', sm: 'none' }, mt: .5 }}><StatusBadge status={p.status || ''} /></Box></TableCell>
      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><StatusBadge status={p.status || ''} /></TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{moeda(Number(p.total ?? 0))}</TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>;
}
function IconeProduto({ nome }: { nome: string }) {
  const texto = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const Icone = /sofa|poltrona/.test(texto) ? ChairOutlined : /cama|colchao|box/.test(texto) ? BedOutlined : /guarda.?roupa|armario|roupeiro/.test(texto) ? DoorSlidingOutlined : /mesa|cadeira/.test(texto) ? TableRestaurantOutlined : /painel|televis|\btv\b/.test(texto) ? TvOutlined : Inventory2Outlined;
  return <Icone sx={{ fontSize: 24, color: 'text.secondary', flexShrink: 0 }} aria-hidden="true" />;
}

export default function HomePage() {
  const router = useRouter();
  const theme = useTheme();
  const [periodo, setPeriodo] = useState<PeriodoDashboard>('mes');
  const vendas = trpc.relatorios.dashboardDesempenho.useQuery({ periodo }, consulta);
  const pendentes = trpc.relatorios.dashboardPendentes.useQuery(undefined, consulta);
  const recentes = trpc.relatorios.dashboardPedidos.useQuery(undefined, consulta);
  const primeiraCargaConcluida = !vendas.isPending && !pendentes.isPending && !recentes.isPending;
  const datasProdutos = vendas.data?.intervaloAtual ?? { dataInicio: '2000-01-01', dataFim: '2000-01-01' };
  // A chave contém as datas: o ranking antigo não aparece durante a troca.
  const produtos = trpc.relatorios.dashboardProdutosPeriodo.useQuery(datasProdutos, {
    enabled: primeiraCargaConcluida && !!vendas.data, refetchInterval: 300_000, staleTime: 300_000, retry: 1,
  });
  const estados = [vendas, pendentes, recentes, produtos];
  const atualizando = estados.some(q => q.isFetching);
  const atualizar = () => void Promise.all([vendas.refetch(), pendentes.refetch(), recentes.refetch(), ...(primeiraCargaConcluida && vendas.data ? [produtos.refetch()] : [])]);
  useEffect(() => {
    const atalho = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyV' && !event.repeat && !event.defaultPrevented && !document.querySelector('[role="dialog"]')) {
        event.preventDefault(); router.push('/pdv');
      }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, [router]);
  const dados = vendas.data;
  const hrefVendas = dados ? linkVendas(dados.intervaloAtual.dataInicio, dados.intervaloAtual.dataFim) : undefined;
  const cards = [
    { label: 'Vendas no período', valor: dados ? moeda(dados.atual.totalVendas) : '—', variacao: dados?.variacoes.vendas ?? null, anterior: dados ? moeda(dados.anterior.totalVendas) : '', icone: PaymentsOutlined, estado: vendas, href: hrefVendas },
    { label: 'Vendas finalizadas', valor: dados ? quantidade(dados.atual.totalPedidos) : '—', variacao: dados?.variacoes.pedidos ?? null, anterior: dados ? quantidade(dados.anterior.totalPedidos) : '', icone: ReceiptLongOutlined, estado: vendas, href: hrefVendas },
    { label: 'Ticket médio', valor: dados ? moeda(dados.atual.ticketMedio) : '—', variacao: dados?.variacoes.ticket ?? null, anterior: dados ? moeda(dados.anterior.ticketMedio) : '', icone: LocalOfferOutlined, estado: vendas, href: hrefVendas },
    { label: 'Pedidos pendentes', valor: pendentes.data ? quantidade(pendentes.data.pedidosPendentes) : '—', variacao: null, anterior: '', icone: AccessTime, estado: pendentes, href: linkPendentes },
  ];
  const serie = dados?.serie.map(d => ({ ...d, label: d.data.slice(8) + '/' + d.data.slice(5, 7) })) ?? [];
  const semVendas = !!dados && dados.atual.totalPedidos === 0 && dados.anterior.totalPedidos === 0;
  const consultas = estados.filter(q => q.dataUpdatedAt > 0).map(q => q.dataUpdatedAt);
  const ultimaConsulta = consultas.length ? Math.min(...consultas) : 0;
  const maxProduto = Math.max(0, ...(produtos.data?.topProdutos.map(p => Math.abs(p.valor_total)) ?? []));

  return <AppLayout>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
        <FormControl size="small" sx={{ minWidth: 180, width: { xs: '100%', sm: 'auto' } }}>
          <Select value={periodo} onChange={event => setPeriodo(event.target.value as PeriodoDashboard)} inputProps={{ 'aria-label': 'Período das vendas' }} sx={{ bgcolor: 'background.paper', minHeight: 44 }}>
            <MenuItem value="mes">Mês até hoje</MenuItem><MenuItem value="7dias">Últimos 7 dias</MenuItem><MenuItem value="30dias">Últimos 30 dias</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ minWidth: 0 }}><Typography variant="body2" color="text.secondary">{dados ? intervalo(dados.intervaloAtual) : vendas.isPending ? 'Consultando período…' : 'Período indisponível'}</Typography>
          <Typography variant="caption" color="text.secondary">{dados ? 'Comparação: ' + intervalo(dados.intervaloAnterior) : 'Calendário de Fortaleza'}</Typography></Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, '& > *': { flex: { xs: 1, sm: 'initial' } } }}>
        <Button variant="outlined" startIcon={<Refresh />} onClick={atualizar} disabled={atualizando}>{atualizando ? 'Atualizando…' : 'Atualizar'}</Button>
        <MuiTooltip title="Abrir PDV · Alt + Shift + V"><Button component={NextLink} href="/pdv" variant="contained" startIcon={<PointOfSale />} aria-keyshortcuts="Alt+Shift+V">Abrir PDV</Button></MuiTooltip>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, minHeight: 32 }}>
      <Typography variant="body2" color="text.secondary">Hoje: <Box component="strong" sx={{ color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{dados ? moeda(dados.vendasHoje) : '—'}</Box> · dia em andamento</Typography>
      <Ajuda nome="vendas" texto={ajudaVendas} />
    </Box>
    <EstadoConsulta estado={vendas} nome="vendas e comparação" />
    <Box component="span" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {atualizando ? 'Atualizando consultas do período selecionado.' : estados.some(q => q.error) ? 'Algumas consultas falharam. Tente novamente na seção com erro.' : dados ? 'Consultas concluídas para ' + intervalo(dados.intervaloAtual) : 'Aguardando consultas.'}
    </Box>
    <Box component="section" aria-label="Resumo de vendas e operação" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
      {cards.map((card, indice) => <Paper key={card.label} sx={{ ...operationalSurface, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 12, sm: 14 } }}>{card.label}</Typography>
          <card.icone sx={{ fontSize: 22, color: 'primary.main', flexShrink: 0 }} aria-hidden="true" />
        </Box>
        {card.estado.isPending ? <Skeleton height={36} width="80%" /> : card.href ? <Button component={NextLink} href={card.href} aria-label={card.label + ': ' + card.valor + '. Consultar pedidos.'} sx={{ p: 0, minHeight: 44, justifyContent: 'flex-start', maxWidth: '100%', textAlign: 'left' }}>
          <Typography component="span" sx={{ color: indice === 0 ? 'primary.dark' : 'text.primary', fontWeight: 700, fontSize: { xs: 19, sm: 28 }, lineHeight: 1.35, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{card.valor}</Typography>
        </Button> : <Typography fontWeight={700} sx={{ fontSize: { xs: 19, sm: 28 }, minHeight: 44 }}>{card.valor}</Typography>}
        <Box sx={{ mt: .5, minHeight: 24 }}>{indice === 3 ? <Typography variant="caption" color="text.secondary">Todos os atendimentos e períodos</Typography> : card.estado.isPending ? <Skeleton width="60%" /> : dados ? <Variacao valor={card.variacao} anterior={card.anterior} /> : <Typography variant="caption" color="text.secondary">Consulta indisponível</Typography>}</Box>
        {indice === 3 && !!pendentes.error && <Typography variant="caption" color="error.main">{pendentes.data ? 'Valor anterior · atualização indisponível' : 'Consulta indisponível'}</Typography>}
      </Paper>)}
    </Box>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>Variações em relação ao período anterior mostrado acima.</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' }, alignItems: 'start', gap: 2 }}>
      <Paper component="section" sx={painel} aria-labelledby="evolucao-vendas" aria-busy={vendas.isFetching}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
          <Typography id="evolucao-vendas" component="h2" variant="h6">Evolução das vendas</Typography>
          <Box sx={{ display: 'flex', gap: 2 }} aria-label="Legenda do gráfico"><Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}><Box sx={{ width: 20, height: 10, bgcolor: 'primary.main', borderRadius: .5 }} /><Typography variant="caption" color="text.secondary">Atual</Typography></Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}><Box sx={{ width: 20, borderTop: '2px dashed', borderColor: 'text.secondary' }} /><Typography variant="caption" color="text.secondary">Anterior</Typography></Box></Box>
        </Box>
        {vendas.isPending ? <Carregando nome="vendas" /> : !dados ? <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>Dados indisponíveis. Tente novamente na consulta de vendas.</Typography> : (semVendas ? <Box sx={{ py: 5 }}><Typography>Nenhuma venda finalizada nos dois períodos.</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Você pode consultar pedidos ou iniciar uma venda no PDV.</Typography></Box> : <Box sx={{ height: 220, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%"><ComposedChart data={serie} accessibilityLayer margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} minTickGap={20} interval="preserveStartEnd" />
            <YAxis width={64} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} tickFormatter={v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
            <Tooltip content={({ active, payload }) => {
              const dia = payload?.[0]?.payload as Desempenho['serie'][number] | undefined;
              return active && dia ? <Paper sx={{ ...operationalSurface, p: 1.5 }}><Typography variant="body2" fontWeight={600}>Atual · {formatDateBR(dia.data)}</Typography><Typography variant="body2">{moeda(dia.atual)}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{dia.dataAnterior ? 'Anterior · ' + formatDateBR(dia.dataAnterior) + ': ' + moeda(dia.anterior ?? 0) : 'Sem dia equivalente no mês anterior'}</Typography></Paper> : null;
            }} />
            <Bar dataKey="atual" name="Atual" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
            <Line dataKey="anterior" name="Anterior" stroke={theme.palette.text.secondary} strokeWidth={2} strokeDasharray="5 4" dot={serie.length <= 7 ? { r: 3 } : false} connectNulls={false} isAnimationActive={false} />
          </ComposedChart></ResponsiveContainer>
        </Box>)}
        {dados && <Box component="details" sx={{ mt: 1.5, borderTop: '1px solid', borderColor: 'divider', '& summary': { cursor: 'pointer', color: 'primary.main', typography: 'body2', fontWeight: 600, py: 1.5, minHeight: 44 } }}><summary>Ver valores por dia</summary>
          <Table size="small" aria-label="Comparação das vendas por dia" sx={operationalTable}><TableHead><TableRow><TableCell>Datas</TableCell><TableCell align="right">Atual</TableCell><TableCell align="right">Anterior</TableCell></TableRow></TableHead>
            <TableBody>{serie.map(d => <TableRow key={d.data}><TableCell component="th" scope="row">{formatDateBR(d.data)}<Typography variant="caption" display="block" color="text.secondary">{d.dataAnterior ? formatDateBR(d.dataAnterior) : 'Sem equivalente'}</Typography></TableCell><TableCell align="right">{moeda(d.atual)}</TableCell><TableCell align="right">{d.anterior === null ? '—' : moeda(d.anterior)}</TableCell></TableRow>)}</TableBody></Table>
        </Box>}
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="pendentes-dashboard" aria-busy={pendentes.isFetching}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}><Typography id="pendentes-dashboard" component="h2" variant="h6">Pendentes para retomar</Typography><Button component={NextLink} href={linkPendentes} size="small" sx={{ minHeight: 44 }}>Ver todos<ArrowForward sx={{ fontSize: 16, ml: .5 }} /></Button></Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Mais antigos primeiro · todos os atendimentos</Typography>
        <EstadoConsulta estado={pendentes} nome="pedidos pendentes" />
        {pendentes.isPending ? <Carregando nome="pedidos pendentes" /> : pendentes.data && (pendentes.data.pedidos.length ? <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>{pendentes.data.pedidos.map(p => <Box component="li" key={p.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
          <Button component={NextLink} href={'/pedidos?id=' + p.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, textAlign: 'left', width: '100%', px: 0, py: .5, minHeight: 48 }}>
            <Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={600} color="text.primary" sx={{ overflowWrap: 'anywhere' }}><Box component="span" sx={{ color: 'primary.main', mr: .75, fontVariantNumeric: 'tabular-nums' }}>#{p.numero}</Box>{p.cliente_nome || 'Cliente não informado'}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={400}>{p.data ? formatDateBR(p.data) : 'Sem data'} · {p.tipo_atendimento_nome ? formatarTipoAtendimento(p.tipo_atendimento_nome) : 'Atendimento não informado'}</Typography></Box>
            <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{moeda(Number(p.total ?? 0))}</Typography>
          </Button>
        </Box>)}</Box> : <Box sx={{ py: 2 }}><Typography>Nenhum pedido pendente.</Typography><Button component={NextLink} href="/pdv" sx={{ mt: 1, minHeight: 44 }}>Iniciar atendimento</Button></Box>)}
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="pedidos-recentes" aria-busy={recentes.isFetching}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}><Typography id="pedidos-recentes" component="h2" variant="h6">Pedidos recentes</Typography><Button component={NextLink} href="/pedidos" size="small" sx={{ minHeight: 44 }}>Ver todos<ArrowForward sx={{ fontSize: 16, ml: .5 }} /></Button></Box>
        <EstadoConsulta estado={recentes} nome="pedidos recentes" />
        {recentes.isPending ? <Carregando nome="pedidos recentes" /> : recentes.data && (recentes.data.ultimosPedidos.length ? <TabelaPedidos pedidos={recentes.data.ultimosPedidos} /> : <Typography color="text.secondary" sx={{ py: 2 }}>Nenhum pedido registrado até hoje.</Typography>)}
      </Paper>
      <Paper component="section" sx={painel} aria-labelledby="produtos-periodo" aria-busy={produtos.isFetching}>
        <Typography id="produtos-periodo" component="h2" variant="h6">Produtos com maior valor vendido</Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .5, mb: 1.5 }}>Após descontos · período selecionado</Typography>
        <EstadoConsulta estado={produtos} nome="produtos vendidos" />
        {!vendas.data && !vendas.isPending ? <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Disponível após carregar o período das vendas.</Typography> : produtos.isPending ? <Carregando nome="produtos vendidos" /> : produtos.data && (produtos.data.topProdutos.length ? <Stack component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }} spacing={0}>{produtos.data.topProdutos.map((p, index) => <Box component="li" key={p.produto_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: .75, borderBottom: index < produtos.data.topProdutos.length - 1 ? '1px solid' : undefined, borderColor: 'divider' }}>
          <IconeProduto nome={p.produto_nome} /><Box sx={{ flex: 1, minWidth: 0 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{p.produto_nome}</Typography><Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{moeda(p.valor_total)}</Typography></Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.3 }}>{quantidade(p.quantidade_vendida)} {p.unidade}</Typography>
            <Box sx={{ mt: .5, height: 5, bgcolor: 'background.default', borderRadius: .5, overflow: 'hidden' }} aria-hidden="true"><Box sx={{ height: '100%', width: (maxProduto ? Math.abs(p.valor_total) / maxProduto * 100 : 0) + '%', bgcolor: p.valor_total < 0 ? 'error.main' : 'primary.main', borderRadius: .5 }} /></Box>
          </Box>
        </Box>)}</Stack> : <Typography color="text.secondary" sx={{ py: 2 }}>Nenhum produto detalhado neste período.</Typography>)}
        {!!produtos.data?.valorSemItens && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>Vendas sem itens detalhados: {moeda(produtos.data.valorSemItens)}. Não entram no ranking.</Typography>}
      </Paper>
    </Box>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>{ultimaConsulta ? 'Consulta mais antiga: ' + horario(ultimaConsulta) + ' · Fortaleza. ' : ''}Vendas e pedidos: atualização a cada minuto; produtos: a cada 5 minutos. <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>PDV: Alt + Shift + V.</Box></Typography>
  </AppLayout>;
}
