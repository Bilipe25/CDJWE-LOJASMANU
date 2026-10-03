'use client';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Box, Card, Typography, Button, TextField, Tabs, Tab, Alert, LinearProgress, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Chip, ButtonGroup } from '@mui/material';
import { Refresh, FileDownload, Print, ExpandMore, TrendingUp, Assessment, Star } from '@mui/icons-material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import { operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import StatCard from '@/components/common/StatCard';
import RelatorioAnual from '@/components/financeiro/RelatorioAnual';
import { trpc } from '@/lib/trpc/client';
import { hojeFinanceiro, deslocarDataCivil, periodoFinanceiroSchema, anoFinanceiroSchema } from '@/lib/schemas/financeiro';
import { formatDateBR, formatDateShort } from '@/lib/utils/dateUtils';
import { empresaParaDocumento } from '@/lib/utils/documentos';
import { serializarCSV, baixarArquivo } from '@/lib/utils/csv';
const moeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
const numero = (valor: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(valor);
const cores = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
export default function RelatoriosPage() {
  const hoje = hojeFinanceiro();
  const [aba, setAba] = useState(0), [inicio, setInicio] = useState(deslocarDataCivil(hoje, -29)), [fim, setFim] = useState(hoje);
  const [ano, setAno] = useState(hoje.slice(0, 4)), [exportando, setExportando] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState('30dias');
  const trava = useRef(false);
  const periodoValidado = periodoFinanceiroSchema.safeParse({ dataInicio: inicio, dataFim: fim });
  const anoValidado = anoFinanceiroSchema.safeParse(Number(ano));
  const erroPeriodo = periodoValidado.success ? '' : periodoValidado.error.issues[0].message;
  const erroAno = anoValidado.success ? '' : 'Informe um ano inteiro entre 1900 e 2100.';
  const opcoes = { refetchOnWindowFocus: true, refetchInterval: 60_000 };
  const periodo = trpc.relatorios.financeiroPeriodo.useQuery({ dataInicio: inicio, dataFim: fim }, { ...opcoes, enabled: aba === 0 && periodoValidado.success });
  const anual = trpc.relatorios.relatorioAnual.useQuery({ ano: Number(ano) || 0 }, { ...opcoes, enabled: aba === 1 && anoValidado.success });
  const empresa = trpc.configuracoes.get.useQuery();
  const consulta = aba === 0 ? periodo : anual;
  const erroFiltro = aba === 0 ? erroPeriodo : erroAno;
  const valido = !erroFiltro && !consulta.isError && !consulta.isFetching && !!consulta.data;
  const produtos = periodo.data?.produtos ?? [];
  const categorias = periodo.data?.categorias ?? [];
  const dadosPizza = categorias.length <= 5 ? categorias : [...categorias.slice(0, 5), { nome: 'Outras categorias', valor: Math.round(categorias.slice(5).reduce((s, c) => s + c.valor, 0) * 100) / 100 }];
  const atualizar = () => { if (!erroFiltro) void consulta.refetch(); };
  const filtroRapido = (tipo: 'hoje' | '7dias' | '30dias' | 'mes') => { setFiltroAtivo(tipo); setFim(hoje); setInicio(tipo === 'hoje' ? hoje : tipo === 'mes' ? hoje.slice(0, 7) + '-01' : deslocarDataCivil(hoje, tipo === '7dias' ? -6 : -29)); };
  const exportarDocumento = async (acao: 'print' | 'download') => {
    if (trava.current || !valido) return;
    trava.current = true; setExportando(true);
    try {
      if (!empresa.data || empresa.isError) throw new Error('Carregue os dados da empresa antes de emitir o relatório.');
      const pdf = await import('@/lib/pdf/financeiro-pdf');
      const config = empresaParaDocumento(empresa.data);
      const definicao = aba === 0 ? pdf.criarDefinicaoPeriodo(periodo.data!, config) : pdf.criarDefinicaoAnual(anual.data!, config);
      await pdf.gerarDocumentoFinanceiro(definicao, aba === 0 ? `vendas-${inicio}-${fim}.pdf` : `financeiro-${ano}.pdf`, acao);
      toast.success(acao === 'print' ? 'Impressão preparada.' : 'PDF preparado para download.');
    } catch (erro) { toast.error(erro instanceof Error ? erro.message : 'Não foi possível emitir o relatório. Tente novamente.'); }
    finally { trava.current = false; setExportando(false); }
  };
  const exportarCSV = () => {
    if (!valido || !periodo.data || !produtos.length || trava.current) return;
    baixarArquivo(new Blob([serializarCSV([
      ['Produto', 'Categoria', 'Quantidade', 'Unidade', 'Pedidos', 'Valor líquido (R$)', 'Data inicial', 'Data final'],
      ...produtos.map(p => [p.produto_nome, p.categoria_nome, p.quantidade_vendida, p.unidade, p.total_vendas, p.valor_total, inicio, fim]),
    ])], { type: 'text/csv;charset=utf-8' }), `produtos-${inicio}-${fim}.csv`);
    toast.success(`${produtos.length} produtos exportados em CSV.`);
  };
  return <AppLayout>
    <Tabs value={aba} onChange={(_, valor: number) => setAba(valor)} aria-label="Tipo de relatório" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
      <Tab id="aba-periodo" aria-controls="painel-periodo" label="Relatório por Período" /><Tab id="aba-anual" aria-controls="painel-anual" label="Relatório Anual" />
    </Tabs>
    {empresa.isError && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => void empresa.refetch()}>Tentar novamente</Button>}>Os dados da empresa não foram carregados. A emissão de documentos está indisponível.</Alert>}
    <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
      {aba === 0 ? <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}><Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Typography variant="subtitle2" color="text.secondary">Filtros Rápidos</Typography><Chip label="Vendas finalizadas" size="small" color="success" /></Box><Typography variant="caption" color="primary.main">Período: {formatDateBR(inicio)} até {formatDateBR(fim)}</Typography></Box>
        <ButtonGroup sx={{ mb: 2, flexWrap: 'wrap' }}>{(['hoje', '7dias', '30dias', 'mes'] as const).map(tipo => <Button key={tipo} variant={filtroAtivo === tipo ? 'contained' : 'outlined'} onClick={() => filtroRapido(tipo)}>{({ hoje: 'Hoje', '7dias': '7 dias', '30dias': '30 dias', mes: 'Este mês' })[tipo]}</Button>)}</ButtonGroup>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <TextField type="date" size="small" label="Data inicial" value={inicio} onChange={e => { setFiltroAtivo(''); setInicio(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField type="date" size="small" label="Data final" value={fim} error={!!erroPeriodo} onChange={e => { setFiltroAtivo(''); setFim(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="outlined" startIcon={<FileDownload />} onClick={exportarCSV} disabled={!valido || !produtos.length || exportando}>Exportar CSV</Button>
        </Box>
      </> : <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}><Box><Typography component="h2" variant="h5" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>RELATÓRIO MENSAL DE VENDAS</Typography><Typography variant="h6" color="text.secondary">ANO: {ano}</Typography></Box><TextField label="Ano" type="number" size="small" value={ano} error={!!erroAno} onChange={e => setAno(e.target.value)} sx={{ width: 120 }} slotProps={{ htmlInput: { min: 1900, max: 2100, step: 1 } }} /></Box>}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}><Button variant="outlined" startIcon={<Refresh />} onClick={atualizar} disabled={!!erroFiltro || consulta.isFetching || exportando}>Atualizar</Button><Button variant="outlined" startIcon={<Print />} onClick={() => void exportarDocumento('print')} disabled={!valido || !empresa.data || empresa.isError || exportando}>Imprimir</Button><Button variant="contained" color={aba === 1 ? 'error' : 'primary'} startIcon={<FileDownload />} onClick={() => void exportarDocumento('download')} disabled={!valido || !empresa.data || empresa.isError || exportando}>{exportando ? 'Preparando…' : 'Exportar PDF'}</Button></Box>
      {erroFiltro && <Alert severity="warning" sx={{ mt: 2 }}>{erroFiltro}</Alert>}
    </Card>
    <Typography component="p" variant="caption" color="text.secondary" sx={{ mb: 2 }} aria-live="polite">{consulta.isFetching ? 'Atualizando relatório…' : consulta.dataUpdatedAt && !erroFiltro ? `Atualizado às ${new Date(consulta.dataUpdatedAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' })}. Atualização automática a cada minuto.` : 'Selecione critérios válidos para consultar.'}</Typography>
    {consulta.isFetching && <LinearProgress aria-label="Carregando relatório" sx={{ mb: 2 }} />}
    {consulta.isError && !erroFiltro ? <Alert severity="error" action={<Button color="inherit" onClick={atualizar}>Tentar novamente</Button>}>Não foi possível carregar o relatório. {consulta.error.message}</Alert> : !erroFiltro && consulta.isPending ? <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress aria-label="Carregando relatório" /></Box> : !erroFiltro && aba === 0 && periodo.data ? <Box role="tabpanel" id="painel-periodo" aria-labelledby="aba-periodo">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 3, mb: 4, "& .MuiTypography-h4": { fontSize: { xs: "1.25rem", md: "2rem" }, overflowWrap: "anywhere" } }} aria-label="Resumo do período">
        <StatCard title="Total de Vendas" value={moeda(periodo.data.resumo.totalVendas)} icon={<TrendingUp />} color="#10b981" />
        <StatCard title="Total de Pedidos" value={numero(periodo.data.resumo.totalPedidos)} icon={<Assessment />} color="#0ea5e9" />
        <StatCard title="Unidades Vendidas" value={numero(periodo.data.resumo.totalUnidades)} icon={<Star />} color="#8b5cf6" />
        <StatCard title="Ticket Médio" value={moeda(periodo.data.resumo.ticketMedio)} icon={<Star />} color="#f59e0b" />
      </Box>
      <Typography variant="caption" component="p" color="text.secondary" sx={{ mb: 2 }}>Valores líquidos após descontos. Unidades somam quantidades, inclusive fracionadas, e podem reunir diferentes unidades de medida.</Typography>
      {!periodo.data.resumo.totalPedidos ? <Alert severity="info">Não há vendas finalizadas neste período. Ajuste as datas para consultar outros registros.</Alert> : <>
        {periodo.data.resumo.valorSemItens !== 0 && <Alert severity="warning" sx={{ mb: 2 }}>Há {moeda(periodo.data.resumo.valorSemItens)} em vendas sem itens detalhados. Esse valor aparece no total e na categoria correspondente.</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}>
          <Card sx={{ p: 3, minWidth: 0 }}><Typography component="h2" variant="h6" fontWeight={700}>Vendas por Período</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Evolução das vendas no período selecionado</Typography>
            <Box sx={{ height: { xs: 250, md: 350 } }} aria-label="Gráfico das vendas diárias; valores disponíveis na tabela abaixo"><ResponsiveContainer><BarChart data={periodo.data.dias} accessibilityLayer><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="data" tickFormatter={formatDateShort} tick={{ fontSize: 11 }} /><YAxis width={65} tickFormatter={v => numero(Number(v))} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={v => formatDateBR(String(v))} formatter={v => moeda(Number(v))} /><Bar dataKey="valor_total" name="Vendas líquidas" fill="#0ea5e9" radius={[8, 8, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Box>
          </Card>
          <Card sx={{ p: 3, minWidth: 0 }}><Typography component="h2" variant="h6" fontWeight={700}>Top Categorias</Typography><Typography variant="body2" color="text.secondary">Distribuição por categoria — todos os produtos</Typography>
            <Box sx={{ height: 300 }} aria-label="Distribuição por categoria; valores disponíveis na tabela de categorias"><ResponsiveContainer><PieChart><Pie data={dadosPizza.filter(c => c.valor > 0)} dataKey="valor" nameKey="nome" outerRadius={80} isAnimationActive={false}>{dadosPizza.filter(c => c.valor > 0).map((c, i) => <Cell key={c.nome} fill={cores[i % cores.length]} />)}</Pie><Tooltip formatter={v => moeda(Number(v))} /><Legend /></PieChart></ResponsiveContainer></Box><Typography variant="caption" color="text.secondary">O gráfico mostra valores positivos; a tabela inclui também ajustes negativos.</Typography>
          </Card>
        </Box>
        <Accordion disableGutters elevation={0} sx={{ ...operationalSurface, mb: 2 }}><AccordionSummary expandIcon={<ExpandMore />} id="resumo-dados-graficos" aria-controls="dados-graficos"><Typography fontWeight={600}>Consultar os dados dos gráficos</Typography></AccordionSummary><AccordionDetails id="dados-graficos">
          <Typography component="h3" variant="subtitle2">Vendas por dia</Typography><TableContainer><Table size="small" sx={operationalTable} aria-label="Valores das vendas diárias"><TableHead><TableRow>{['Data', 'Pedidos', 'Unidades', 'Valor líquido'].map(t => <TableCell key={t}>{t}</TableCell>)}</TableRow></TableHead><TableBody>{periodo.data.dias.map(d => <TableRow key={d.data}><TableCell>{formatDateBR(d.data)}</TableCell><TableCell>{numero(d.total_pedidos)}</TableCell><TableCell>{numero(d.total_itens)}</TableCell><TableCell align="right">{moeda(d.valor_total)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
          <Typography component="h3" variant="subtitle2" sx={{ mt: 2 }}>Todas as categorias</Typography><TableContainer><Table size="small" sx={operationalTable} aria-label="Valores de todas as categorias"><TableHead><TableRow><TableCell>Categoria</TableCell><TableCell align="right">Valor líquido</TableCell></TableRow></TableHead><TableBody>{categorias.map(c => <TableRow key={c.nome}><TableCell>{c.nome}</TableCell><TableCell align="right">{moeda(c.valor)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
        </AccordionDetails></Accordion>
        <Card sx={operationalSurface}><Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}><Box><Typography component="h2" variant="subtitle1" fontWeight={600}>Produtos Mais Vendidos</Typography><Typography variant="body2" color="text.secondary">Top 10 por valor líquido. O CSV e o PDF incluem todos os produtos.</Typography></Box><Button startIcon={<FileDownload />} disabled={!valido || !produtos.length || exportando} onClick={exportarCSV}>Exportar produtos (CSV)</Button></Box>
          <TableContainer><Table sx={operationalTable} aria-label="Produtos ordenados pelo valor líquido"><TableHead><TableRow>{['#', 'Produto', 'Categoria', 'Qtd. Vendida', 'Pedidos', 'Valor líquido'].map(t => <TableCell key={t} align={['Quantidade', 'Pedidos', 'Valor líquido'].includes(t) ? 'right' : 'left'}>{t}</TableCell>)}</TableRow></TableHead><TableBody>{produtos.slice(0, 10).map((p, indice) => <TableRow key={p.produto_id}><TableCell><Box sx={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: indice < 3 ? "primary.main" : "background.default", color: indice < 3 ? "white" : "text.primary", fontWeight: 700 }}>{indice + 1}</Box></TableCell><TableCell sx={{ minWidth: 180, overflowWrap: 'anywhere' }}>{p.produto_nome}</TableCell><TableCell>{p.categoria_nome}</TableCell><TableCell align="right">{numero(p.quantidade_vendida)} {p.unidade}</TableCell><TableCell align="right">{p.total_vendas}</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{moeda(p.valor_total)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
        </Card>
      </>}
    </Box> : !erroFiltro && aba === 1 && anual.data ? <Box role="tabpanel" id="painel-anual" aria-labelledby="aba-anual">
      <RelatorioAnual dados={anual.data} />
    </Box> : null}
  </AppLayout>;
}
