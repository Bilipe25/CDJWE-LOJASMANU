import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
    status: string;
    type?: StatusType;
    label?: string;
    mapping?: Record<string, { label: string; color: StatusType }>;
}

const defaultMapping: Record<string, { label: string; color: StatusType }> = {
    // Pedidos
    PENDENTE: { label: 'Pendente', color: 'warning' },
    CONFIRMADO: { label: 'Confirmado', color: 'info' },
    FINALIZADO: { label: 'Finalizado', color: 'success' },
    CANCELADO: { label: 'Cancelado', color: 'error' },
    // Clientes/Geral
    ATIVO: { label: 'Ativo', color: 'success' },
    INATIVO: { label: 'Inativo', color: 'default' },
    // Financeiro
    PAGO: { label: 'Pago', color: 'success' },
    ABERTO: { label: 'Em Aberto', color: 'warning' },
    ATRASADO: { label: 'Atrasado', color: 'error' },
};

export default function StatusBadge({
    status,
    type,
    label,
    mapping = defaultMapping,
    ...props
}: StatusBadgeProps) {
    const normalizeStatus = status?.toString().toUpperCase() || '';

    // Se passar type/label direto, usa. Se não, tenta mapear.
    let displayLabel = label || status;
    let displayColor: StatusType = type || 'default';

    if (!type && !label && mapping[normalizeStatus]) {
        displayLabel = mapping[normalizeStatus].label;
        displayColor = mapping[normalizeStatus].color;
    }

    return (
        <Chip
            label={displayLabel}
            color={displayColor as any}
            size="small"
            sx={{
                fontWeight: 600,
                ...props.sx
            }}
            {...props}
        />
    );
}
