import React from 'react';
import { Skeleton, Box, Card, CardContent, Grid } from '@mui/material';

type SkeletonType = 'table' | 'card' | 'form' | 'list';

interface LoadingSkeletonProps {
    type?: SkeletonType;
    rows?: number;
    height?: number | string;
}

export default function LoadingSkeleton({ type = 'list', rows = 3, height }: LoadingSkeletonProps) {
    if (type === 'table') {
        return (
            <Box sx={{ width: '100%' }}>
                <Skeleton variant="rectangular" height={50} sx={{ mb: 2, borderRadius: 1 }} />
                {Array.from(new Array(rows)).map((_, index) => (
                    <Box key={index} sx={{ display: 'flex', mb: 1, gap: 2 }}>
                        <Skeleton variant="text" width="20%" height={40} />
                        <Skeleton variant="text" width="30%" height={40} />
                        <Skeleton variant="text" width="20%" height={40} />
                        <Skeleton variant="text" width="10%" height={40} />
                        <Skeleton variant="text" width="20%" height={40} />
                    </Box>
                ))}
            </Box>
        );
    }

    if (type === 'card') {
        return (
            <Grid container spacing={2}>
                {Array.from(new Array(rows)).map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card>
                            <CardContent>
                                <Skeleton variant="rectangular" height={140} sx={{ mb: 2, borderRadius: 1 }} />
                                <Skeleton variant="text" width="80%" height={30} sx={{ mb: 1 }} />
                                <Skeleton variant="text" width="60%" />
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        );
    }

    if (type === 'form') {
        return (
            <Box sx={{ width: '100%' }}>
                <Grid container spacing={2}>
                    {Array.from(new Array(rows * 2)).map((_, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                            <Skeleton variant="text" width="30%" sx={{ mb: 1 }} />
                            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    // Default List
    return (
        <Box sx={{ width: '100%' }}>
            {Array.from(new Array(rows)).map((_, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                    <Skeleton variant="rectangular" height={height || 60} sx={{ borderRadius: 1 }} />
                </Box>
            ))}
        </Box>
    );
}
