'use client';

import { Box, Typography, Breadcrumbs, Link, Button } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'contained' | 'outlined' | 'text';
  };
}

export default function PageHeader({ title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  const router = useRouter();

  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          aria-label="navegação"
          sx={{ mb: 2 }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast ? (
              <Typography key={index} color="text.primary" fontWeight={500}>
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={index}
                underline="hover"
                color="inherit"
                href={crumb.href || '#'}
                onClick={(e) => {
                  e.preventDefault();
                  if (crumb.href) router.push(crumb.href);
                }}
                sx={{ cursor: 'pointer' }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {action && (
          <Button
            variant={action.variant || 'contained'}
            onClick={action.onClick}
            startIcon={action.icon}
            size="large"
            sx={{ minWidth: 140 }}
          >
            {action.label}
          </Button>
        )}
      </Box>
    </Box>
  );
}
