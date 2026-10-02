export function registrarPWA(onUpdate: (registration: ServiceWorkerRegistration) => void) {
  let disposed = false;
  let registration: ServiceWorkerRegistration | undefined;
  let installing: ServiceWorker | null = null;
  let lastCheck = 0;
  const notify = () => {
    if (!disposed && registration?.waiting && navigator.serviceWorker.controller) onUpdate(registration);
  };
  const onState = () => { if (installing?.state === 'installed') notify(); };
  const onFound = () => {
    installing?.removeEventListener('statechange', onState);
    installing = registration?.installing ?? null;
    installing?.addEventListener('statechange', onState);
  };
  const check = () => {
    if (!disposed && registration && navigator.onLine && Date.now() - lastCheck > 60_000) {
      lastCheck = Date.now();
      void registration.update().catch(() => { /* Retry on the next focus/reconnection. */ });
    }
  };
  void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(value => {
    if (disposed) return;
    registration = value;
    registration.addEventListener('updatefound', onFound);
    onFound(); notify();
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    check();
  }).catch(error => {
    if (!disposed) console.warn('Não foi possível registrar o PWA:', error);
  });
  return () => {
    disposed = true;
    registration?.removeEventListener('updatefound', onFound);
    installing?.removeEventListener('statechange', onState);
    window.removeEventListener('focus', check);
    window.removeEventListener('online', check);
  };
}
