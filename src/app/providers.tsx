'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { trpc, trpcClient } from '@/lib/trpc/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ptBR } from '@mui/material/locale';
import { Toaster } from 'react-hot-toast';
import { InstallPWA } from '@/components/InstallPWA';

const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#0ea5e9', // Sky blue 500
        light: '#38bdf8', // Sky blue 400
        dark: '#0369a1', // Sky blue 700
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#0284c7', // Sky blue 600
        light: '#0ea5e9', // Sky blue 500
        dark: '#075985', // Sky blue 800
        contrastText: '#ffffff',
      },
      success: {
        main: '#10b981', // Emerald 500
        light: '#34d399',
        dark: '#059669',
      },
      error: {
        main: '#ef4444', // Red 500
        light: '#f87171',
        dark: '#dc2626',
      },
      warning: {
        main: '#f59e0b', // Amber 500
        light: '#fbbf24',
        dark: '#d97706',
      },
      info: {
        main: '#3b82f6', // Blue 500
        light: '#60a5fa',
        dark: '#2563eb',
      },
      background: {
        default: '#f8fafc', // Slate 50
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a', // Slate 900
        secondary: '#475569', // Slate 600
      },
      divider: '#e2e8f0', // Slate 200
    },
    typography: {
      fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.3,
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      button: {
        fontWeight: 600,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
            padding: '10px 24px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
          },
          contained: {
            '&:hover': {
              transform: 'translateY(-1px)',
              transition: 'all 0.2s ease',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0ea5e9',
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          },
        },
      },
    },
  },
  ptBR
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            gcTime: 5 * 60 * 1000, // 5 minutos (anteriormente cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
          <InstallPWA />
          <ReactQueryDevtools initialIsOpen={false} />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                padding: '16px',
                fontSize: '14px',
                fontWeight: 500,
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#0ea5e9',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
