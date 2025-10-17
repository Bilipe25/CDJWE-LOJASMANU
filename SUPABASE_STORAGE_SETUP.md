# Configuração do Supabase Storage para Upload de Logo

## Passos para configurar o Storage no Supabase:

### 1. Acessar o Painel do Supabase
- Acesse: https://supabase.com/dashboard
- Selecione seu projeto

### 2. Criar Bucket de Storage

1. No menu lateral, clique em **Storage**
2. Clique em **New bucket**
3. Configure o bucket:
   - **Name**: `uploads`
   - **Public bucket**: ✅ Marque esta opção (permite acesso público aos arquivos)
   - Clique em **Create bucket**

### 3. Configurar Políticas de Acesso (RLS)

Vá em **Storage > Policies** e adicione as seguintes políticas para o bucket `uploads`:

#### Política de Upload (INSERT)
```sql
CREATE POLICY "Permitir upload de logos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'logos'
);
```

#### Política de Leitura (SELECT)
```sql
CREATE POLICY "Permitir leitura pública"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');
```

#### Política de Atualização (UPDATE)
```sql
CREATE POLICY "Permitir atualização de logos"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'logos'
);
```

#### Política de Exclusão (DELETE)
```sql
CREATE POLICY "Permitir exclusão de logos"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'logos'
);
```

### 4. Estrutura de Pastas

O sistema criará automaticamente a pasta `logos/` dentro do bucket para organizar os arquivos.

Estrutura:
```
uploads/
└── logos/
    ├── logo-1234567890.png
    ├── logo-1234567891.jpg
    └── ...
```

### 5. Testar o Upload

1. Acesse a página de **Configurações** no sistema
2. Na aba **Empresa**, clique em **Fazer Upload** na seção de logo
3. Selecione uma imagem (PNG ou JPG, máx 2MB)
4. O upload será feito automaticamente

### 6. Verificar no Supabase

- Vá em **Storage > uploads > logos/**
- Você verá o arquivo enviado
- A URL pública será salva automaticamente nas configurações

## Limitações e Validações

✅ **Formatos aceitos**: PNG, JPG, JPEG, GIF, WEBP
✅ **Tamanho máximo**: 2MB
✅ **Dimensões recomendadas**: 500x500px (quadrado)
✅ **Nomenclatura**: Automática com timestamp

## Troubleshooting

### Erro: "Bucket uploads não existe"
- Verifique se criou o bucket `uploads` no Storage
- Nome deve ser exatamente `uploads` (minúsculo)

### Erro: "Permission denied"
- Verifique se as políticas RLS foram configuradas
- Certifique-se que o bucket está marcado como **Public**

### Erro: "File too large"
- Imagem maior que 2MB
- Reduza o tamanho da imagem antes de fazer upload

### Logo não aparece
- Verifique se a URL foi salva corretamente no banco
- Teste a URL pública diretamente no navegador
- Verifique se o bucket está público
