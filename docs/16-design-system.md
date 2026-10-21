# Design system do frontend

## Tokens em `frontend/src/styles.css`

Os tokens visuais ficam em `:root`; o tema escuro sobrescreve os valores de superfície, texto, borda, estados e sombras em `:root[data-theme='dark']`.

| Grupo | Tokens | Tema claro de referência |
| --- | --- | --- |
| Fundo e superfícies | `--background`, `--surface`, `--surface-raised`, `--surface-muted`, `--surface-tint` | `#f5f6f8`, `#fff`, `#fff`, `#f8f9fb`, `#f0f2f5` |
| Bordas | `--border`, `--border-strong` | `#e6e8ed`, `#d4d8e0` |
| Texto | `--text`, `--text-muted`, `--text-subtle` | `#191b20`, `#5f6673`, `#68707d` |
| Marca e estados | `--accent`, `--accent-strong`, `--accent-soft`, `--accent-border`, `--success`, `--warning`, `--error` | accent `#b83327`; estados semânticos próprios |
| Raios | `--radius-xs`, `--radius-sm`, `--radius-control`, `--radius-card`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-pill` | escala compartilhada |
| Sombras | `--shadow-sm`, `--shadow-md` | níveis para superfícies e elementos elevados |
| Espaçamento | `--space-1` a `--space-6` | escala base de 4px |

Os valores correspondentes de tema escuro são centralizados no seletor de tema, sem criar aliases por componente. Bordas, espaçamentos e raios recorrentes usam tokens; repetições idênticas foram removidas apenas quando seletor e contexto de mídia coincidiam.

## Arquitetura visual

- **Shell de trabalho:** sidebar em superfície branca, navegação por modo, histórico separado e rodapé de conta/tema. Em larguras intermediárias, uma rail recolhida preserva acesso direto a Criar, Perguntar e Assistente de código.
- **Criação:** header mais compacto; introdução em cartão de onboarding, com fluxo Descreva → Valide → Refine; exemplos como ações em cards; composer sempre distinguido do conteúdo rolável.
- **Preview:** toolbar única com tabs e ações; canvas neutro com browser frame contido, sem ultrapassar o viewport; empty state explícito.
- **Perguntar e Assistente:** preservam os fluxos existentes com hierarquia de cabeçalho, área de conteúdo e entrada próprias.
- **Mobile:** topbar, drawer e navegação inferior; Chat e Preview alternam como views exclusivas para preservar espaço útil.

## Stack de estilos

O frontend usa CSS tradicional com Vite e Autoprefixer. Não há utilities, diretivas `@tailwind` ou `@apply` em uso; não foram adicionadas bibliotecas. Os estilos permanecem em `src/styles.css`, com tokens semânticos centralizados e regras de componente/responsividade organizadas no stack existente.
