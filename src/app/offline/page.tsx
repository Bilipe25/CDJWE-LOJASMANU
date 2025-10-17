'use client';

import { Box, Container, Typography, Button } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
    window.location.reload();
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <WifiOffIcon
          sx={{
            fontSize: 120,
            color: 'text.secondary',
            opacity: 0.5,
          }}
        />
        
        <Typography variant="h4" component="h1" gutterBottom>
          Você está offline
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Parece que você perdeu a conexão com a internet. 
          Algumas funcionalidades podem estar limitadas até que a conexão seja restabelecida.
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          size="large"
        >
          Tentar Novamente
        </Button>
      </Box>
    </Container>
  );
}
