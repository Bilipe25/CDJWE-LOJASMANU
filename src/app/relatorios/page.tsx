'use client';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Box, Card, Typography, Button, TextField, Tabs, Tab, Alert, LinearProgress, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Accordion, AccordionSummary, AccordionDetails, CircularProgress } from '@mui/material';
import { Refresh, FileDownload, Print, ExpandMore } from '@mui/icons-material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import { OperationalHeader, OperationalSummary, operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import { trpc } from '@/lib/trpc/client';
import { hojeFinanceiro, deslocarDataCivil, periodoFinanceiroSchema, anoFinanceiroSchema } from '@/lib/schemas/financeiro';
import { formatDateBR, formatDateShort } from '@/lib/utils/dateUtils';
import { empresaParaDocumento } from '@/lib/utils/documentos';
import { serializarCSV, baixarArquivo } from '@/lib/utils/csv';
const moeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
const numero = (valor: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(valor);
const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const cores = ['#0369a1', '#047857', '#92400e', '#475569', '#1d4ed8', '#64748b'];
export default function RelatoriosPage() {
  const hoje = hojeFinanceiro();
  const [aba, setAba] = useState(0), [inicio, setInicio] = useState(deslocarDataCivil(hoje, -29)), [fim, setFim] = useState(hoje);
  const [ano, setAno] = useState(hoje.slice(0, 4)), [exportando, setExportando] = useState(false);
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
  const filtroRapido = (tipo: 'hoje' | '7dias' | '30dias' | 'mes') => { setFim(hoje); setInicio(tipo === 'hoje' ? hoje : tipo === 'mes' ? hoje.slice(0, 7) + '-01' : deslocarDataCivil(hoje, tipo === '7dias' ? -6 : -29)); };
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
    <OperationalHeader description="Confira vendas, despesas e resultados com critérios claros." actions={<>
      <Button variant="outlined" startIcon={<Refresh />} onClick={atualizar} disabled={!!erroFiltro || consulta.isFetching || exportando}>Atualizar</Button>
      <Button variant="outlined" startIcon={<Print />} onClick={() => void exportarDocumento('print')} disabled={!valido || !empresa.data || empresa.isError || exportando}>Imprimir</Button>
      <Button variant="contained" startIcon={<FileDownload />} onClick={() => void exportarDocumento('download')} disabled={!valido || !empresa.data || empresa.isError || exportando}>{exportando ? 'Preparando…' : 'Baixar PDF'}</Button>
    </>} />
    <Tabs value={aba} onChange={(_, valor: number) => setAba(valor)} aria-label="Tipo de relatório" sx={{ mb: 2 }}>
      <Tab id="aba-periodo" aria-controls="painel-periodo" label="Vendas por período" /><Tab id="aba-anual" aria-controls="painel-anual" label="Financeiro anual" />
    </Tabs>
    {empresa.isError && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => void empresa.refetch()}>Tentar novamente</Button>}>Os dados da empresa não foram carregados. A emissão de documentos está indisponível.</Alert>}
    <Card sx={{ ...operationalSurface, p: 2, mb: 2 }}>
      {aba === 0 ? <>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>{(['hoje', '7dias', '30dias', 'mes'] as const).map(tipo => <Button key={tipo} size="small" variant="outlined" onClick={() => filtroRapido(tipo)}>{({ hoje: 'Hoje', '7dias': '7 dias', '30dias': '30 dias', mes: 'Este mês' })[tipo]}</Button>)}</Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <TextField type="date" size="small" label="Data inicial" value={inicio} onChange={e => setInicio(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField type="date" size="small" label="Data final" value={fim} error={!!erroPeriodo} onChange={e => setFim(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Typography variant="body2" color="text.secondary">Somente vendas finalizadas · Valores líquidos</Typography>
        </Box>
      </> : <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}><TextField label="Ano" type="number" size="small" value={ano} error={!!erroAno} onChange={e => setAno(e.target.value)} slotProps={{ htmlInput: { min: 1900, max: 2100, step: 1 } }} /><Typography variant="body2" color="text.secondary">Vendas e despesas finalizadas · Saldo = vendas − despesas</Typography></Box>}
      {erroFiltro && <Alert severity="warning" sx={{ mt: 2 }}>{erroFiltro}</Alert>}
    </Card>
    <Typography component="p" variant="caption" color="text.secondary" sx={{ mb: 2 }} aria-live="polite">{consulta.isFetching ? 'Atualizando relatório…' : consulta.dataUpdatedAt && !erroFiltro ? `Atualizado às ${new Date(consulta.dataUpdatedAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' })}. Atualização automática a cada minuto.` : 'Selecione critérios válidos para consultar.'}</Typography>
    {consulta.isFetching && <LinearProgress aria-label="Carregando relatório" sx={{ mb: 2 }} />}
    {consulta.isError && !erroFiltro ? <Alert severity="error" action={<Button color="inherit" onClick={atualizar}>Tentar novamente</Button>}>Não foi possível carregar o relatório. {consulta.error.message}</Alert> : !erroFiltro && consulta.isPending ? <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress aria-label="Carregando relatório" /></Box> : !erroFiltro && aba === 0 && periodo.data ? <Box role="tabpanel" id="painel-periodo" aria-labelledby="aba-periodo">
      <OperationalSummary variant="cards" label="Resumo do período" items={[
        { label: 'Vendas líquidas', value: moeda(periodo.data.resumo.totalVendas), help: 'Vendas finalizadas após descontos dos itens e desconto geral.' },
        { label: 'Pedidos finalizados', value: numero(periodo.data.resumo.totalPedidos) },
        { label: 'Unidades vendidas', value: numero(periodo.data.resumo.totalUnidades), help: 'Soma das quantidades, inclusive fracionadas. Não é a contagem de linhas de itens; pode reunir diferentes unidades.' },
        { label: 'Ticket médio', value: moeda(periodo.data.resumo.ticketMedio) },
      ]} />
      {!periodo.data.resumo.totalPedidos ? <Alert severity="info">Não há vendas finalizadas neste período. Ajuste as datas para consultar outros registros.</Alert> : <>
        {periodo.data.resumo.valorSemItens > 0 && <Alert severity="warning" sx={{ mb: 2 }}>Há {moeda(periodo.data.resumo.valorSemItens)} em vendas sem itens detalhados. Esse valor aparece no total e na categoria correspondente.</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 2, mb: 2 }}>
          <Card sx={{ ...operationalSurface, p: 2, minWidth: 0 }}><Typography component="h2" variant="subtitle1" fontWeight={600}>Vendas por dia</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Valor líquido dos dias com vendas finalizadas.</Typography>
            <Box sx={{ height: 270 }} aria-label="Gráfico das vendas diárias; valores disponíveis na tabela abaixo"><ResponsiveContainer><LineChart data={periodo.data.dias} accessibilityLayer><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="data" tickFormatter={formatDateShort} /><YAxis width={65} tickFormatter={v => numero(Number(v))} /><Tooltip labelFormatter={v => formatDateBR(String(v))} formatter={v => moeda(Number(v))} /><Line type="monotone" dataKey="valor_total" name="Vendas líquidas" stroke="#0369a1" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></Box>
          </Card>
          <Card sx={{ ...operationalSurface, p: 2, minWidth: 0 }}><Typography component="h2" variant="subtitle1" fontWeight={600}>Vendas por categoria</Typography><Typography variant="body2" color="text.secondary">Todas as categorias do período, com descontos rateados.</Typography>
            <Box sx={{ height: 270 }} aria-label="Distribuição por categoria; valores disponíveis na tabela de categorias"><ResponsiveContainer><PieChart><Pie data={dadosPizza} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={78} isAnimationActive={false}>{dadosPizza.map((c, i) => <Cell key={c.nome} fill={cores[i % cores.length]} />)}</Pie><Tooltip formatter={v => moeda(Number(v))} /><Legend /></PieChart></ResponsiveContainer></Box>
          </Card>
        </Box>
        <Accordion disableGutters elevation={0} sx={{ ...operationalSurface, mb: 2 }}><AccordionSummary expandIcon={<ExpandMore />} id="resumo-dados-graficos" aria-controls="dados-graficos"><Typography fontWeight={600}>Consultar os dados dos gráficos</Typography></AccordionSummary><AccordionDetails id="dados-graficos">
          <Typography component="h3" variant="subtitle2">Vendas por dia</Typography><TableContainer><Table size="small" sx={operationalTable} aria-label="Valores das vendas diárias"><TableHead><TableRow>{['Data', 'Pedidos', 'Unidades', 'Valor líquido'].map(t => <TableCell key={t}>{t}</TableCell>)}</TableRow></TableHead><TableBody>{periodo.data.dias.map(d => <TableRow key={d.data}><TableCell>{formatDateBR(d.data)}</TableCell><TableCell>{numero(d.total_pedidos)}</TableCell><TableCell>{numero(d.total_itens)}</TableCell><TableCell align="right">{moeda(d.valor_total)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
          <Typography component="h3" variant="subtitle2" sx={{ mt: 2 }}>Todas as categorias</Typography><TableContainer><Table size="small" sx={operationalTable} aria-label="Valores de todas as categorias"><TableHead><TableRow><TableCell>Categoria</TableCell><TableCell align="right">Valor líquido</TableCell></TableRow></TableHead><TableBody>{categorias.map(c => <TableRow key={c.nome}><TableCell>{c.nome}</TableCell><TableCell align="right">{moeda(c.valor)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
        </AccordionDetails></Accordion>
        <Card sx={operationalSurface}><Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}><Box><Typography component="h2" variant="subtitle1" fontWeight={600}>Produtos com maior valor vendido</Typography><Typography variant="body2" color="text.secondary">Top 10 por valor líquido. O CSV e o PDF incluem todos os produtos.</Typography></Box><Button startIcon={<FileDownload />} disabled={!valido || !produtos.length || exportando} onClick={exportarCSV}>Exportar produtos (CSV)</Button></Box>
          <TableContainer><Table sx={operationalTable} aria-label="Produtos ordenados pelo valor líquido"><TableHead><TableRow>{['Produto', 'Categoria', 'Quantidade', 'Pedidos', 'Valor líquido'].map(t => <TableCell key={t} align={['Quantidade', 'Pedidos', 'Valor líquido'].includes(t) ? 'right' : 'left'}>{t}</TableCell>)}</TableRow></TableHead><TableBody>{produtos.slice(0, 10).map(p => <TableRow key={p.produto_id}><TableCell sx={{ minWidth: 180, overflowWrap: 'anywhere' }}>{p.produto_nome}</TableCell><TableCell>{p.categoria_nome}</TableCell><TableCell align="right">{numero(p.quantidade_vendida)} {p.unidade}</TableCell><TableCell align="right">{p.total_vendas}</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{moeda(p.valor_total)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
        </Card>
      </>}
    </Box> : !erroFiltro && aba === 1 && anual.data ? <Box role="tabpanel" id="painel-anual" aria-labelledby="aba-anual">
      <OperationalSummary variant="cards" label="Resumo anual" items={[
        { label: 'Vendas finalizadas', value: moeda(anual.data.vendas) }, { label: 'Despesas finalizadas', value: moeda(anual.data.despesas) },
        { label: 'Saldo do ano', value: moeda(anual.data.saldo), help: 'Vendas menos despesas finalizadas; não representa o saldo de uma conta bancária.' }, { label: 'Ano da consulta', value: anual.data.ano },
      ]} />
      {!anual.data.linhas.length ? <Alert severity="info">Não há vendas ou despesas finalizadas neste ano.</Alert> : <>
        <Card sx={{ ...operationalSurface, p: 2, mb: 2 }}><Typography component="h2" variant="subtitle1" fontWeight={600}>Resultado mês a mês</Typography><Box sx={{ height: 290, mt: 2 }} aria-label="Gráfico anual; valores disponíveis no resumo mensal"><ResponsiveContainer><LineChart data={anual.data.meses.map(m => ({ ...m, nome: meses[m.mes - 1] }))} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis width={65} /><Tooltip formatter={v => moeda(Number(v))} /><Legend /><Line dataKey="vendas" name="Vendas" stroke="#0369a1" dot={false} isAnimationActive={false} /><Line dataKey="despesas" name="Despesas" stroke="#b91c1c" dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></Box></Card>
        <Card sx={{ ...operationalSurface, mb: 2 }}><Typography component="h2" variant="subtitle1" fontWeight={600} sx={{ p: 2 }}>Resumo mensal</Typography><TableContainer><Table sx={operationalTable} aria-label="Vendas, despesas e saldo por mês"><TableHead><TableRow>{['Mês', 'Vendas', 'Despesas', 'Saldo'].map(t => <TableCell key={t} align={t === 'Mês' ? 'left' : 'right'}>{t}</TableCell>)}</TableRow></TableHead><TableBody>{anual.data.meses.map(m => <TableRow key={m.mes}><TableCell>{meses[m.mes - 1]}</TableCell><TableCell align="right">{moeda(m.vendas)}</TableCell><TableCell align="right">{moeda(m.despesas)}</TableCell><TableCell align="right" sx={{ fontWeight: 600 }}>{moeda(m.saldo)}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Card>
        <Accordion disableGutters elevation={0} sx={operationalSurface}><AccordionSummary expandIcon={<ExpandMore />} id="resumo-pagamentos" aria-controls="detalhe-pagamentos"><Typography fontWeight={600}>Detalhar por natureza e pagamento</Typography></AccordionSummary><AccordionDetails id="detalhe-pagamentos" sx={{ px: 0 }}><Typography variant="body2" color="text.secondary" sx={{ px: 2, mb: 2 }}>Vendas e despesas têm linhas separadas, mesmo quando usam a mesma forma de pagamento. Role a tabela para consultar todos os meses.</Typography>
          <TableContainer><Table size="small" sx={operationalTable} aria-label="Detalhamento anual por natureza e pagamento"><TableHead><TableRow><TableCell sx={{ position: 'sticky', left: 0, zIndex: 1 }}>Natureza / pagamento</TableCell>{meses.map(m => <TableCell key={m} align="right">{m}</TableCell>)}<TableCell align="right">Total</TableCell></TableRow></TableHead><TableBody>{anual.data.linhas.map(l => <TableRow key={JSON.stringify([l.natureza, l.pagamento])}><TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', minWidth: 170, fontWeight: 600 }}>{l.natureza} / {l.pagamento}</TableCell>{l.valores.map((v, i) => <TableCell key={i} align="right" sx={{ whiteSpace: 'nowrap' }}>{moeda(v)}</TableCell>)}<TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{moeda(l.total)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
        </AccordionDetails></Accordion>
      </>}
    </Box> : null}
  </AppLayout>;
}
