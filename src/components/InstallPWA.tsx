'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Snackbar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GetAppIcon from '@mui/icons-material/GetApp';
import { registrarPWA } from '@/lib/pwa/registro';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function wasDismissed() {
  try { return sessionStorage.getItem('pwa-install-dismissed') === 'true'; } catch { return false; }
}
function rememberDismissal() {
  try { sessionStorage.setItem('pwa-install-dismissed', 'true'); } catch { /* Storage may be unavailable. */ }
}

export function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installVisible, setInstallVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const updateRequested = useRef(false);
  const installHintTimer = useRef<number | null>(null);
  const installAvailable = useRef(false);

  useEffect(() => {
    const scheduleInstallHint = () => {
      if (wasDismissed() || !installAvailable.current) return;
      window.clearTimeout(installHintTimer.current ?? undefined);
      installHintTimer.current = window.setTimeout(() => {
        installHintTimer.current = null;
        setInstallVisible(true);
      }, 20000);
    };
    const installed = () => {
      installAvailable.current = false;
      window.clearTimeout(installHintTimer.current ?? undefined);
      setPrompt(null); setInstallVisible(false); setInstructions(false);
    };
    const beforeInstall = (event: Event) => {
      if (isStandalone()) return;
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
      installAvailable.current = true;
      scheduleInstallHint();
    };
    const activity = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-pwa-install-notice]')) return;
      if (installHintTimer.current === null) setInstallVisible(false);
      scheduleInstallHint();
    };
    // iPadOS can identify itself as a Mac. Only Safari uses this manual installation flow.
    const appleDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    if (appleDevice && safari && !isStandalone() && !wasDismissed()) {
      setIos(true); installAvailable.current = true; scheduleInstallHint();
    }
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    document.addEventListener('pointerdown', activity, { passive: true });
    document.addEventListener('keydown', activity);
    const changed = () => {
      if (updateRequested.current) window.location.reload();
    };
    navigator.serviceWorker?.addEventListener('controllerchange', changed);
    const dispose = process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext
      ? registrarPWA(setUpdate) : undefined;
    return () => {
      dispose?.();
      window.clearTimeout(installHintTimer.current ?? undefined);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      document.removeEventListener('pointerdown', activity);
      document.removeEventListener('keydown', activity);
      navigator.serviceWorker?.removeEventListener('controllerchange', changed);
    };
  }, []);

  const closeInstall = () => {
    window.clearTimeout(installHintTimer.current ?? undefined);
    setInstallVisible(false);
    rememberDismissal();
  };
  const install = async () => {
    if (ios && !prompt) { setInstructions(true); return; }
    if (!prompt || installing) return;
    setInstalling(true); setError('');
    try {
      await prompt.prompt();
      await prompt.userChoice;
      closeInstall();
    } catch { setError('Não foi possível abrir a instalação. Tente pelo menu do navegador.'); }
    finally { setPrompt(null); setInstalling(false); }
  };
  const applyUpdate = () => {
    if (!update?.waiting) { setUpdate(null); setConfirmUpdate(false); return; }
    updateRequested.current = true;
    setUpdating(true); setConfirmUpdate(false);
    update.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  return <>
    <Snackbar open={!!update || (installVisible && (!!prompt || ios))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ top: { xs: 72, sm: 80 }, maxWidth: 620 }}>
      <Alert data-pwa-install-notice severity="info" variant="filled" action={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {update ? <Button color="inherit" size="small" disabled={updating} onClick={() => setConfirmUpdate(true)}>{updating ? 'Atualizando…' : 'Atualizar'}</Button> : <>
          <Button color="inherit" size="small" startIcon={<GetAppIcon />} disabled={installing} onClick={() => { void install(); }}>{installing ? 'Aguarde…' : 'Instalar'}</Button>
          <IconButton size="small" color="inherit" aria-label="Dispensar sugestão de instalação" onClick={closeInstall}><CloseIcon fontSize="small" /></IconButton>
        </>}
      </Box>}>
        {update ? 'Uma nova versão está disponível.' : 'PDV Manu: acesso direto pelo seu dispositivo.'}
      </Alert>
    </Snackbar>
    <Snackbar open={!!error} autoHideDuration={8000} onClose={() => setError('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
    </Snackbar>
    <Dialog open={instructions} onClose={() => setInstructions(false)} aria-labelledby="pwa-install-title">
      <DialogTitle id="pwa-install-title">Instalar PDV Manu</DialogTitle>
      <DialogContent><DialogContentText>No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Confirme o nome e toque em Adicionar.</DialogContentText></DialogContent>
      <DialogActions><Button onClick={() => { setInstructions(false); closeInstall(); }}>Entendi</Button></DialogActions>
    </Dialog>
    <Dialog open={confirmUpdate} onClose={() => setConfirmUpdate(false)} aria-labelledby="pwa-update-title">
      <DialogTitle id="pwa-update-title">Atualizar o aplicativo?</DialogTitle>
      <DialogContent><DialogContentText>Esta aba será recarregada. Conclua ou salve o atendimento e os formulários abertos antes de continuar. A atualização também passará a atender as outras abas deste sistema.</DialogContentText></DialogContent>
      <DialogActions><Button onClick={() => setConfirmUpdate(false)}>Continuar atendimento</Button><Button variant="contained" onClick={applyUpdate}>Atualizar agora</Button></DialogActions>
    </Dialog>
  </>;
}
