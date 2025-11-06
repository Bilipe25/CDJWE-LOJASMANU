/**
 * Componente reutilizável para seleção de Fornecedores/Destinatários
 * Permite buscar fornecedores existentes ou criar novos
 */

import { useState } from 'react';
import {
  Autocomplete,
  TextField,
  InputAdornment,
  Alert,
  Box,
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { useFornecedores, type Fornecedor } from '@/hooks/useFornecedores';

interface FornecedorSelectorProps {
  value: string; // nome do fornecedor
  onChange: (fornecedor: Fornecedor | null, isNew: boolean) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  error?: boolean;
  disabled?: boolean;
}

export default function FornecedorSelector({
  value,
  onChange,
  label = 'Fornecedor/Destinatário',
  placeholder = 'Digite ou selecione o fornecedor',
  helperText = 'Você pode digitar um novo nome ou selecionar um existente',
  required = false,
  error = false,
  disabled = false,
}: FornecedorSelectorProps) {
  const [inputValue, setInputValue] = useState(value);
  const { fornecedores, isLoading } = useFornecedores();

  // Verificar se o valor atual é novo (não existe na lista)
  const isNovoFornecedor = inputValue && !fornecedores.some(
    (f: Fornecedor) => f.nome?.toLowerCase() === inputValue?.toLowerCase()
  );

  const handleChange = (_: any, newValue: Fornecedor | string | null) => {
    if (typeof newValue === 'string') {
      // Usuário digitou um nome novo
      setInputValue(newValue);
      onChange(null, true);
    } else if (newValue) {
      // Usuário selecionou um fornecedor existente
      setInputValue(newValue.nome);
      onChange(newValue, false);
    } else {
      // Limpou o campo
      setInputValue('');
      onChange(null, false);
    }
  };

  const handleInputChange = (_: any, newInputValue: string) => {
    setInputValue(newInputValue);
    
    // Se o input está vazio, notificar o pai
    if (!newInputValue) {
      onChange(null, false);
    }
  };

  return (
    <Box>
      <Autocomplete
        freeSolo
        options={fornecedores}
        value={value || null}
        inputValue={inputValue}
        onChange={handleChange}
        onInputChange={handleInputChange}
        getOptionLabel={(option: Fornecedor | string) => {
          if (typeof option === 'string') return option;
          return option.nome || '';
        }}
        filterOptions={(options, { inputValue }) => {
          // Filtra localmente - muito mais rápido!
          if (!inputValue) return options;
          const searchLower = inputValue.toLowerCase();
          return options.filter(
            (option: Fornecedor | string) => {
              // Se for string, não filtrar (é input livre)
              if (typeof option === 'string') return true;
              // Filtrar fornecedores por nome, CPF ou telefone
              return (
                option.nome?.toLowerCase().includes(searchLower) ||
                option.cpf?.toLowerCase().includes(searchLower) ||
                option.telefone?.toLowerCase().includes(searchLower)
              );
            }
          );
        }}
        loading={isLoading}
        disabled={disabled}
        noOptionsText="Nenhum fornecedor encontrado - digite para criar novo"
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            helperText={helperText}
            required={required}
            error={error}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
          />
        )}
      />
      
      {/* Alerta quando é um novo fornecedor */}
      {isNovoFornecedor && (
        <Alert severity="success" sx={{ mt: 1 }}>
          ✨ Novo fornecedor "{inputValue}" será criado automaticamente
        </Alert>
      )}
    </Box>
  );
}
