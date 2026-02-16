

# AMOZI Delícias no Pote - Site Completo

## Paleta de Cores
- **Rosa Principal (#C65A7C)** - cor destaque
- **Rosa Blush (#E8A7B8)** - detalhes suaves
- **Dourado (#C49A4A)** - acentos e títulos
- **Branco (#FFFFFF)** e **Creme (#F4F1EC)** - fundos

---

## 1. Página Pública (Vitrine)

### Hero / Banner
- Logo AMOZI centralizada com fundo creme
- Frase de destaque e botão "Ver Produtos"

### Catálogo de Produtos
- Cards com foto, nome, descrição e preço de cada sabor
- Filtro por categoria: **Bolos no Pote** e **Marmitas de Torta Salgada**
- Botão "Pedir" em cada produto

### Sobre Nós
- Seção contando a história da AMOZI, missão e valores

### Rodapé
- Links para WhatsApp, redes sociais, informações de contato

---

## 2. Fluxo de Pedido

- Cliente escolhe produtos e quantidade (carrinho simples)
- Ao confirmar, preenche formulário: **Nome Completo, WhatsApp, Endereço, CEP**
- Opção de pagamento online via **Stripe** (cartão)
- Após confirmação, resumo do pedido é enviado para o **WhatsApp** da loja

---

## 3. Área Admin (com login protegido)

### Autenticação
- Registro e login com **email e senha**
- Verificação por e-mail com código (OTP)
- Acesso protegido à área administrativa

### Estoque / Produtos
- Adicionar, editar e remover sabores
- Upload de **imagem** do produto
- Campo de **descrição**
- Preço e categoria (bolo no pote / marmita salgada)
- Marcar como disponível/indisponível

### Financeiro
- **Gastos**: registrar compras de ingredientes com valores
- **Lucros**: definir margem de lucro em % ou R$ sobre cada produto
- **Cálculo automático**: preço sugerido de venda com base no custo + margem
- **Resumo**: total vendido, lucro total, gasto total
- **Gráficos**: visualização de gastos vs lucros ao longo do tempo (barras e linhas)

### Personalização
- Alterar **cores do tema** (usando a paleta da marca)
- Trocar **logo**
- Editar textos da página pública (banner, sobre nós)
- Alterar **formas de pagamento** exibidas
- Configurar número do **WhatsApp** para pedidos

---

## 4. Backend (Lovable Cloud + Supabase)

- Banco de dados para: produtos, pedidos, gastos, configurações do site
- Autenticação de admin
- Storage para imagens dos produtos e logo
- Integração Stripe para pagamentos
- Tudo acessível pelo navegador, sem baixar nada

