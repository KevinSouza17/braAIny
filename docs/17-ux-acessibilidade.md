# UX e acessibilidade básica

## Estados de interface

- **Histórico de projetos:** loading, vazio, falha com ação para tentar de novo e busca sem resultados.
- **Chat Perguntar:** loading/erro/recuperação do histórico; composer conserva mensagens e mostra falhas da solicitação; conversa sem histórico mantém sugestões de início.
- **Assistente de código:** análise em andamento, erro anunciado e resultado concluído identificado.
- **Preview:** sem projeto, carregamento do iframe, aviso quando não abre e estados de validação; ações sem projeto ficam desabilitadas.
- **Projeto removido/inexistente:** respostas HTTP 404 resultam em mensagem explícita, em vez de erro genérico.
- **Sucesso:** criação/edição usa confirmação não modal; análises concluídas ficam identificadas.

Mensagens de erro e sucesso têm semântica `role`/`aria-live` adequada. Campos de entrada, ações apenas com ícones, busca, anexos, alternâncias e áreas de conteúdo têm nomes ou descrições acessíveis. O toggle de pesquisa web expõe `aria-pressed`.

## Teclado e estados de controles

- Botões nativos continuam utilizáveis com Enter/Espaço; itens do histórico usam botão real separado da ação de excluir.
- Abas do preview suportam setas esquerda/direita e Home/End, com foco roving.
- O drawer móvel contém o foco e fecha com Escape; Escape devolve o foco ao acionador. Sidebar fechada fica `inert` no mobile.
- O modal de calibração tem nome/descrição acessíveis, foco inicial, contenção de Tab e fechamento com Escape.
- `:focus-visible`, `:active`, `:disabled` e estados selecionados têm feedback visual. Controles móveis relevantes têm pelo menos 44px.

## Contraste dos tokens revisados

Contraste calculado com luminância relativa WCAG 2.1:

| Par de referência | Razão |
| --- | ---: |
| Texto principal / superfície branca | 17,23:1 |
| Texto muted / superfície branca | 5,78:1 |
| Texto subtle / fundo claro | 4,62:1 |
| Warning / superfície branca | 6,13:1 |
| Success / superfície muted | 5,24:1 |
| Accent / superfície branca | 5,93:1 |
| Texto subtle no tema escuro / superfície escura | 7,37:1 |

## Validação

- `npm run build`: aprovado após as alterações finais.
- Chromium headless: larguras `320`, `375`, `390`, `430`, `768`, `1024`, `1280`, `1440` e `1920px`; nenhum overflow horizontal.
- Composer de Criar/Perguntar permaneceu visível com altura simulada de `320px`; Assistente em viewport reduzida manteve entrada e resultado alcançáveis por rolagem interna.
- Projeto/iframe mockados: iframe contido no viewport e navegação das tabs por teclado aprovada.
- Smoke funcional com API simulada: sugestão e criação, preview, refinamento, Perguntar e análise de código percorreram os fluxos esperados, sem exceções JavaScript.
- Os testes são locais/headless; não alteram o backend, não enviam chamadas reais de geração e não usam dados reais.
