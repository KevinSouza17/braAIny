# Responsividade do frontend

## Fundamentos

A estrutura reduz contenção e overflow na origem, não apenas por meio de media queries corretivas:

- `min-width: 0` em itens flex/grid e painéis aninhados; `min-height: 0` em painéis flexíveis com rolagem;
- workspaces ocupam `100dvh` quando apropriado e respeitam a área segura do dispositivo;
- rolagem vertical fica nas áreas que precisam dela; documento sem rolagem horizontal;
- conteúdo longo usa quebra segura (`overflow-wrap: anywhere`);
- imagens e mídia são limitadas ao container; o iframe fica absoluto dentro de um wrapper limitado;
- textareas de composer encolhem sem impor largura mínima;
- ao reduzir a altura visível, conteúdo de boas-vindas não essencial se compacta para preservar a entrada.

## Comportamento por faixa

- **Desktop:** Chat e Preview lado a lado; sidebar completa acima de `1120px` e rail recolhida até esse breakpoint. Ao cruzar para uma viewport menor, a navegação recolhe sem remover o acesso a qualquer modo.
- **769–960px:** workspaces podem se organizar verticalmente com rolagem no documento, sem alargamento horizontal.
- **Até 768px:** Chat e Preview são views exclusivas alternadas pela navegação inferior; o composer de Chat permanece acima dela. Perguntar mantém o composer no rodapé. A sidebar vira drawer com backdrop e fechamento por Escape.
- **Assistente de código em mobile:** layout em coluna; o próprio painel pode rolar para que entrada e resultado continuem acessíveis.
- Toolbars, tabs e chips podem rolar em seu container quando necessário, sem alargar o viewport.

## Validação headless

Chromium headless, com projeto e HTML de preview mockados localmente. Nenhuma chamada de geração ou serviço backend real foi feita nesta matriz.

| Largura | Overflow horizontal | Composer | Iframe ativo | Tabs por teclado |
| --- | --- | --- | --- | --- |
| 320px | nenhum | visível | dentro do viewport | aprovado |
| 375px | nenhum | visível | dentro do viewport | aprovado |
| 390px | nenhum | visível | dentro do viewport | aprovado |
| 430px | nenhum | visível | dentro do viewport | aprovado |
| 768px | nenhum | visível | dentro do viewport | aprovado |
| 1024px | nenhum | visível no grid | dentro do viewport | aprovado |
| 1280px | nenhum | visível no grid | dentro do viewport | aprovado |
| 1440px | nenhum | visível no grid | dentro do viewport | aprovado |
| 1920px | nenhum | visível no grid | dentro do viewport | aprovado |

Em todos os nove tamanhos, `documentElement.scrollWidth` e `body.scrollWidth` corresponderam exatamente à largura do viewport; o iframe ficou dentro da largura/altura útil, e não ocorreram exceções JavaScript nos testes limpos.

A redução simulada da viewport para `390×320px` manteve o composer de Criar e de Perguntar totalmente visível. No Assistente, a área externa continua rolável e permite alcançar a resposta. As áreas de toque relevantes permanecem em pelo menos `44px` quando aplicável.
