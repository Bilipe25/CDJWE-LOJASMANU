'use client';

import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.light',
          color: 'primary.main',
          mb: 3,
          '& > *': {
            fontSize: 60,
          },
        }}
      >
        {icon}
      </Box>

      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
        {description}
      </Typography>

      {action && (
        <Button variant="contained" size="large" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
