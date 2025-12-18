'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDateBR, formatDateShort, dateToString } from '@/lib/utils/dateUtils';
import {
  Box,
  Card,
  Grid,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  ButtonGroup,
  Tabs,
  Tab,
  Paper,
  useMediaQuery,
  useTheme,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Assessment,
  Download,
  Print,
  TrendingUp,
  Star,
  PictureAsPdf,
  NavigateNext,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { trpc } from '@/lib/trpc/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { format, subDays, startOfMonth, startOfWeek } from 'date-fns';

export default function RelatoriosPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const hoje = dateToString(new Date());
  const trintaDiasAtras = dateToString(subDays(new Date(), 29)); // 29 dias atrás + hoje = 30 dias

  const [dataInicio, setDataInicio] = useState(trintaDiasAtras);
  const [dataFim, setDataFim] = useState(hoje);
  const [filtroAtivo, setFiltroAtivo] = useState('30dias');
  const [tabAtiva, setTabAtiva] = useState(0);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  const { data: vendasPeriodo, isLoading: loadingVendas } = trpc.relatorios.vendasPeriodo.useQuery({
    dataInicio,
    dataFim,
  });

  const { data: topProdutos, isLoading: loadingProdutos } = trpc.relatorios.topProdutos.useQuery({
    dataInicio,
    dataFim,
    limite: 10,
  });

  const { data: relatorioAnual, isLoading: loadingAnual } = trpc.relatorios.relatorioAnual.useQuery({
    ano: anoSelecionado,
  }, {
    enabled: tabAtiva === 1, // Só busca quando a tab anual está ativa
  });

  const { data: configEmpresa } = trpc.configuracoes.get.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };


  const totalVendas = (vendasPeriodo as any)?.reduce((acc: number, v: any) => acc + (v.valor_total || 0), 0) || 0;
  const totalPedidos = (vendasPeriodo as any)?.reduce((acc: number, v: any) => acc + (v.total_pedidos || 0), 0) || 0;
  const totalItens = (vendasPeriodo as any)?.reduce((acc: number, v: any) => acc + (v.total_itens || 0), 0) || 0;
  const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

  // Agrupar produtos por categoria para o gráfico de pizza
  const categoriasPorValor = (topProdutos as any)?.reduce((acc: any, produto: any) => {
    const categoria = produto.categoria_nome || 'Sem categoria';
    if (!acc[categoria]) {
      acc[categoria] = 0;
    }
    acc[categoria] += produto.valor_total;
    return acc;
  }, {}) || {};

  const dadosPizza = Object.entries(categoriasPorValor)
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5);

  const handleFiltroRapido = (tipo: string) => {
    const hoje = new Date();
    let inicio: Date;

    switch (tipo) {
      case 'hoje':
        inicio = hoje;
        break;
      case '7dias':
        inicio = subDays(hoje, 6); // 6 dias atrás + hoje = 7 dias
        break;
      case '30dias':
        inicio = subDays(hoje, 29); // 29 dias atrás + hoje = 30 dias
        break;
      case 'mes':
        inicio = startOfMonth(hoje);
        break;
      default:
        inicio = subDays(hoje, 29);
    }

    setDataInicio(dateToString(inicio));
    setDataFim(dateToString(hoje));
    setFiltroAtivo(tipo);
  };

  const handleExportarExcel = () => {
    if (!topProdutos || (topProdutos as any).length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const toastId = toast.loading('Gerando arquivo Excel...');

    try {
      // Criar CSV
      const headers = ['#', 'Produto', 'Categoria', 'Qtd. Vendida', 'Total Vendas', 'Valor Total'];
      const rows = (topProdutos as any).map((p: any, index: number) => [
        index + 1,
        p.produto_nome,
        p.categoria_nome || '-',
        p.quantidade_vendida,
        p.total_vendas,
        p.valor_total,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((r: any) => r.join(','))
      ].join('\n');

      // Download
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-produtos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      toast.success('Arquivo exportado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao exportar arquivo', { id: toastId });
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleExportarPDFAnual = async () => {
    const toastId = toast.loading('Gerando PDF...');

    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const vfsFonts = await import('pdfmake/build/vfs_fonts');
      (pdfMake as any).vfs = vfsFonts.default;

      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

      // Preparar dados da tabela
      const tableBody: any[] = [
        // Cabeçalho
        [
          { text: 'TRANSAÇÕES', style: 'tableHeader', fillColor: '#e0e0e0' },
          ...meses.map(mes => ({ text: mes, style: 'tableHeader', alignment: 'center', fillColor: '#e0e0e0' }))
        ]
      ];

      // Linhas de formas de pagamento (Vendas e Despesas juntas)
      Object.entries(dadosAnuais.tabela).forEach(([forma, valores]: [string, any]) => {
        // Verificar se é uma linha de despesa (como DÍZIMO)
        const ehDespesa = forma === 'DIZIMO' || forma.toUpperCase().includes('DESPESA');

        tableBody.push([
          {
            text: forma,
            style: 'cellBold',
            color: ehDespesa ? '#c62828' : '#000000'
          },
          ...(valores as number[]).map(valor => ({
            text: valor > 0 ? formatCurrency(valor) : '-',
            alignment: 'right' as const,
            style: ehDespesa ? 'cellDespesa' : 'cell',
            fillColor: ehDespesa ? '#ffebee' : '#ffffff'
          }))
        ]);
      });

      // Linha de totais de vendas
      tableBody.push([
        { text: 'TOTAL VENDAS', style: 'tableHeader', fillColor: '#e0e0e0' },
        ...dadosAnuais.grafico.map((item: any) => ({
          text: item.vendas > 0 ? formatCurrency(item.vendas) : '-',
          alignment: 'right' as const,
          style: 'tableHeader',
          fillColor: '#e0e0e0'
        }))
      ]);

      // Linha de saídas financeiras
      tableBody.push([
        { text: 'SAÍDAS FINANCEIRAS', style: 'tableHeader', fillColor: '#ffebee' },
        ...dadosAnuais.despesas.map((despesa: number) => ({
          text: despesa > 0 ? formatCurrency(despesa) : '-',
          alignment: 'right' as const,
          style: 'cellDespesa',
          fillColor: '#ffebee'
        }))
      ]);

      // Preparar resumo de totais
      const resumoTotais: any[] = [];
      Object.entries(dadosAnuais.totais).forEach(([forma, total]: [string, any]) => {
        resumoTotais.push({
          text: `${forma}: ${formatCurrency(total)}`,
          style: 'resumoItem'
        });
      });

      const totalGeral = dadosAnuais.grafico.reduce((acc: number, item: any) => acc + item.vendas, 0);
      resumoTotais.push({
        text: `TOTAL VENDAS: ${formatCurrency(totalGeral)}`,
        style: 'totalGeral'
      });
      resumoTotais.push({
        text: `SAÍDAS FINANCEIRAS: ${formatCurrency(dadosAnuais.totalDespesas)}`,
        style: 'totalDespesas'
      });

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [40, 60, 40, 60],
        content: [
          // Dados da Empresa
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: configEmpresa?.nome_empresa || 'LOJAS MANÚ', style: 'empresaNome', margin: [0, 0, 0, 2] },
                  { text: configEmpresa?.razao_social || '', style: 'empresaInfo', margin: [0, 0, 0, 1] },
                  {
                    text: configEmpresa?.cnpj ? `CNPJ: ${configEmpresa.cnpj}` : '',
                    style: 'empresaInfo',
                    margin: [0, 0, 0, 1]
                  },
                  {
                    text: configEmpresa?.logradouro
                      ? `${configEmpresa.logradouro}${configEmpresa.numero ? ', ' + configEmpresa.numero : ''} - ${configEmpresa.bairro || ''}`
                      : '',
                    style: 'empresaInfo',
                    margin: [0, 0, 0, 1]
                  },
                  {
                    text: configEmpresa?.cidade && configEmpresa?.estado
                      ? `${configEmpresa.cidade} - ${configEmpresa.estado}${configEmpresa.cep ? ' - CEP: ' + configEmpresa.cep : ''}`
                      : '',
                    style: 'empresaInfo',
                    margin: [0, 0, 0, 1]
                  },
                  {
                    text: configEmpresa?.telefone || configEmpresa?.email
                      ? `${configEmpresa?.telefone || ''} ${configEmpresa?.telefone && configEmpresa?.email ? '|' : ''} ${configEmpresa?.email || ''}`
                      : '',
                    style: 'empresaInfo'
                  },
                ]
              }
            ],
            margin: [0, 0, 0, 15]
          },

          // Divisor
          {
            canvas: [
              {
                type: 'line',
                x1: 0, y1: 0,
                x2: 750, y2: 0,
                lineWidth: 2,
                lineColor: '#1976d2'
              }
            ],
            margin: [0, 0, 0, 15]
          },

          // Título
          {
            text: 'RELATÓRIO MENSAL DE VENDAS',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 5]
          },
          {
            text: `ANO: ${anoSelecionado}`,
            style: 'subheader',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },

          // Tabela
          {
            table: {
              headerRows: 1,
              widths: ['auto', ...Array(12).fill('*')],
              body: tableBody
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
            margin: [0, 0, 0, 15]
          },

          // Resumo de Totais
          {
            text: 'TOTAL GERAL DAS TRANSAÇÕES',
            style: 'sectionTitle',
            margin: [0, 10, 0, 10]
          },
          {
            columns: [
              {
                width: '*',
                stack: resumoTotais
              }
            ]
          },

          // Rodapé
          {
            text: `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
            style: 'footer',
            margin: [0, 20, 0, 0]
          }
        ],
        styles: {
          empresaNome: {
            fontSize: 14,
            bold: true,
            color: '#1976d2'
          },
          empresaInfo: {
            fontSize: 8,
            color: '#666666'
          },
          header: {
            fontSize: 16,
            bold: true,
            color: '#1976d2'
          },
          subheader: {
            fontSize: 14,
            bold: true,
            color: '#666666'
          },
          tableHeader: {
            fontSize: 8,
            bold: true,
            fillColor: '#e0e0e0'
          },
          cellBold: {
            fontSize: 7,
            bold: true
          },
          cell: {
            fontSize: 7
          },
          cellDespesa: {
            fontSize: 7,
            bold: true,
            color: '#c62828'
          },
          sectionTitle: {
            fontSize: 11,
            bold: true,
            color: '#1976d2'
          },
          resumoItem: {
            fontSize: 9,
            margin: [0, 2, 0, 2]
          },
          totalGeral: {
            fontSize: 11,
            bold: true,
            color: '#1976d2',
            margin: [0, 5, 0, 0]
          },
          totalDespesas: {
            fontSize: 11,
            bold: true,
            color: '#c62828',
            margin: [0, 2, 0, 0]
          },
          footer: {
            fontSize: 8,
            color: '#999999',
            alignment: 'center'
          }
        },
        defaultStyle: {
          font: 'Roboto'
        }
      };

      pdfMake.createPdf(docDefinition).download(`relatorio-anual-${anoSelecionado}.pdf`);
      toast.success('PDF gerado com sucesso!', { id: toastId });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF', { id: toastId });
    }
  };

  // Processar dados do relatório anual
  const dadosAnuais = React.useMemo(() => {
    // DEBUG: Verificar o que está retornando
    console.log('📊 Dados do relatório anual:', relatorioAnual);
    console.log('📅 Ano selecionado:', anoSelecionado);
    console.log('🔄 Tab ativa:', tabAtiva);

    if (!relatorioAnual) return { tabela: {}, grafico: [], totais: {}, despesas: [], totalDespesas: 0 };

    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const tabela: any = {};
    const totaisMensais: any = {};
    const despesasMensais: any = {};
    const totaisFormasPagamento: any = {};

    // Organizar dados por forma de pagamento e mês
    (relatorioAnual as any)?.forEach((item: any) => {
      const forma = item.forma_pagamento_nome;
      const mes = item.mes - 1; // 0-indexed

      if (!tabela[forma]) {
        tabela[forma] = Array(12).fill(0);
      }

      // CORREÇÃO: Para DÍZIMO e outras SAÍDAS, o valor está em total_despesas
      // Para VENDAS normais, o valor está em total_vendas
      const valorMensal = item.total_vendas > 0 ? item.total_vendas : item.total_despesas;
      tabela[forma][mes] = valorMensal;

      // Acumular totais mensais de vendas (apenas ENTRADA)
      if (!totaisMensais[mes]) {
        totaisMensais[mes] = 0;
      }
      totaisMensais[mes] += item.total_vendas;

      // Acumular despesas mensais (apenas SAIDA)
      if (!despesasMensais[mes]) {
        despesasMensais[mes] = 0;
      }
      despesasMensais[mes] += item.total_despesas;

      // Acumular totais por forma de pagamento
      if (!totaisFormasPagamento[forma]) {
        totaisFormasPagamento[forma] = 0;
      }
      totaisFormasPagamento[forma] += valorMensal;
    });

    // Preparar array de despesas mensais
    const despesas = meses.map((mes, index) => despesasMensais[index] || 0);
    const totalDespesas = despesas.reduce((acc: number, val: number) => acc + val, 0);

    // Preparar dados para o gráfico de linha
    const grafico = meses.map((mes, index) => ({
      name: mes,
      vendas: totaisMensais[index] || 0,
    }));

    return { tabela, grafico, totais: totaisFormasPagamento, despesas, totalDespesas };
  }, [relatorioAnual]);

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <AppLayout>
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          Dashboard
        </Link>
        <Typography color="text.primary">Relatórios</Typography>
      </Breadcrumbs>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabAtiva} onChange={(e, newValue) => setTabAtiva(newValue)} sx={{ '& .MuiTab-root': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
          <Tab label={isMobile ? "Período" : "Relatório por Período"} />
          <Tab label={isMobile ? "Anual" : "Relatório Anual"} />
        </Tabs>
      </Box>

      {/* Conteúdo Tab 0 - Relatório por Período */}
      {tabAtiva === 0 && (
        <>
          {/* Filtros de Período */}
          <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Filtros Rápidos
                    </Typography>
                    <Chip
                      label="Apenas ENTRADA"
                      size="small"
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                    Período: {formatDateBR(dataInicio)} até {formatDateBR(dataFim)}
                  </Typography>
                </Box>
                <ButtonGroup variant="outlined" sx={{ mb: 2, flexWrap: 'wrap' }} size={isMobile ? "small" : "medium"}>
                  <Button
                    onClick={() => handleFiltroRapido('hoje')}
                    variant={filtroAtivo === 'hoje' ? 'contained' : 'outlined'}
                  >
                    Hoje
                  </Button>
                  <Button
                    onClick={() => handleFiltroRapido('7dias')}
                    variant={filtroAtivo === '7dias' ? 'contained' : 'outlined'}
                  >
                    {isMobile ? '7d' : '7 dias'}
                  </Button>
                  <Button
                    onClick={() => handleFiltroRapido('30dias')}
                    variant={filtroAtivo === '30dias' ? 'contained' : 'outlined'}
                  >
                    {isMobile ? '30d' : '30 dias'}
                  </Button>
                  <Button
                    onClick={() => handleFiltroRapido('mes')}
                    variant={filtroAtivo === 'mes' ? 'contained' : 'outlined'}
                  >
                    {isMobile ? 'Mês' : 'Este mês'}
                  </Button>
                </ButtonGroup>
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data Inicial"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setFiltroAtivo('');
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data Final"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setFiltroAtivo('');
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handleImprimir}
                  >
                    Imprimir
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={handleExportarExcel}
                    disabled={!topProdutos || (topProdutos as any).length === 0}
                  >
                    Exportar CSV
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Cards de Estatísticas */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                title="Total de Vendas"
                value={formatCurrency(totalVendas)}
                icon={<TrendingUp sx={{ fontSize: { xs: 32, sm: 28 } }} />}
                color="#10b981"
                loading={loadingVendas}
              />
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                title="Total de Pedidos"
                value={totalPedidos}
                icon={<Assessment sx={{ fontSize: { xs: 32, sm: 28 } }} />}
                color="#0ea5e9"
                loading={loadingVendas}
              />
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                title="Itens Vendidos"
                value={totalItens}
                icon={<Star sx={{ fontSize: { xs: 32, sm: 28 } }} />}
                color="#8b5cf6"
                loading={loadingVendas}
              />
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                title="Ticket Médio"
                value={formatCurrency(ticketMedio)}
                icon={<Star sx={{ fontSize: { xs: 32, sm: 28 } }} />}
                color="#f59e0b"
                loading={loadingVendas}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Gráfico de Vendas por Período */}
            <Grid item xs={12} lg={8}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Vendas por Período
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Evolução das vendas no período selecionado
                </Typography>

                {loadingVendas ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : !vendasPeriodo || (vendasPeriodo as any).length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, color: 'text.secondary' }}>
                    <Typography>Nenhum dado encontrado no período selecionado</Typography>
                  </Box>
                ) : (
                  <Box sx={{ height: { xs: 250, sm: 300, md: 350 } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vendasPeriodo || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="data" tickFormatter={formatDateShort} stroke="#64748b" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Data: ${formatDateBR(label)}`}
                        />
                        <Bar dataKey="valor_total" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Vendas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Card>
            </Grid>

            {/* Gráfico de Pizza - Top Categorias */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Top Categorias
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Distribuição por categoria
                </Typography>

                {loadingProdutos ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : !dadosPizza || dadosPizza.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, color: 'text.secondary' }}>
                    <Typography>Sem dados de categoria</Typography>
                  </Box>
                ) : (
                  <Box sx={{ height: { xs: 250, sm: 300 } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosPizza}
                          cx="50%"
                          cy={isMobile ? "40%" : "50%"}
                          labelLine={false}
                          label={!isMobile ? ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)` : false}
                          outerRadius={isMobile ? 60 : 80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dadosPizza.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value as number)} />
                        <Legend
                          layout={isMobile ? "horizontal" : "vertical"}
                          align={isMobile ? "center" : "right"}
                          verticalAlign={isMobile ? "bottom" : "middle"}
                          wrapperStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Card>
            </Grid>

            {/* Tabela de Produtos Mais Vendidos */}
            <Grid item xs={12}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Produtos Mais Vendidos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Top 10 produtos no período selecionado
                </Typography>

                {loadingProdutos ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : !topProdutos || (topProdutos as any).length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, color: 'text.secondary' }}>
                    <Typography>Nenhum produto vendido no período</Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell width={50}>#</TableCell>
                          <TableCell>Produto</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Categoria</TableCell>
                          <TableCell align="right">Qtd. Vendida</TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Total Vendas</TableCell>
                          <TableCell align="right">Valor Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(topProdutos as any)?.map((produto: any, index: number) => (
                          <TableRow key={produto.produto_id} hover>
                            <TableCell>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: index < 3 ? 'primary.main' : 'background.default',
                                  color: index < 3 ? 'white' : 'text.primary',
                                  fontWeight: 'bold',
                                }}
                              >
                                {index + 1}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight={600}>{produto.produto_nome}</Typography>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{produto.categoria_nome || '-'}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600}>{produto.quantidade_vendida}</Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{produto.total_vendas}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold" color="success.main">
                                {formatCurrency(produto.valor_total)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Conteúdo Tab 1 - Relatório Anual */}
      {tabAtiva === 1 && (
        <>
          <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                  {isMobile ? `REL. MENSAL - ${anoSelecionado}` : 'RELATÓRIO MENSAL DE VENDAS DA LOJAS MANÚ'}
                </Typography>
                {!isMobile && (
                  <Typography variant="h6" color="text.secondary">
                    ANO: {anoSelecionado}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                  type="number"
                  label="Ano"
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
                  sx={{ width: 120 }}
                  size="small"
                />
                <Button
                  variant="contained"
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportarPDFAnual}
                  fullWidth={isMobile}
                  sx={{
                    bgcolor: '#d32f2f',
                    '&:hover': { bgcolor: '#b71c1c' }
                  }}
                >
                  {isMobile ? 'PDF' : 'Exportar PDF'}
                </Button>
              </Box>
            </Box>

            {loadingAnual ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : !relatorioAnual || (relatorioAnual as any)?.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, color: 'text.secondary' }}>
                <Typography variant="h6" gutterBottom>Nenhum dado encontrado</Typography>
                <Typography variant="body2">Não há registros de vendas ou saídas financeiras para o ano {anoSelecionado}</Typography>
                <Typography variant="caption" sx={{ mt: 2 }}>Verifique o console (F12) para mais detalhes</Typography>
              </Box>
            ) : (
              <>
                {/* Tabela Mensal */}
                <TableContainer sx={{
                  mb: 4,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    height: 8,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'primary.main',
                    borderRadius: 4,
                  }
                }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.main' }}>
                        <TableCell sx={{
                          fontWeight: 700,
                          border: '1px solid #ddd',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}>
                          TRANSAÇÕES
                        </TableCell>
                        {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].map((mes) => (
                          <TableCell
                            key={mes}
                            align="center"
                            sx={{
                              fontWeight: 700,
                              border: '1px solid #ddd',
                              color: 'white',
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              minWidth: { xs: 60, sm: 70 },
                              px: { xs: 0.5, sm: 1 }
                            }}
                          >
                            {mes}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(dadosAnuais.tabela).map(([forma, valores]: [string, any], rowIndex: number) => {
                        // Verificar se é uma linha de despesa (DÍZIMO ou outras saídas)
                        const ehDespesa = forma === 'DIZIMO' || forma.toUpperCase().includes('DESPESA');

                        return (
                          <TableRow
                            key={forma}
                            sx={{
                              bgcolor: ehDespesa
                                ? (rowIndex % 2 === 0 ? '#ffebee' : '#ffcdd2')
                                : (rowIndex % 2 === 0 ? 'white' : '#f9fafb'),
                              '&:hover': { bgcolor: ehDespesa ? '#ef9a9a' : '#f0f4ff' }
                            }}
                          >
                            <TableCell sx={{
                              fontWeight: 600,
                              border: '1px solid #e0e0e0',
                              fontSize: '0.813rem',
                              color: ehDespesa ? 'error.dark' : 'inherit'
                            }}>
                              {forma}
                            </TableCell>
                            {(valores as number[]).map((valor, index) => (
                              <TableCell
                                key={index}
                                align="right"
                                sx={{
                                  border: '1px solid #e0e0e0',
                                  fontSize: '0.75rem',
                                  color: valor > 0
                                    ? (ehDespesa ? 'error.dark' : 'success.main')
                                    : 'text.disabled',
                                  fontWeight: valor > 0 ? 600 : 400
                                }}
                              >
                                {valor > 0 ? formatCurrency(valor) : '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ bgcolor: 'primary.light' }}>
                        <TableCell sx={{
                          fontWeight: 700,
                          border: '1px solid #ddd',
                          fontSize: '0.875rem',
                          color: 'primary.dark'
                        }}>
                          TOTAL VENDAS
                        </TableCell>
                        {dadosAnuais.grafico.map((item: any, index: number) => (
                          <TableCell
                            key={index}
                            align="right"
                            sx={{
                              fontWeight: 700,
                              border: '1px solid #ddd',
                              fontSize: '0.813rem',
                              color: 'primary.dark'
                            }}
                          >
                            {item.vendas > 0 ? formatCurrency(item.vendas) : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow sx={{ bgcolor: 'error.light' }}>
                        <TableCell sx={{
                          fontWeight: 700,
                          border: '1px solid #ddd',
                          fontSize: '0.875rem',
                          color: 'error.dark'
                        }}>
                          SAÍDAS FINANCEIRAS
                        </TableCell>
                        {dadosAnuais.despesas.map((despesa: number, index: number) => (
                          <TableCell
                            key={index}
                            align="right"
                            sx={{
                              fontWeight: 700,
                              border: '1px solid #ddd',
                              fontSize: '0.813rem',
                              color: 'error.dark'
                            }}
                          >
                            {despesa > 0 ? formatCurrency(despesa) : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Resumo de Totais */}
                <Box sx={{ mb: 4, p: 3, bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 2, boxShadow: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: 'primary.main' }}>
                    TOTAL GERAL DAS TRANSAÇÕES
                  </Typography>
                  <Grid container spacing={2}>
                    {/* Separar vendas de despesas */}
                    {Object.entries(dadosAnuais.totais).map(([forma, total]: [string, any]) => {
                      const ehDespesa = forma === 'DIZIMO' || forma.toUpperCase().includes('DESPESA');

                      return (
                        <Grid item xs={6} sm={6} md={3} key={forma}>
                          <Card sx={{
                            p: 2,
                            bgcolor: ehDespesa ? '#ffebee' : 'white',
                            boxShadow: 1,
                            '&:hover': { boxShadow: 3 },
                            border: ehDespesa ? '2px solid #ef5350' : 'none'
                          }}>
                            <Typography variant="body2" sx={{
                              mb: 0.5,
                              fontWeight: 500,
                              color: ehDespesa ? 'error.dark' : 'text.secondary'
                            }}>
                              {forma}
                            </Typography>
                            <Typography variant="h6" sx={{
                              fontWeight: 700,
                              color: ehDespesa ? 'error.dark' : 'success.main'
                            }}>
                              {formatCurrency(total)}
                            </Typography>
                          </Card>
                        </Grid>
                      );
                    })}
                    <Grid item xs={6} sm={6} md={3}>
                      <Card sx={{ p: 2, bgcolor: 'primary.main', color: 'white', boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
                        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, opacity: 0.9 }}>
                          TOTAL VENDAS
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {formatCurrency(dadosAnuais.grafico.reduce((acc: number, item: any) => acc + item.vendas, 0))}
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={6} md={3}>
                      <Card sx={{ p: 2, bgcolor: 'error.main', color: 'white', boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
                        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, opacity: 0.9 }}>
                          SAÍDAS FINANCEIRAS
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {formatCurrency(dadosAnuais.totalDespesas)}
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

                {/* Gráfico de Linha */}
                <Card sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                    <TrendingUp sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      TOTAL VENDAS - Evolução Mensal
                    </Typography>
                  </Box>
                  <Box sx={{ height: { xs: 250, sm: 300, md: 350 }, bgcolor: '#fafafa', borderRadius: 1, p: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosAnuais.grafico}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          style={{ fontSize: isMobile ? '0.7rem' : '0.875rem', fontWeight: 600 }}
                        />
                        <YAxis
                          stroke="#64748b"
                          style={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '2px solid #1976d2',
                            borderRadius: 8,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            padding: '12px'
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                          labelFormatter={(label) => `Mês: ${label}`}
                          labelStyle={{ fontWeight: 700, color: '#1976d2' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="vendas"
                          stroke="#1976d2"
                          strokeWidth={4}
                          dot={{ fill: '#1976d2', r: 6, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 3 }}
                          name="Vendas"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </>
            )}
          </Card>
        </>
      )}
    </AppLayout>
  );
}
