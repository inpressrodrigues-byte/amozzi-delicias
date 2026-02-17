

# Plano: Corrigir Tela Branca, Imagens Editaveis e Redesign do Admin

## Problemas Identificados

### 1. Tela Branca no Checkout
O carrinho usa estado em memoria (useState). Quando voce navega diretamente para `/checkout` pela barra de endereco, o carrinho esta vazio e a pagina mostra apenas uma tela branca com a mensagem "Seu carrinho esta vazio" -- mas essa mensagem esta la, o problema e que o fundo branco sem contexto visual parece "quebrado". A solucao e:
- **Persistir o carrinho no localStorage** para que nao se perca ao navegar ou recarregar
- **Melhorar a tela de carrinho vazio** com mais contexto visual

### 2. Imagens Editaveis na Pagina Inicial
Atualmente a imagem do hero e estatica (arquivo local `hero-bg.jpg`). O usuario quer poder trocar imagens pelo admin. A solucao e:
- Adicionar campo `hero_image_url` na tabela `site_settings`
- Adicionar upload de imagem do hero na pagina de Personalizacao do admin
- Usar a URL do banco no HeroSection, com fallback para a imagem local

### 3. Redesign da Area Admin
O admin esta funcional mas visualmente basico. Vamos deixar mais polido com:
- Sidebar com gradiente e avatar/nome do admin
- Cards com icones coloridos e micro-animacoes
- Dashboard com indicadores visuais melhores (cores, sombras, bordas arredondadas)
- Tabelas e listas mais organizadas com hover states
- Paleta de cores da marca aplicada ao admin

---

## Detalhes Tecnicos

### Etapa 1: Persistir carrinho no localStorage
**Arquivo:** `src/contexts/CartContext.tsx`
- Inicializar estado do carrinho lendo do `localStorage`
- Salvar no `localStorage` a cada mudanca com `useEffect`
- Isso resolve a tela branca ao acessar `/checkout` diretamente

### Etapa 2: Migracao de banco - hero_image_url
**Migracao SQL:**
- `ALTER TABLE site_settings ADD COLUMN hero_image_url text;`
- Atualizar types automaticamente

### Etapa 3: Upload de imagem do Hero no Admin
**Arquivo:** `src/pages/admin/Settings.tsx`
- Adicionar secao para upload da imagem de fundo do hero
- Preview da imagem atual
- Upload para o bucket `site-assets`

### Etapa 4: HeroSection usar imagem do banco
**Arquivo:** `src/components/public/HeroSection.tsx`
- Usar `settings.hero_image_url` se disponivel, senao fallback para `hero-bg.jpg`

### Etapa 5: Redesign do AdminLayout
**Arquivo:** `src/components/admin/AdminLayout.tsx`
- Sidebar com gradiente rosa/dourado sutil
- Logo estilizada no topo
- Navegacao com icones maiores e indicadores ativos mais visiveis
- Informacao do usuario logado na sidebar
- Bottom nav mobile mais bonita

### Etapa 6: Redesign do Dashboard
**Arquivo:** `src/pages/admin/Dashboard.tsx`
- Cards de estatisticas com gradientes de fundo
- Icones com backgrounds coloridos arredondados
- Secao de lucro com destaque visual maior
- Saudacao com horario do dia ("Bom dia", "Boa tarde")

### Etapa 7: Melhorias visuais nas outras paginas admin
**Arquivos:** `Products.tsx`, `Orders.tsx`, `Finances.tsx`, `Settings.tsx`
- Cards de produtos com layout mais visual (imagem maior)
- Pedidos com timeline visual de status
- Financeiro com cards de resumo mais coloridos
- Settings com layout mais organizado e previews visuais

