'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  LoginOutlined,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { getVersiculoDoDia } from '@/data/versiculos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FormatQuote } from '@mui/icons-material';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  // The public sign-in page must not depend on authenticated company settings.
  const nomeEmpresa = 'Lojas Manu';
  const logoUrl = '/icon-512x512.png';
  const corPrimaria = '#0369a1';
  const { login, isAuthenticated, isLoading: verificandoSessao, authError, retryAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [falhaLogin, setFalhaLogin] = useState(false);
  const [hoje, setHoje] = useState<Date | null>(null);
  const enviando = useRef(false);
  const redirecionado = useRef(false);

  // Date-dependent content is calculated after hydration in the device's local calendar.
  useEffect(() => { setHoje(new Date()); }, []);
  const versiculoDoDia = hoje ? getVersiculoDoDia(hoje) : null;
  const dataAtual = hoje ? format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';
  const mensagemErro = error || authError || (falhaLogin ? 'Não foi possível entrar. Confira email, senha e acesso ao PDV.' : '');
  const ocupado = loading || verificandoSessao;

  useEffect(() => {
    if (isAuthenticated && !authError && !ocupado && !enviando.current && !redirecionado.current) {
      redirecionado.current = true;
      router.replace('/');
    }
  }, [isAuthenticated, authError, ocupado, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando.current || ocupado || redirecionado.current) return;
    setError(''); setFalhaLogin(false);
    const email = username.trim();
    if (!email || !password) { setError('Preencha o email e a senha para entrar.'); return; }
    enviando.current = true; setLoading(true);
    try {
      if (await login(email, password)) {
        redirecionado.current = true;
        router.replace('/');
      } else { setFalhaLogin(true); }
    } catch {
      setError('Não foi possível conectar ao serviço. Reconecte e tente novamente.');
    } finally {
      enviando.current = false; setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${corPrimaria || '#0ea5e9'}15 0%, ${corPrimaria || '#0ea5e9'}05 100%)`,
        position: 'relative',
        overflow: 'hidden',
        padding: 2,
      }}
    >
      {/* Container Principal Centralizado */}
      <Box
        sx={{
          display: 'flex',
          maxWidth: 1200,
          width: '100%',
          gap: { md: 3, lg: 4 },
          position: 'relative',
          zIndex: 1,
          alignItems: 'center',
        }}
      >
        {/* Painel Esquerdo - Boas-vindas (Desktop) */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            padding: { md: 3, lg: 4 },
          }}
        >
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Box sx={{ maxWidth: 500 }}>
            {/* Logo em destaque */}
            <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: 140,
                    height: 140,
                    marginBottom: 3,
                    borderRadius: 4,
                    overflow: 'hidden',
                    boxShadow: `0 8px 32px ${corPrimaria || '#0ea5e9'}50`,
                    border: `3px solid ${corPrimaria || '#0ea5e9'}20`,
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: `0 12px 48px ${corPrimaria || '#0ea5e9'}60`,
                    },
                  }}
                >
                  <Image
                    src={logoUrl}
                    alt={nomeEmpresa}
                    fill
                    sizes="140px"
                    unoptimized
                    style={{ objectFit: 'contain', padding: '10px' }}
                    priority
                  />
                </Box>
              </motion.div>

            {/* Saudação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  color: corPrimaria || '#0ea5e9',
                  marginBottom: 1.5,
                  fontSize: { xs: '2.5rem', md: '3rem' },
                  lineHeight: 1.2,
                }}
              >
                Seja Bem-Vindo!
              </Typography>
            </motion.div>

            {/* Data discreta */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  marginBottom: 3,
                  opacity: 0.7,
                  textTransform: 'capitalize',
                  fontSize: '0.875rem',
                }}
              >
                {dataAtual}
              </Typography>
            </motion.div>

            {/* Versículo do dia */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Card
                elevation={0}
                sx={{
                  padding: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${corPrimaria || '#0ea5e9'}20`,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {/* Ícone de aspas */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    left: 20,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${corPrimaria || '#0ea5e9'} 0%, ${corPrimaria || '#0ea5e9'}80 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px ${corPrimaria || '#0ea5e9'}40`,
                  }}
                >
                  <FormatQuote sx={{ color: 'white', fontSize: 24 }} />
                </Box>

                <Box sx={{ marginTop: 1.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: corPrimaria || '#0ea5e9',
                      marginBottom: 1.5,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Versículo do Dia
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 500,
                      color: 'text.primary',
                      marginBottom: 1.5,
                      lineHeight: 1.6,
                      fontSize: '1rem',
                      fontStyle: 'italic',
                    }}
                  >
                    &quot;{versiculoDoDia?.texto}&quot;
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: corPrimaria || '#0ea5e9',
                      fontSize: '0.8125rem',
                    }}
                  >
                    — {versiculoDoDia?.referencia}
                  </Typography>
                </Box>
              </Card>
            </motion.div>

            {/* Mensagem adicional */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  marginTop: 3,
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                }}
              >
                Acesse o sistema com suas credenciais para começar a trabalhar.
              </Typography>
            </motion.div>
          </Box>
        </motion.div>
      </Box>

        {/* Painel Direito - Formulário de Login */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: { xs: 'none', md: '0 0 auto' },
            width: { xs: '100%', md: 500, lg: 520 },
            padding: { xs: 0, md: 2 },
          }}
        >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Card
            elevation={8}
            sx={{
              padding: { xs: 3, sm: 4, md: 4 },
              borderRadius: 4,
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              width: '100%',
            }}
          >
            {/* Logo e Nome da Empresa - Apenas Mobile */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: 0.2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: { xs: 120, sm: 140 },
                          height: { xs: 120, sm: 140 },
                          marginBottom: 3,
                          borderRadius: 3,
                          overflow: 'hidden',
                          boxShadow: `0 4px 20px ${corPrimaria || '#0ea5e9'}40`,
                        }}
                      >
                        <Image
                          src={logoUrl}
                          alt={nomeEmpresa}
                          fill
                          sizes="140px"
                          unoptimized
                          style={{ objectFit: 'contain' }}
                          priority
                        />
                      </Box>
                    </motion.div>

                  <Typography
                    variant="h5"
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      color: corPrimaria || '#0ea5e9',
                      marginBottom: 1,
                      textAlign: 'center',
                    }}
                  >
                    {nomeEmpresa}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      textAlign: 'center',
                      fontWeight: 500,
                    }}
                  >
                    Sistema de Ponto de Venda
                  </Typography>
                </Box>
              </motion.div>
            </Box>

            {/* Título do formulário - Desktop */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    marginBottom: 1,
                    textAlign: 'center',
                  }}
                >
                  Fazer Login
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    textAlign: 'center',
                    marginBottom: 4,
                  }}
                >
                  Digite suas credenciais para acessar o sistema
                </Typography>
              </motion.div>
            </Box>

            {/* Formulário de Login */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <form onSubmit={handleSubmit} aria-busy={ocupado}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Email"
                    id="login-email"
                    name="email"
                    required
                    inputProps={{ inputMode: 'email', autoCapitalize: 'none', spellCheck: false, maxLength: 254 }}
                    type="email"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); setFalhaLogin(false); }}
                    variant="outlined"
                    disabled={ocupado}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: corPrimaria || '#0ea5e9' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: corPrimaria || '#0ea5e9',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: corPrimaria || '#0ea5e9',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: corPrimaria || '#0ea5e9',
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Senha"
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); setFalhaLogin(false); }}
                    variant="outlined"
                    disabled={ocupado}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: corPrimaria || '#0ea5e9' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            aria-pressed={showPassword}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setShowPassword(value => !value)}
                            edge="end"
                            disabled={ocupado}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: corPrimaria || '#0ea5e9',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: corPrimaria || '#0ea5e9',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: corPrimaria || '#0ea5e9',
                      },
                    }}
                  />

                  <AnimatePresence mode="wait">
                    {mensagemErro && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert severity="error" sx={{ borderRadius: 2 }} action={authError ? <Button color="inherit" size="small" disabled={ocupado} onClick={() => { setError(''); setFalhaLogin(false); retryAuth(); }}>Verificar sessão</Button> : undefined}>
                          {mensagemErro}
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    whileHover={{ scale: ocupado ? 1 : 1.02 }}
                    whileTap={{ scale: ocupado ? 1 : 0.98 }}
                  >
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={ocupado}
                      startIcon={ocupado ? <CircularProgress size={20} color="inherit" aria-label={loading ? 'Entrando' : 'Verificando sessão'} /> : <LoginOutlined />}
                      sx={{
                        padding: '14px',
                        borderRadius: 2,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        backgroundColor: corPrimaria || '#0ea5e9',
                        boxShadow: `0 4px 14px ${corPrimaria || '#0ea5e9'}40`,
                        '&:hover': {
                          backgroundColor: corPrimaria || '#0284c7',
                          boxShadow: `0 6px 20px ${corPrimaria || '#0ea5e9'}50`,
                        },
                        '&:disabled': {
                          backgroundColor: '#e0e0e0',
                        },
                      }}
                    >
                      {loading ? 'Entrando...' : verificandoSessao ? 'Verificando sessão…' : 'Entrar'}
                    </Button>
                  </motion.div>
                </Box>
              </form>
            </motion.div>

            {/* Informação adicional */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <Box sx={{ marginTop: 4, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  © {hoje?.getFullYear()} {nomeEmpresa}. Todos os direitos reservados.
                </Typography>
              </Box>
            </motion.div>
          </Card>
        </motion.div>
        </Box>
      </Box>
    </Box>
  );
}
