# Configuração PWA - Progressive Web App

Este projeto está configurado como uma Progressive Web App (PWA) profissional, permitindo instalação em dispositivos móveis e desktop.

## ✨ Funcionalidades Implementadas

### 1. **Manifest Dinâmico**
- O manifest é gerado dinamicamente usando os dados da empresa
- Localizado em: `/api/manifest`
- Usa nome da empresa, logo e cores do tema das configurações

### 2. **Service Worker**
- Cache inteligente de recursos
- Funcionamento offline
- Atualização automática
- Cache de imagens, fonts e recursos estáticos

### 3. **Componente de Instalação**
- Prompt automático de instalação
- Detecta se o app já está instalado
- Aparece apenas para usuários que ainda não instalaram

### 4. **Página Offline**
- Exibida quando não há conexão
- Design profissional e amigável
- Botão para tentar reconectar

## 🎨 Configurando os Ícones

Você precisa adicionar os seguintes ícones na pasta `/public`:

### Ícones Necessários:

1. **icon-192x192.png** (192x192 pixels)
   - Ícone principal para Android
   - Usado em telas pequenas
   
2. **icon-512x512.png** (512x512 pixels)
   - Ícone de alta resolução
   - Usado em telas maiores e splash screens
   
3. **apple-touch-icon.png** (180x180 pixels)
   - Ícone específico para iOS/Apple
   - Usado quando o app é adicionado à tela inicial do iPhone/iPad

### Como Criar os Ícones:

#### Opção 1: Usar o Logo da Empresa
Se você já tem o logo configurado nas configurações da empresa:
1. Acesse a página de Configurações
2. Faça upload do logo no campo apropriado
3. O sistema usará automaticamente esse logo no manifest

#### Opção 2: Criar Ícones Manualmente
1. Use o logo da empresa (formato PNG com fundo transparente ou branco)
2. Redimensione para os tamanhos necessários:
   - 192x192px
   - 512x512px
   - 180x180px
3. Salve os arquivos na pasta `public/` com os nomes exatos

#### Opção 3: Usar Ferramentas Online
- **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
- **RealFaviconGenerator**: https://realfavicongenerator.net/
- **Favicon.io**: https://favicon.io/

### Dicas para Ícones Profissionais:

✅ **Recomendações:**
- Use fundo sólido ou transparente
- Evite muito texto ou detalhes pequenos
- Certifique-se que o ícone fica legível em tamanhos pequenos
- Use cores que combinem com a marca
- Mantenha a proporção quadrada (1:1)
- Formato PNG com boa qualidade

❌ **Evite:**
- Ícones pixelados ou de baixa qualidade
- Muito texto ou informações
- Bordas cortadas
- Cores muito claras em fundo branco

## 📱 Como Testar a Instalação

### No Chrome Desktop:
1. Abra o app no Chrome
2. Clique nos 3 pontos (⋮) no canto superior direito
3. Selecione "Instalar [Nome do App]"
4. O app será instalado como um aplicativo nativo

### No Chrome Mobile (Android):
1. Abra o app no Chrome
2. Um banner de instalação aparecerá automaticamente
3. Clique em "Instalar" ou "Adicionar à tela inicial"
4. O app será instalado no seu dispositivo

### No Safari (iOS):
1. Abra o app no Safari
2. Toque no ícone de compartilhar (□↑)
3. Role para baixo e toque em "Adicionar à Tela de Início"
4. Confirme o nome e toque em "Adicionar"

## 🔧 Configurações Avançadas

### Modificar Cores do Tema:
As cores são carregadas automaticamente das configurações da empresa:
- `cor_primaria`: Cor principal do tema
- `cor_secundaria`: Cor secundária

Para alterar:
1. Vá para Configurações → Dados da Empresa
2. Edite as cores primária e secundária
3. O manifest será atualizado automaticamente

### Desabilitar PWA em Desenvolvimento:
O PWA está automaticamente desabilitado em modo de desenvolvimento.
Para testar em desenvolvimento, altere em `next.config.mjs`:
```javascript
disable: false, // ou remova essa linha
```

### Cache e Offline:
O app cacheia automaticamente:
- ✅ Imagens (30 dias)
- ✅ Requisições do Supabase (24 horas)
- ✅ Google Fonts (1 ano)
- ✅ Arquivos JS/CSS (7 dias)

## 🚀 Deployment

Ao fazer deploy em produção:
1. Execute `npm run build`
2. Os arquivos do service worker serão gerados em `/public`
3. O manifest estará disponível em `/api/manifest`
4. O app estará pronto para instalação

## 🎯 Atalhos do App

Quando instalado, o app oferece atalhos rápidos:
- **Novo Pedido**: Abre direto no PDV
- **Pedidos**: Visualizar lista de pedidos
- **Produtos**: Gerenciar produtos

## 📊 Verificar Status PWA

Use o Chrome DevTools para verificar:
1. Abra DevTools (F12)
2. Vá para a aba "Application"
3. Verifique:
   - Manifest
   - Service Workers
   - Cache Storage

## 🔄 Atualizações

O service worker verifica automaticamente por atualizações.
Quando uma nova versão está disponível:
- O cache é atualizado automaticamente
- Usuários verão a nova versão no próximo carregamento

## 🎨 Customização

Para personalizar ainda mais o PWA:
1. Edite `/src/app/api/manifest/route.ts`
2. Modifique as configurações em `next.config.mjs`
3. Ajuste o componente InstallPWA em `/src/components/InstallPWA.tsx`

## ✅ Checklist de Configuração

- [ ] Criar ícone 192x192px
- [ ] Criar ícone 512x512px
- [ ] Criar ícone Apple Touch 180x180px
- [ ] Configurar nome da empresa nas configurações
- [ ] Configurar logo da empresa nas configurações
- [ ] Configurar cores do tema nas configurações
- [ ] Testar instalação no Chrome Desktop
- [ ] Testar instalação no Chrome Mobile
- [ ] Testar instalação no Safari iOS
- [ ] Verificar funcionamento offline
- [ ] Testar atalhos do app

## 🆘 Suporte

Se você encontrar problemas:
1. Verifique se todos os ícones estão na pasta `public/`
2. Limpe o cache do navegador
3. Verifique o console do DevTools
4. Certifique-se que está usando HTTPS (obrigatório para PWA)

---

**Nota**: PWAs funcionam apenas em HTTPS (ou localhost para desenvolvimento).
