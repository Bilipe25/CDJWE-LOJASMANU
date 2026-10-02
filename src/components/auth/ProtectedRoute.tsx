'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { motion } from 'framer-motion';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, authError, retryAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !authError) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, authError, router]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <CircularProgress size={50} />
        </motion.div>
        <Typography variant="body1" color="text.secondary">
          Carregando...
        </Typography>
      </Box>
    );
  }

  if (authError) return <Box sx={{ maxWidth: 560, mx: 'auto', p: 3, mt: 8 }}>
    <Typography component="h1" variant="h5" gutterBottom>Serviço indisponível</Typography>
    <Alert severity="error">{authError} O rascunho do PDV permanece neste dispositivo.</Alert>
    <Button variant="contained" sx={{ mt: 2 }} onClick={retryAuth}>Tentar novamente</Button>
  </Box>;

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
