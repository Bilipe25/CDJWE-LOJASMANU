import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/server';

export const configuracoesRouter = router({
  // Buscar configurações ativas da empresa
  get: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('configuracoes_empresa')
      .select('*')
      .eq('ativo', true)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }),

  // Atualizar configurações
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome_empresa: z.string().min(1).max(200).optional().nullable(),
        razao_social: z.string().max(200).optional().nullable(),
        cnpj: z.string().max(18).optional().nullable(),
        telefone: z.string().max(20).optional().nullable(),
        email: z.union([z.string().email().max(100), z.literal(''), z.null()]).optional(),
        
        // Endereço
        logradouro: z.string().optional().nullable(),
        numero: z.string().max(20).optional().nullable(),
        complemento: z.string().max(100).optional().nullable(),
        bairro: z.string().max(100).optional().nullable(),
        cidade: z.string().max(100).optional().nullable(),
        estado: z.union([z.string().length(2), z.literal(''), z.null()]).optional(),
        cep: z.string().max(10).optional().nullable(),
        
        // Branding
        logo_url: z.string().optional().nullable(),
        logo_pequeno_url: z.string().optional().nullable(),
        cor_primaria: z.union([z.string().regex(/^#[0-9A-Fa-f]{6}$/), z.literal(''), z.null()]).optional(),
        cor_secundaria: z.union([z.string().regex(/^#[0-9A-Fa-f]{6}$/), z.literal(''), z.null()]).optional(),
        
        // Sistema
        nome_sistema: z.string().max(100).optional().nullable(),
        
        // Redes sociais
        site: z.string().max(200).optional().nullable(),
        instagram: z.string().max(100).optional().nullable(),
        facebook: z.string().max(100).optional().nullable(),
        
        // Relatórios
        mostrar_logo_relatorio: z.boolean().optional(),
        rodape_relatorio: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      // Remover campos null e strings vazias, manter apenas valores válidos
      const cleanedData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => {
          // Remove null, undefined e strings vazias
          return value !== null && value !== undefined && value !== '';
        })
      );
      
      const { data, error } = await ctx.supabase
        .from('configuracoes_empresa')
        .update(cleanedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Upload de logo (placeholder - implementar com storage depois)
  uploadLogo: publicProcedure
    .input(
      z.object({
        tipo: z.enum(['logo', 'logo_pequeno']),
        file: z.string(), // base64 ou URL
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implementar upload para Supabase Storage
      return {
        url: input.file,
        success: true,
      };
    }),
});
