import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export type MaskType = 'cpf' | 'phone' | 'cep' | 'cnpj' | 'currency' | 'date';

interface MaskedInputProps extends Omit<TextFieldProps, 'onChange'> {
    maskType?: MaskType;
    value: string;
    onChange: (value: string) => void;
}

export const formatCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatCNPJ = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatPhone = (value: string) => {
    const r = value.replace(/\D/g, '');
    if (r.length > 10) {
        return r
            .replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (r.length > 5) {
        return r
            .replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (r.length > 2) {
        return r.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
    } else {
        return r.replace(/^(\d*)/, '($1');
    }
};

export const formatCEP = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
};

export const formatDate = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{4})\d+?$/, '$1');
};

export default function MaskedInput({ maskType, value, onChange, ...props }: MaskedInputProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value;

        // Apply formatting logic only if maskType is provided
        // Otherwise it acts as a controlled TextField
        if (maskType === 'cpf') newValue = formatCPF(newValue);
        if (maskType === 'cnpj') newValue = formatCNPJ(newValue);
        if (maskType === 'phone') newValue = formatPhone(newValue);
        if (maskType === 'cep') newValue = formatCEP(newValue);
        if (maskType === 'date') newValue = formatDate(newValue);

        onChange(newValue);
    };

    return (
        <TextField
            {...props}
            value={value}
            onChange={handleChange}
        />
    );
}
