import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Criar cliente Supabase
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Buscar configurações da empresa
    const { data: config, error: configError } = await supabase
      .from('configuracoes_empresa')
      .select('*')
      .eq('ativo', true)
      .maybeSingle();

    type ConfigRow = Database['public']['Tables']['configuracoes_empresa']['Row'];

    // Valores padrão
    const nomeEmpresa = (config as ConfigRow | null)?.nome_empresa ?? 'Lojas Manu';
    const nomeSistema = (config as ConfigRow | null)?.nome_sistema ?? 'PDV Lojas Manu';
    const shortName = nomeEmpresa.length > 12 
      ? nomeEmpresa.substring(0, 12) 
      : nomeEmpresa;
    const corTema = (config as ConfigRow | null)?.cor_primaria ?? '#0ea5e9';
    const logoUrl = (config as ConfigRow | null)?.logo_url ?? '/icon-512x512.png';

    // Manifest dinâmico
    const manifest = {
      name: nomeSistema,
      short_name: shortName,
      description: `Sistema de Ponto de Venda - ${nomeEmpresa}`,
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: corTema,
      orientation: 'portrait',
      scope: '/',
      icons: [
        {
          src: logoUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      categories: ['business', 'productivity', 'finance'],
      lang: 'pt-BR',
      dir: 'ltr',
      screenshots: [],
      shortcuts: [
        {
          name: 'Novo Pedido',
          short_name: 'PDV',
          description: 'Abrir PDV para novo pedido',
          url: '/pdv',
          icons: [{ src: logoUrl, sizes: '192x192' }]
        },
        {
          name: 'Pedidos',
          short_name: 'Pedidos',
          description: 'Ver lista de pedidos',
          url: '/pedidos',
          icons: [{ src: logoUrl, sizes: '192x192' }]
        },
        {
          name: 'Produtos',
          short_name: 'Produtos',
          description: 'Gerenciar produtos',
          url: '/produtos',
          icons: [{ src: logoUrl, sizes: '192x192' }]
        }
      ],
      related_applications: [],
      prefer_related_applications: false
    };

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar manifest:', error);
    
    // Fallback para manifest padrão
    const defaultManifest = {
      name: 'PDV Lojas Manu',
      short_name: 'PDV Manu',
      description: 'Sistema de Ponto de Venda',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#0ea5e9',
      orientation: 'portrait',
      icons: [
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ],
      categories: ['business', 'productivity'],
      lang: 'pt-BR',
      dir: 'ltr'
    };

    return NextResponse.json(defaultManifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    });
  }
}
