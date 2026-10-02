'use client';

import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

// A mesma hierarquia nas consultas e no atendimento, sem alterar outras páginas.
export const operationalSurface: SxProps<Theme> = {
  border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px',
  '&:hover': { boxShadow: 'none' },
};

export const operationalTable: SxProps<Theme> = {
  '& th': { bgcolor: 'background.default', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' },
  '& td, & th': { px: { xs: 1, sm: 2 }, py: 1.25 },
  '& td': { fontVariantNumeric: 'tabular-nums' },
};

export function OperationalHeader({ description, actions }: { description: string; actions?: ReactNode }) {
  return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
    <Typography variant="body2" color="text.secondary">{description}</Typography>
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>
  </Box>;
}

export function OperationalSummary({ label, items, variant = 'inline' }: { label: string; items: { label: string; value: ReactNode }[]; variant?: 'inline' | 'cards' }) {
  if (variant === 'cards') {
    return <Box aria-label={label} sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
      {items.map(item => <Box key={item.label} sx={{ ...operationalSurface, bgcolor: 'background.paper', minWidth: 0, px: 1.75, py: 1.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, minHeight: '2.7em' }}>{item.label}</Typography>
        <Typography component="div" variant="h6" sx={{ color: 'primary.dark', fontWeight: 700, lineHeight: 1.25, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{item.value}</Typography>
      </Box>)}
    </Box>;
  }

  return <Box aria-label={label} sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap', mb: 2, py: 1 }}>
    {items.map(item => <Typography key={item.label} variant="body2" color="text.secondary">
      {item.label}: <Box component="strong" sx={{ color: 'text.primary', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.value}</Box>
    </Typography>)}
  </Box>;
}
