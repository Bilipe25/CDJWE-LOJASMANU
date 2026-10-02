# PWA — operação, instalação e manutenção

O aplicativo usa um manifest público estável, um service worker próprio e ícones derivados da imagem fornecida em 02/10/2026. A instalação não depende do Supabase ou de uma sessão autenticada.

## Instalação

Publique normalmente com `npm run build`. O hook `prebuild` gera `public/sw.js` antes do build do Next.js, tanto com Turbopack quanto com webpack. Use HTTPS em produção; localhost também permite validação. Em desenvolvimento (`npm run dev`), o componente não registra o worker.

No Chrome/Edge, use o botão Instalar oferecido pelo app ou o menu do navegador. O navegador decide quando oferecer a instalação. No Safari do iPhone/iPad, o app explica Compartilhar → Adicionar à Tela de Início. A aplicação detecta execução standalone sem gravar um sinalizador permanente que impediria reinstalações. Ao dispensar a sugestão, ela fica oculta naquela sessão.

A identidade é `id: /`, nome PDV Lojas Manu, escopo `/`, entrada `/`, modo standalone, orientação livre e cor azul #0369a1. `/manifest.json` é a fonte única; `/api/manifest` mantém compatibilidade e devolve os mesmos dados. O logo configurado para documentos e dados da empresa não substitui o ícone instalado.

## Ícones

A fonte original está em `assets/pwa/logo-original.png`. Foram exportados:

- `public/icon-192x192.png` e `public/icon-512x512.png`: ícones comuns;
- `public/icon-maskable-512x512.png`: fundo branco opaco e toda a arte dentro da área circular segura;
- `public/apple-touch-icon.png`: 180 × 180 para Apple;
- `public/favicon-32x32.png`: aba do navegador.

Para regenerar, execute `npm run pwa:icons` (usa Sharp, incluído na instalação padrão do Next.js) e depois `npm run build`. A exportação só redimensiona proporcionalmente e adiciona margens: a personagem original não é redesenhada. O fundo branco é necessário para a apresentação consistente em launchers.

Uma composição quadrada foi avaliada com a ferramenta integrada imagegen, com o prompt: “Preserve woman, face, hair, blue blazer and orange circle; adapt only to a square white canvas, centered with safe margins; no text, shadows or rounded corners.” A composição gerada não foi adotada: os arquivos finais conservam os pixels da ilustração original por exportação determinística.

Ícones de apps já instalados podem demorar a atualizar, conforme navegador/SO. Primeiro feche e reabra o aplicativo após a publicação. Antes de eventual reinstalação, salve atendimentos pendentes. Não limpe os dados do site para atualizar o ícone: isso pode apagar o rascunho local.

## Rede, offline e privacidade

O worker pré-carrega somente `offline.html` e os cinco PNGs públicos. Não armazena respostas do Supabase, tokens, clientes, pedidos, APIs, documentos de páginas autenticadas, payloads RSC, JavaScript ou CSS de releases. Navegações completas usam a rede; na falha da conexão, recebem o HTML offline independente de React, Next ou autenticação, mantendo a URL original para tentar novamente.

Vendas e consultas precisam de internet. A tela offline não é um PDV funcional: o rascunho já persistido neste dispositivo é preservado, mas não há fila offline de gravação. Se o app já estiver aberto, os avisos de conexão e o bloqueio de salvar existentes no PDV continuam valendo. A navegação interna do Next usa a rede normalmente e pode apresentar erro enquanto desconectada.

Na ativação, são removidos os caches conhecidos da integração anterior, inclusive `supabase-cache`, e versões antigas deste PWA. Cache Storage de outros aplicativos, localStorage e IndexedDB não são apagados.

## Atualizações

Cada build calcula uma revisão a partir dos arquivos do aplicativo, configuração, lockfile e recursos públicos do PWA. O worker é servido com MIME JavaScript, escopo raiz e `no-cache, no-store`; o registro usa `updateViaCache: none`.

Ao detectar uma nova versão, aparece Atualizar. O operador recebe uma confirmação para salvar/concluir atendimentos e formulários antes de recarregar. Não há recarga automática ao voltar a internet. Só a aba que confirmou recarrega após a ativação; as demais passam a ser atendidas pelo novo worker sem recarga forçada. Fechar todas as abas também permite ao navegador ativar uma atualização em espera.

## Verificação

- `npm test`: regressões operacionais e testes do PWA.
- `npm run type-check`: tipos.
- `npm run build`: artefato real de produção, incluindo `/sw.js`.
- No DevTools → Application: confira manifest, cinco PNGs e um HTML no Cache Storage e worker com escopo raiz.
- Abra o aplicativo online uma vez, corte a conexão e faça uma navegação completa: a tela offline deve oferecer Tentar novamente.
- Teste a instalação final no endereço HTTPS publicado e em dispositivos reais. A validação local não confirma o comportamento de todos os sistemas operacionais ou do CDN de produção.

Referências: [guia oficial Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps), [zona segura de ícones adaptativos](https://web.dev/articles/maskable-icon), [atualização sem cache HTTP](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache).
