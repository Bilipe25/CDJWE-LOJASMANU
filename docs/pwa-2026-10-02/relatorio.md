# Revisão do manifest, service worker e PWA — 02/10/2026

| Achado | Efeito | Correção |
| --- | --- | --- |
| Ícones PNG com zero bytes | Ícone ausente/inválido na instalação e Apple | Exportação da imagem anexada em dimensões reais; favicon e maskable separados |
| next-pwa ligado ao webpack e build padrão Turbopack | Worker não produzido no build atual | Worker próprio, registrado explicitamente em produção e gerado por prebuild; dependência antiga removida |
| Cache NetworkFirst do Supabase por 24 horas | Respostas antigas ou dados de sessão persistidos em Cache Storage | Supabase/API/auth/RSC/mutações fora da interceptação; limpeza dos caches antigos na ativação |
| Manifest dinâmico dependente de consulta anônima e logo arbitrário | Nome/ícone inconsistentes, erros com RLS e dimensões declaradas incorretas | Manifest estável público, sem consulta ao banco; endpoint antigo reutiliza a mesma fonte |
| Ícones any e maskable compartilhados; orientação portrait | Cortes no launcher e orientação inadequada ao uso desktop | PNG adaptativo com margens verificadas; orientação any e azul alinhado à interface |
| skipWaiting e recarga ao reconectar automáticos | Interrupção do atendimento ou formulários | Atualização em espera com confirmação; sem recarga na reconexão |
| Sinalizador permanente pwa-installed e ausência de appinstalled | Sugestão podia desaparecer mesmo após desinstalação | Detecção standalone, evento de instalação e dispensa apenas na sessão |
| Fallback React dependia do app/autenticação/arquivos não disponíveis offline | Tela offline podia não abrir | HTML independente pré-carregado, com mensagem operacional clara e tentativa na URL original |
| Guia prometia operação offline e instalação automática | Expectativa incorreta para um PDV online | Documentação reescrita com capacidades, limites e rotina de validação |

Os ícones usam a imagem original; o logo de documentos nas configurações permanece independente. O service worker não altera os rascunhos locais nem implementa sincronização offline de vendas.

Validação automatizada: 78 testes passaram, incluindo oito novos testes do PWA; checagem de tipos e lint dos arquivos envolvidos passaram. O build de produção com Turbopack passou. Evidências complementares da validação local em navegador serão registradas abaixo.

A publicação não foi realizada nesta etapa. A instalação nativa em Android/iOS e a atualização do ícone de aplicativos já instalados precisam de conferência no domínio HTTPS publicado.

Detalhes operacionais e fontes: [PWA_SETUP.md](../../PWA_SETUP.md).

## Evidências da validação em produção local

- Chrome em localhost: worker `/sw.js` ativado, controlador presente e somente cache `lojasmanu-pwa-9e3e417acc624ab6`; nenhum erro de registro no console.
- HTTP: `/manifest.json` e `/api/manifest` retornaram dados idênticos, confirmado por comparação JSON em Node; MIME manifest correto. `/sw.js` retornou 200, MIME JavaScript e cache desabilitado, com revisão preenchida. Ícone 512 retornou 242.566 bytes.
- Após encerrar o servidor Next.js, navegar para `/pdv` exibiu o HTML offline com o ícone, mensagem operacional e botão Tentar novamente, conservando a URL `/pdv`.
- [Registro do worker](registro-chrome.png) e [tela offline](offline-chrome.png).

A página auxiliar de diagnóstico foi removida após coletar as evidências. A instalação no sistema operacional não foi executada. A confirmação de atualização foi validada pelo código, tipos e testes do ciclo de vida; não foi simulada uma segunda publicação no navegador.
- Com o servidor restaurado, o botão Tentar novamente retomou o aplicativo e redirecionou ao login, conforme a autenticação. O Chrome emitiu a oferta de instalação e o botão Instalar apareceu; console sem erros. [Evidência da sugestão](instalacao-chrome.png).
