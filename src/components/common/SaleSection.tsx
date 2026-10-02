'use client';

import type { ReactNode } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

export default function SaleSection({ compact, expanded, onChange, title, children }: {
  compact: boolean;
  expanded: boolean;
  onChange: (expanded: boolean) => void;
  title: ReactNode;
  children: ReactNode;
}) {
  if (compact) return <Accordion expanded={expanded} onChange={(_, open) => onChange(open)} disableGutters>
    <AccordionSummary expandIcon={<ExpandMore />}>{title}</AccordionSummary>
    <AccordionDetails>{children}</AccordionDetails>
  </Accordion>;

  return <Box component="section" sx={{ pb: 1.5, mb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ mb: 1.5 }}>{title}</Box>{children}
  </Box>;
}
