'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Divider,
} from '@mui/material';
import { Print, Download, Close, Receipt } from '@mui/icons-material';

interface PrintConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  onDownload: () => void;
  title: string;
  subtitle?: string;
}

export default function PrintConfirmDialog({
  open,
  onClose,
  onPrint,
  onDownload,
  title,
  subtitle,
}: PrintConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Receipt sx={{ fontSize: 48, color: 'primary.main' }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Escolha como deseja obter o documento:
        </Typography>

        {/* Opção Imprimir */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            border: '2px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'primary.50',
              transform: 'translateY(-2px)',
              boxShadow: 2,
            },
          }}
          onClick={onPrint}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Print sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Imprimir Diretamente
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Abre a janela de impressão do navegador
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Opção Baixar */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '2px solid',
            borderColor: 'grey.300',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'grey.50',
              borderColor: 'grey.400',
              transform: 'translateY(-2px)',
              boxShadow: 2,
            },
          }}
          onClick={onDownload}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'grey.700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Baixar PDF
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Salva o arquivo no seu computador
              </Typography>
            </Box>
          </Box>
        </Paper>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="outlined" startIcon={<Close />} size="large">
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
