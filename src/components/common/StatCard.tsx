'use client';

import { Card, CardContent, Box, Typography, CircularProgress } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  loading?: boolean;
}

export default function StatCard({ title, value, icon, trend, color = '#0ea5e9', loading }: StatCardProps) {
  return (
    <Card
      component={motion.div}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: color,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}15`,
              color: color,
            }}
          >
            {icon}
          </Box>

          {trend && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: trend.isPositive ? 'success.light' : 'error.light',
                color: trend.isPositive ? 'success.dark' : 'error.dark',
              }}
            >
              {trend.isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
              <Typography variant="caption" fontWeight="bold">
                {Math.abs(trend.value)}%
              </Typography>
            </Box>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', height: 40 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary' }}>
            {value}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
