'use client';

import { Grid, Card, CardContent, Box, Typography, CircularProgress, Chip, Table, TableBody, TableCell, TableHead, TableRow, Avatar } from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  People,
  ShoppingCart,
  Receipt,
  AttachMoney,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { trpc } from '@/lib/trpc/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateBR } from '@/lib/utils/dateUtils';

export default function HomePage() {
  const router = useRouter();
  const { data: dashboard, isLoading } = trpc.relatorios.dashboard.useQuery({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Processar dados de vendas da semana
  const chartData = [];
  if (dashboard?.vendasSemana) {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoje = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(hoje.getDate() - i);
      
      // Garantir formato correto da data
      const year = data.getFullYear();
      const month = String(data.getMonth() + 1).padStart(2, '0');
      const day = String(data.getDate()).padStart(2, '0');
      const dataStr = `${year}-${month}-${day}`;
      
      const diaSemana = diasSemana[data.getDay()];
      
      chartData.push({
        name: `${diaSemana} ${data.getDate()}`,
        vendas: dashboard.vendasSemana[dataStr] || 0,
      });
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo! Hoje é ${format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} | Vendas = apenas pedidos do tipo ENTRADA`}
      />

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vendas Hoje"
            value={formatCurrency(dashboard?.vendasHoje || 0)}
            icon={<AttachMoney sx={{ fontSize: 28 }} />}
            color="#10b981"
            loading={isLoading}
            trend={{ value: 12.5, isPositive: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vendas do Mês"
            value={formatCurrency(dashboard?.vendasMes || 0)}
            icon={<TrendingUp sx={{ fontSize: 28 }} />}
            color="#0ea5e9"
            loading={isLoading}
            trend={{ value: 8.2, isPositive: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pedidos Pendentes"
            value={dashboard?.pedidosPendentes || 0}
            icon={<Receipt sx={{ fontSize: 28 }} />}
            color="#f59e0b"
            loading={isLoading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Clientes"
            value={dashboard?.totalClientes || 0}
            icon={<People sx={{ fontSize: 28 }} />}
            color="#8b5cf6"
            loading={isLoading}
            trend={{ value: 3.1, isPositive: true }}
          />
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Gráfico de Vendas da Semana */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Vendas da Semana
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Performance de vendas dos últimos 7 dias
              </Typography>

              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="vendas" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Ações Rápidas */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Ações Rápidas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Acesse rapidamente as principais funções
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Card
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => router.push('/pdv')}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                    <ShoppingCart />
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        Novo Pedido
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Iniciar uma nova venda
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    bgcolor: 'success.main',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => router.push('/clientes')}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                    <People />
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        Cadastrar Cliente
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Adicionar novo cliente
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    bgcolor: 'warning.main',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => router.push('/produtos')}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                    <Receipt />
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        Cadastrar Produto
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Adicionar novo produto
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Últimos Pedidos */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Últimos Pedidos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Pedidos mais recentes do sistema
              </Typography>

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : dashboard?.ultimosPedidos && dashboard.ultimosPedidos.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Pedido</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Data</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboard.ultimosPedidos.map((pedido: any) => (
                      <TableRow 
                        key={pedido.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/pedidos?id=${pedido.id}`)}
                      >
                        <TableCell>
                          <Chip 
                            label={`#${pedido.numero}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>{pedido.cliente_nome || 'Sem cliente'}</TableCell>
                        <TableCell>
                          {formatDateBR(pedido.data)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pedido.status}
                            size="small"
                            color={
                              pedido.status === 'FINALIZADO' ? 'success' :
                              pedido.status === 'PENDENTE' ? 'warning' :
                              pedido.status === 'CANCELADO' ? 'error' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(pedido.total || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  Nenhum pedido encontrado
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Produtos */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Produtos Mais Vendidos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Top 5 produtos com mais saídas
              </Typography>

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : dashboard?.topProdutos && dashboard.topProdutos.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dashboard.topProdutos.map((produto: any, index: number) => (
                    <Card 
                      key={produto.produto_id}
                      sx={{ 
                        bgcolor: 'grey.50',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: 2,
                        },
                      }}
                      onClick={() => router.push('/produtos')}
                    >
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: index === 0 ? 'warning.main' : 
                                     index === 1 ? 'grey.400' : 
                                     index === 2 ? 'orange.300' : 'primary.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {index + 1}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="600">
                            {produto.produto_nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {produto.categoria_nome || 'Sem categoria'}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" fontWeight="bold" color="primary.main">
                            {produto.quantidade_vendida}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            vendidos
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  Nenhum produto vendido ainda
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AppLayout>
  );
}
