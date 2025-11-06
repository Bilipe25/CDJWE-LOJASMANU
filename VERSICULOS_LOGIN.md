# Sistema de Versículos Diários - Página de Login

## 📖 Visão Geral

A página de login agora possui um layout em duas colunas (desktop) com versículos bíblicos diários que trazem mensagens de esperança, fé, motivação e fortalecimento.

## 🎨 Layout

### Desktop (Tela Grande)
- **Painel Esquerdo (55%)**: Boas-vindas, data e versículo
- **Painel Direito (45%)**: Formulário de login

### Mobile
- Layout centralizado tradicional
- Logo, nome da empresa e formulário

## ✨ Características

### Painel de Boas-Vindas (Desktop)
1. **Logo da Empresa**: Pequeno no topo (80x80px)
2. **Saudação**: "Seja Bem-Vindo!" em destaque
3. **Data Atual**: Exibida por extenso de forma discreta
4. **Versículo do Dia**: Card com versículo bíblico
5. **Mensagem**: Instrução breve para login

### Card de Versículo
- **Ícone de Aspas**: Decorativo no topo
- **Título**: "Versículo do Dia"
- **Texto**: Versículo bíblico em itálico
- **Referência**: Livro, capítulo e versículo
- **Design**: Glassmorphism com blur effect

## 📚 Sistema de Versículos

### Banco de Versículos
- **Total**: 120 versículos únicos
- **Temas**: Esperança, Fé, Motivação, Fortalecimento
- **Fonte**: Bíblia Sagrada (diversas traduções)

### Rotação Automática
- Ciclo de **120 dias** antes de repetir
- Baseado no dia do ano
- Cálculo automático e determinístico
- Mesmo versículo para todos os usuários no mesmo dia

### Livros Incluídos
- Salmos
- Provérbios
- Mateus
- João
- Filipenses
- Romanos
- Hebreus
- E muitos outros...

## 🔧 Implementação Técnica

### Arquivo de Versículos
```
src/data/versiculos.ts
```

### Estrutura de Dados
```typescript
interface Versiculo {
  texto: string;
  referencia: string;
}
```

### Função de Seleção
```typescript
getVersiculoDoDia(): Versiculo
```

A função:
1. Obtém a data atual
2. Calcula o dia do ano (1-365/366)
3. Aplica módulo 120 para o índice
4. Retorna o versículo correspondente

## 🎨 Design Visual

### Cores Dinâmicas
- Usa a **cor primária** configurada na empresa
- Gradientes e sombras adaptativas
- Visual harmonioso com identidade da marca

### Animações
- **Fade-in** progressivo dos elementos
- **Slide** lateral para o painel esquerdo
- **Spring** animation para o logo
- Sequência temporal coordenada

### Tipografia
- **Saudação**: H2, bold, cor primária
- **Data**: Body2, discreta, 70% opacity
- **Versículo**: H6, itálico, linha height 1.6
- **Referência**: Body2, bold, cor primária

## 📱 Responsividade

### Breakpoints
- **xs (0-899px)**: Layout mobile único
- **md (900px+)**: Layout duas colunas

### Mobile
- Painel de boas-vindas oculto
- Layout tradicional centralizado
- Logo e formulário empilhados

### Desktop
- Painel esquerdo fixo
- Formulário à direita
- Experiência rica e imersiva

## 🔄 Exemplos de Versículos

Alguns dos versículos incluídos:

1. "Tudo posso naquele que me fortalece." - Filipenses 4:13
2. "O Senhor é o meu pastor; nada me faltará." - Salmos 23:1
3. "Porque para Deus nada é impossível." - Lucas 1:37
4. "Confia no Senhor de todo o teu coração." - Provérbios 3:5
5. "Seja forte e corajoso! Não se apavore, nem se desanime." - Josué 1:9

... e mais 115 versículos!

## 🎯 Benefícios

### Para os Usuários
- Mensagem inspiradora ao acessar o sistema
- Momento de reflexão antes do trabalho
- Ambiente profissional com toque humano

### Para a Empresa
- Fortalece valores cristãos
- Ambiente de trabalho positivo
- Identidade visual consistente
- Diferencial competitivo

## 🛠️ Personalização

### Adicionar Novos Versículos
Edite `src/data/versiculos.ts`:

```typescript
export const versiculos: Versiculo[] = [
  // ... versículos existentes
  { 
    texto: "Seu novo versículo aqui", 
    referencia: "Livro 1:1" 
  },
];
```

### Alterar Ciclo de Rotação
Modifique a linha no `getVersiculoDoDia()`:

```typescript
// Altere de 120 para outro número
const indice = diaDoAno % 120;
```

### Personalizar Visual
As cores seguem automaticamente:
- `corPrimaria` da configuração da empresa
- Modifique em `/configuracoes`

## 📊 Distribuição dos Versículos

- **Antigo Testamento**: ~60%
- **Novo Testamento**: ~40%
- **Salmos**: ~30%
- **Livros Paulinos**: ~25%
- **Evangelhos**: ~20%
- **Outros**: ~25%

## 💡 Dicas de Uso

1. Configure cores da empresa para melhor harmonia
2. Use logo de alta qualidade (PNG transparente)
3. Versículos curtos funcionam melhor visualmente
4. Mensagens de esperança para início do dia

## 🐛 Troubleshooting

### Versículo não aparece
- Verifique se está em tela desktop (>900px)
- Limpe cache do navegador

### Layout quebrado
- Reinicie o servidor de desenvolvimento
- Verifique a largura da tela

### Cores não correspondem
- Configure em `/configuracoes`
- Atualize a página após salvar

## 📝 Changelog

### Versão 1.0
- 120 versículos bíblicos
- Layout duas colunas para desktop
- Sistema de rotação automática
- Design responsivo
- Animações suaves
- Integração com configurações

## 🙏 Mensagem Espiritual

Este recurso foi desenvolvido para trazer uma palavra de encorajamento e fé a todos que utilizam o sistema, lembrando que em tudo o que fazemos, podemos contar com a presença e a força de Deus.

> "Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco."
> — 1 Tessalonicenses 5:18
