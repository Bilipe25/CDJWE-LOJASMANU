'use client';

import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';

export default function WelcomeAnimation() {
  const [show, setShow] = useState(false);
  const { username } = useAuth();
  const { nomeEmpresa, corPrimaria } = useConfiguracoes();

  useEffect(() => {
    // Verificar se acabou de fazer login
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    
    if (justLoggedIn === 'true') {
      setShow(true);
      sessionStorage.removeItem('justLoggedIn');
      
      // Ocultar após 3 segundos
      const timer = setTimeout(() => {
        setShow(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              height: '100vh',
              width: '100vw',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${corPrimaria || '#0ea5e9'}90 0%, ${corPrimaria || '#0ea5e9'}70 100%)`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
              }}
            >
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  marginBottom: 3,
                }}
              >
                <Typography
                  variant="h2"
                  sx={{
                    color: corPrimaria || '#0ea5e9',
                    fontWeight: 'bold',
                  }}
                >
                  👋
                </Typography>
              </Box>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Typography
                variant="h3"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  textAlign: 'center',
                  marginBottom: 1,
                  fontSize: { xs: '2rem', sm: '3rem' },
                }}
              >
                Bem-vindo(a)!
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.95)',
                  textAlign: 'center',
                  fontWeight: 500,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                }}
              >
                {username}
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  marginTop: 2,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                {nomeEmpresa} - Sistema PDV
              </Typography>
            </motion.div>

            {/* Partículas decorativas */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: [0, Math.random() * 200 - 100],
                  y: [0, Math.random() * 200 - 100],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
                style={{
                  position: 'absolute',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'white',
                }}
              />
            ))}
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
