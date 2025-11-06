# Guia do Sistema de Login

## 📋 Visão Geral

O sistema de login local foi implementado para fornecer autenticação simples sem a necessidade de integração com serviços externos como Supabase Auth.

## 🔐 Usuários Padrão

Os seguintes usuários estão configurados no sistema:

| Usuário   | Senha        | Descrição        |
|-----------|--------------|------------------|
| admin     | admin123     | Administrador    |
| gerente   | gerente123   | Gerente          |
| operador  | operador123  | Operador         |

## 🎨 Características

### Design Moderno
- Interface profissional com Material UI
- Animações suaves com Framer Motion
- Design responsivo para mobile e desktop
- Logo e nome da empresa da página de configurações

### Funcionalidades
- Autenticação local com localStorage
- Sessão persistente
- Redirecionamento automático para login quando não autenticado
- Botão de logout no menu lateral
- Indicador de usuário conectado

## 🔧 Personalização

### Adicionar/Modificar Usuários

Para adicionar ou modificar usuários, edite o arquivo:
```
src/contexts/AuthContext.tsx
```

Localize o array `validUsers` na função `login`:

```typescript
const validUsers = [
  { username: 'admin', password: 'admin123' },
  { username: 'gerente', password: 'gerente123' },
  { username: 'operador', password: 'operador123' },
  // Adicione mais usuários aqui
];
```

### Personalizar Aparência

A página de login usa as cores primárias da empresa configuradas em:
```
/configuracoes
```

- **cor_primaria**: Cor principal do sistema
- **cor_secundaria**: Cor secundária
- **logo_url**: URL do logo da empresa
- **nome_empresa**: Nome da empresa exibido

## 🛡️ Segurança

### Avisos Importantes

⚠️ **Este é um sistema de autenticação básico** adequado para ambientes controlados.

**Não recomendado para:**
- Aplicações com múltiplos usuários externos
- Sistemas que exigem segurança avançada
- Ambientes de produção com dados sensíveis

**Para ambientes de produção, considere:**
- Implementar hash de senhas (bcrypt)
- Usar tokens JWT
- Integrar com Supabase Auth ou similar
- Adicionar autenticação de dois fatores
- Implementar controle de permissões

## 🚀 Uso

### Acesso à Página de Login

```
/login
```

### Proteção de Rotas

Todas as páginas principais estão protegidas automaticamente com o componente `ProtectedRoute`.

Para proteger uma nova página:

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function MinhaPage() {
  return (
    <ProtectedRoute>
      {/* Seu conteúdo aqui */}
    </ProtectedRoute>
  );
}
```

### Logout

O botão de logout está disponível no menu lateral (drawer) na parte inferior, exibindo:
- Avatar do usuário
- Nome do usuário conectado
- Botão "Sair"

### Hook de Autenticação

Use o hook `useAuth` para acessar informações de autenticação:

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MeuComponente() {
  const { isAuthenticated, username, logout } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Olá, {username}!</p>}
    </div>
  );
}
```

## 📱 Comportamento

### Fluxo de Autenticação

1. **Usuário não autenticado** → Redirecionado para `/login`
2. **Login bem-sucedido** → Sessão salva no localStorage → Redirecionado para `/`
3. **Logout** → Sessão removida → Redirecionado para `/login`
4. **Refresh da página** → Sessão restaurada automaticamente

### Dados Persistidos

O sistema armazena no localStorage:
- `authenticated`: Status de autenticação (true/false)
- `username`: Nome do usuário logado

## 🔄 Migração Futura

Para migrar para um sistema de autenticação mais robusto (como Supabase Auth):

1. Manter a interface do `AuthContext` para compatibilidade
2. Implementar as funções `login` e `logout` com a nova API
3. Atualizar validações e gerenciamento de sessão
4. Manter os componentes `ProtectedRoute` e `useAuth` hook

## 💡 Dicas

- Em **desenvolvimento**: Mensagem com credenciais de teste é exibida
- Em **produção**: Remova o box com credenciais de teste da página de login
- Personalize as cores da empresa em **Configurações** para uma experiência visual coesa
- Use o logo da empresa para fortalecer a identidade visual

## 🐛 Troubleshooting

### Problema: Redirecionamento em loop
**Solução**: Limpe o localStorage:
```javascript
localStorage.clear()
```

### Problema: Sessão não persiste
**Solução**: Verifique se o navegador permite localStorage

### Problema: Logo não aparece
**Solução**: Configure o logo em `/configuracoes` e faça upload da imagem

## 📝 Notas de Desenvolvimento

- **AuthContext**: Gerenciamento global de autenticação
- **ProtectedRoute**: HOC para proteger rotas
- **AppLayout**: Contém botão de logout e info do usuário
- **Login Page**: Página de login com animações e design moderno
