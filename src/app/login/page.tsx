'use client';

import { useState, useEffect } from 'react';
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
  Container,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  LoginOutlined,
  CheckCircleOutline,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';
import { useAuth } from '@/contexts/AuthContext';
import { getVersiculoDoDia } from '@/data/versiculos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FormatQuote } from '@mui/icons-material';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { configuracoes, nomeEmpresa, logoUrl, corPrimaria } = useConfiguracoes();
  const { login, isAuthenticated } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  const versiculoDoDia = getVersiculoDoDia();
  const dataAtual = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Animação de carregamento inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Redirecionar se já estiver autenticado (mas não durante o login)
  useEffect(() => {
    if (isAuthenticated && !loginSuccess && !loading) {
      router.push('/');
    }
  }, [isAuthenticated, loginSuccess, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);

    // Usar o contexto de autenticação
    const success = await login(username, password);
    
    if (success) {
      setLoginSuccess(true);
      // Aguardar animação antes de redirecionar (mais tempo)
      setTimeout(() => {
        router.push('/');
      }, 3500);
    } else {
      setError('Usuário ou senha incorretos');
      setLoading(false);
    }
  };

  // Tela de carregamento inicial
  if (pageLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${corPrimaria || '#0ea5e9'}15 0%, ${corPrimaria || '#0ea5e9'}05 100%)`,
          gap: 3,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
        >
          {logoUrl ? (
            <Box
              sx={{
                position: 'relative',
                width: 150,
                height: 150,
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: `0 8px 32px ${corPrimaria || '#0ea5e9'}40`,
              }}
            >
              <Image
                src={logoUrl}
                alt={nomeEmpresa}
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: 150,
                height: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                background: `linear-gradient(135deg, ${corPrimaria || '#0ea5e9'} 0%, ${corPrimaria || '#0ea5e9'}80 100%)`,
                boxShadow: `0 8px 32px ${corPrimaria || '#0ea5e9'}40`,
              }}
            >
              <Typography
                variant="h1"
                sx={{
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '4rem',
                }}
              >
                {nomeEmpresa.charAt(0)}
              </Typography>
            </Box>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: corPrimaria || '#0ea5e9',
              textAlign: 'center',
            }}
          >
            {nomeEmpresa}
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <CircularProgress
            size={40}
            sx={{
              color: corPrimaria || '#0ea5e9',
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            Carregando...
          </Typography>
        </motion.div>
      </Box>
    );
  }

  // Tela de sucesso após login
  if (loginSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${corPrimaria || '#0ea5e9'}20 0%, ${corPrimaria || '#0ea5e9'}10 100%)`,
            gap: 3,
          }}
        >
          {/* Ícone de Sucesso */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 20,
              delay: 0.2,
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: `linear-gradient(135deg, #10b981 0%, #059669 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.5,
                  type: 'spring',
                  stiffness: 200,
                }}
              >
                <CheckCircleOutline sx={{ fontSize: 80, color: 'white' }} />
              </motion.div>
            </Box>
          </motion.div>

          {/* Mensagem Principal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#10b981',
                textAlign: 'center',
                fontSize: { xs: '1.75rem', sm: '2.125rem' },
              }}
            >
              Login realizado com sucesso!
            </Typography>
          </motion.div>

          {/* Saudação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6, ease: 'easeOut' }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              Bem-vindo(a), {username}!
            </Typography>
          </motion.div>

          {/* Mensagem de Redirecionamento */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 2 }}>
              <CircularProgress
                size={20}
                sx={{
                  color: corPrimaria || '#0ea5e9',
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  textAlign: 'center',
                }}
              >
                Redirecionando para o sistema...
              </Typography>
            </Box>
          </motion.div>

          {/* Efeito de Fade Out antes de redirecionar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ delay: 2.5, duration: 1, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'white',
              pointerEvents: 'none',
            }}
          />
        </Box>
      </motion.div>
    );
  }

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
      {/* Background decorativo animado */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1 }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${corPrimaria || '#0ea5e9'}40 0%, transparent 70%)`,
          }}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${corPrimaria || '#0ea5e9'}30 0%, transparent 70%)`,
          }}
        />
      </motion.div>

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
            {logoUrl ? (
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
                    style={{ objectFit: 'contain', padding: '10px' }}
                    priority
                  />
                </Box>
              </motion.div>
            ) : (
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
                    width: 140,
                    height: 140,
                    marginBottom: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${corPrimaria || '#0ea5e9'} 0%, ${corPrimaria || '#0ea5e9'}90 100%)`,
                    boxShadow: `0 8px 32px ${corPrimaria || '#0ea5e9'}50`,
                    border: `3px solid ${corPrimaria || '#0ea5e9'}30`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: `0 12px 48px ${corPrimaria || '#0ea5e9'}60`,
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    sx={{
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '4.5rem',
                    }}
                  >
                    {nomeEmpresa.charAt(0)}
                  </Typography>
                </Box>
              </motion.div>
            )}

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
                    "{versiculoDoDia.texto}"
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: corPrimaria || '#0ea5e9',
                      fontSize: '0.8125rem',
                    }}
                  >
                    — {versiculoDoDia.referencia}
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
                  {logoUrl ? (
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
                          style={{ objectFit: 'contain' }}
                          priority
                        />
                      </Box>
                    </motion.div>
                  ) : (
                    <Box
                      sx={{
                        width: { xs: 120, sm: 140 },
                        height: { xs: 120, sm: 140 },
                        marginBottom: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${corPrimaria || '#0ea5e9'} 0%, ${corPrimaria || '#0ea5e9'}80 100%)`,
                        boxShadow: `0 4px 20px ${corPrimaria || '#0ea5e9'}40`,
                      }}
                    >
                      <Typography
                        variant="h2"
                        sx={{
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: { xs: '2.5rem', sm: '3rem' },
                        }}
                      >
                        {nomeEmpresa.charAt(0)}
                      </Typography>
                    </Box>
                  )}

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
              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    variant="outlined"
                    disabled={loading}
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
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="outlined"
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: corPrimaria || '#0ea5e9' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={loading}
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
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                          {error}
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                  >
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <LoginOutlined />}
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
                      {loading ? 'Entrando...' : 'Entrar'}
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
                  © {new Date().getFullYear()} {nomeEmpresa}. Todos os direitos reservados.
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
