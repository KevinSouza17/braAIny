# Refinamento da arquitetura visual do frontend

## Objetivo

Deixar os workspaces Criar, Preview, Perguntar e Assistente de código mais coesos como um produto SaaS, sem adicionar camadas de dependência ou alterar contratos do backend.

## O que mudou

- Superfícies neutras e bordas consistentes; accent vermelho e estados semânticos preservados, agora centralizados nos tokens do design system.
- Header de criação mais compacto e introdução em cartão com hierarquia de título, descrição e etapas; sugestões viraram cards com estados de foco/hover.
- Composer separado do scroll de mensagens e com sombra/foco perceptíveis.
- Canvas do Preview refinado e frame contido por wrapper; toolbar conserva todas as tabs e ações, inclusive com rolagem horizontal local em mobile.
- Sidebar recolhe em larguras intermediárias e mantém rail com acesso a todos os modos; em mobile, o drawer e a navegação inferior preservam as views já existentes.
- O Assistente de código passa a rolar como uma coluna em mobile, permitindo alcançar tanto o editor quanto o resultado.
- O Chat não inicia rolado ao fim quando ainda não há mensagens — correção para que o título de boas-vindas não apareça cortado.

## Escopo e validação

A revisão foi feita no frontend: `App.jsx`, componentes e `styles.css`; nenhum endpoint, payload, contrato ou dependência foi adicionado ou modificado nesta etapa. A decisão de manter CSS tradicional, React e Autoprefixer evita misturar Tailwind sem necessidade.

Build de produção e testes headless da matriz de larguras, viewport baixa, navegação por teclado, iframe e fluxos principais com APIs simuladas estão documentados em [Responsividade](15-responsividade-frontend.md) e [UX/acessibilidade](17-ux-acessibilidade.md).
