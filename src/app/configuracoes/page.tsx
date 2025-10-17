'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  Grid,
  TextField,
  Button,
  Typography,
  Divider,
  Avatar,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Settings,
  Business,
  Palette,
  Save,
  Upload,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { trpc } from '@/lib/trpc/client';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [tabValue, setTabValue] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { data: config, isLoading, refetch } = trpc.configuracoes.get.useQuery();
  const updateMutation = trpc.configuracoes.update.useMutation();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<any>({
    values: config || {},
  });

  const onSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: (config as any)!.id, ...data });
      setSuccessMessage('Configurações atualizadas com sucesso!');
      refetch();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      alert('Erro ao salvar configurações');
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB');
      return;
    }

    setUploadingLogo(true);
    const toastId = toast.loading('Fazendo upload do logo...');

    try {
      const supabase = createClient();
      
      // Nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Atualizar configuração com nova URL
      await updateMutation.mutateAsync({
        id: (config as any)!.id,
        logo_url: publicUrl,
      });

      setValue('logo_url', publicUrl);
      setLogoPreview(publicUrl);
      toast.success('Logo atualizado com sucesso!', { id: toastId });
      refetch();
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do logo', { id: toastId });
    } finally {
      setUploadingLogo(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Configurações"
        subtitle="Personalize seu sistema"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Configurações' },
        ]}
      />

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} aria-label="configurações">
            <Tab icon={<Business />} label="Empresa" iconPosition="start" />
            <Tab icon={<Palette />} label="Visual" iconPosition="start" />
          </Tabs>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Tab: Dados da Empresa */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business /> Informações da Empresa
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={3}>
                {/* Logo */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Avatar
                      src={logoPreview || (config as any)?.logo_url || ''}
                      sx={{ width: 80, height: 80 }}
                    >
                      <Business sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Logo da Empresa
                      </Typography>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="logo-upload-input"
                        type="file"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                      <label htmlFor="logo-upload-input">
                        <Button
                          variant="outlined"
                          size="small"
                          component="span"
                          startIcon={uploadingLogo ? <CircularProgress size={16} /> : <Upload />}
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? 'Enviando...' : 'Fazer Upload'}
                        </Button>
                      </label>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                        Recomendado: 500x500px, PNG ou JPG (máx 2MB)
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Dados Básicos */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome da Empresa"
                    {...register('nome_empresa', { required: 'Nome é obrigatório' })}
                    error={!!errors.nome_empresa}
                    helperText={errors.nome_empresa?.message as string}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Razão Social"
                    {...register('razao_social')}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="CNPJ"
                    {...register('cnpj')}
                    placeholder="00.000.000/0000-00"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    {...register('telefone')}
                    placeholder="(00) 0 0000-0000"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="E-mail"
                    type="email"
                    {...register('email')}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Site"
                    {...register('site')}
                    placeholder="https://www.exemplo.com"
                  />
                </Grid>

                {/* Endereço */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Endereço
                  </Typography>
                  <Divider />
                </Grid>

                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Logradouro"
                    {...register('logradouro')}
                    placeholder="Rua, Avenida, etc."
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Número"
                    {...register('numero')}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Complemento"
                    {...register('complemento')}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Bairro"
                    {...register('bairro')}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cidade"
                    {...register('cidade')}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Estado"
                    {...register('estado')}
                    placeholder="SE"
                    inputProps={{ maxLength: 2 }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="CEP"
                    {...register('cep')}
                    placeholder="00000-000"
                  />
                </Grid>

                {/* Redes Sociais */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Redes Sociais
                  </Typography>
                  <Divider />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Instagram"
                    {...register('instagram')}
                    placeholder="@suaempresa"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Facebook"
                    {...register('facebook')}
                    placeholder="suaempresa"
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Tab: Personalização Visual */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Palette /> Personalização Visual
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome do Sistema"
                    {...register('nome_sistema')}
                    helperText="Nome que aparece no sistema"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Cor Primária
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        type="color"
                        {...register('cor_primaria')}
                        sx={{ width: 80 }}
                      />
                      <TextField
                        fullWidth
                        {...register('cor_primaria')}
                        placeholder="#0ea5e9"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Cor principal do sistema (botões, links, etc)
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Cor Secundária
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        type="color"
                        {...register('cor_secundaria')}
                        sx={{ width: 80 }}
                      />
                      <TextField
                        fullWidth
                        {...register('cor_secundaria')}
                        placeholder="#0284c7"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Cor secundária para variações
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Dica:</strong> As cores são definidas em formato hexadecimal (#RRGGBB). 
                      Após salvar, recarregue a página para ver as mudanças aplicadas.
                    </Typography>
                  </Alert>
                </Grid>

                {/* Configurações de Relatórios */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Relatórios
                  </Typography>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Rodapé dos Relatórios"
                    {...register('rodape_relatorio')}
                    multiline
                    rows={3}
                    placeholder="Texto que aparece no rodapé dos relatórios em PDF"
                    helperText="Ex: Obrigado pela preferência!"
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Botão Salvar */}
          <Box sx={{ p: 3, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<Save />}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </Box>
        </form>
      </Card>
    </AppLayout>
  );
}
