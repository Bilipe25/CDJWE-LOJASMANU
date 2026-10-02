'use client';
import { Box, Tooltip, Typography } from '@mui/material';
import { useIsMutating } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc/client';
import { useNetworkAvailable } from '@/hooks/useNetworkAvailable';
export default function ConnectionStatus() {
  const online=useNetworkAvailable(), enviando=useIsMutating()>0;
  // Cada resposta verifica Auth e consulta a associação no banco no contexto do servidor.
  const health=trpc.auth.me.useQuery(undefined,{enabled:online===true,refetchInterval:30000,refetchOnWindowFocus:true,retry:false,staleTime:0});
  const texto=online===false?'Sem conexão':enviando?'Enviando…':health.isError?'Serviço indisponível':health.data?'Conectado ao serviço':'Verificando serviço…';
  const cor=online===false||health.isError?'error.main':enviando||!health.data?'warning.main':'success.dark';
  return <Tooltip title={online===false?'Reconecte para consultar e salvar. O rascunho do PDV permanece neste dispositivo.':health.isError?'Não foi possível verificar o serviço. Tente atualizar ou entrar novamente.':'Disponibilidade verificada a cada 30 segundos.'}>
    <Box role="status" aria-live="polite" sx={{display:'flex',alignItems:'center',gap:1}}>
      <Box aria-hidden sx={{width:10,height:10,borderRadius:'50%',bgcolor:cor,flexShrink:0}} />
      <Typography variant="body2" sx={{color:cor,fontSize:{xs:12,sm:14}}}>{texto}</Typography>
    </Box>
  </Tooltip>;
}
