'use client';
import { useRef, useState } from 'react';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Warning, Delete, Cancel, CheckCircle } from '@mui/icons-material';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: 'warning' | 'error' | 'info' | 'success';
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  severity = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  const bloqueio = useRef(false);
  const [processando, setProcessando] = useState(false);
  const ocupado = loading || processando;
  const confirmar = async () => {
    if (bloqueio.current || loading) return;
    bloqueio.current = true; setProcessando(true);
    try { await onConfirm(); } finally { bloqueio.current = false; setProcessando(false); }
  };
  const getIcon = () => {
    switch (severity) {
      case 'error':
        return <Delete sx={{ fontSize: 64, color: 'error.main' }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 64, color: 'warning.main' }} />;
      case 'success':
        return <CheckCircle sx={{ fontSize: 64, color: 'success.main' }} />;
      default:
        return <Warning sx={{ fontSize: 64, color: 'info.main' }} />;
    }
  };

  const getColor = () => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={ocupado ? undefined : onClose}
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
          {getIcon()}
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity={severity} sx={{ mt: 1 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {message}
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={ocupado}
          size="large"
        >
          {cancelText}
        </Button>
        <Button
          onClick={confirmar}
          variant="contained"
          color={getColor()}
          disabled={ocupado}
          size="large"
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
