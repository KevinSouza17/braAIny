# brAIny — Resumo executivo

**O que é.** Um protótipo funcional de plataforma web em que o usuário descreve
em português o que quer e recebe **pronto**: site, app de página única, jogo 2D,
imagem ou correção de código — com preview ao vivo, refino por conversa,
histórico e exportação em `.zip`.

**O problema que ataca.** As ferramentas de "vibe coding" (Lovable, Bolt, Replit
Agent, v0) entregaram a mesma promessa e tropeçam nos mesmos dois pontos: **o
código gerado quebra e o usuário não descobre por quê**, e **o resultado fica
preso à stack, ao host e aos créditos da plataforma**. Relatos de "pedi para
corrigir um bug e ele criou dois" são o padrão, não a exceção.

**A tese.** Em vez de competir por amplitude de stack (backend, banco, auth,
deploy — território de Lovable e Replit), o brAIny compete por **confiabilidade
do que entrega**: ele executa o próprio resultado, escuta o console e se corrige
antes de mostrar.

## Como o diferencial é implementado (e não só prometido)

| Camada | O que acontece | Por que importa |
|---|---|---|
| **Pré-flight (servidor, determinístico)** | Cada `<script>` gerado é validado com `node --check`; estrutura e regras do sandbox são checadas | Erro de sintaxe — causa nº 1 de tela branca — é detectado **sem navegador** e corrigido antes do usuário ver |
| **Runtime (navegador, com erro real)** | Um harness no iframe captura `window.onerror`, promessas rejeitadas e `console.error` e devolve ao backend | O modelo corrige a **causa raiz com evidência**, não por adivinhação |
| **Anti-loop** | Cada conjunto de erros vira uma assinatura (hash); a mesma assinatura não gera segunda correção | Impede o laço infinito de "corrige e piora", que é o defeito mais citado no mercado |
| **Edição incremental** | Refino por operações cirúrgicas `find/replace` verificadas (fallback para reescrita se falharem) | "Deixa o botão maior" não recria o projeto inteiro |
| **Transparência** | Abas de Console e Log técnico mostram cada geração, aviso e correção | O usuário vê o que aconteceu; o comportamento é auditável no banco |

**Agnóstico de provedor:** GPT-5, Claude, Gemini ou um modelo local
(Ollama/vLLM) — trocar é mudar uma variável de ambiente. Nenhum concorrente
oferece isso, e é o que permite custo marginal zero na prototipagem.

**Artefato sem build:** o resultado é um HTML autocontido que abre com duplo
clique e roda em qualquer host estático. Sem `node_modules`, sem lock-in.

## Estado atual — o que existe hoje

- **Backend FastAPI** completo: geração, refino, autocorreção, assistente de
  código, imagens, histórico, export `.zip`, `/docs` interativo.
- **Frontend React/Vite/Tailwind** com identidade visual própria (marca, paleta
  violeta/ciano, tema escuro), chat, preview em iframe sandbox, abas de código,
  console e log técnico.
- **Segurança por padrão:** código gerado nunca roda no servidor; preview em
  origem opaca com CSP restritiva; SVG sanitizado; chaves só no backend.
- **Testes:** suíte de cenários reais de ponta a ponta (site, jogo, app, imagem,
  correção de bug, autocorreção com erro de runtime, refino incremental) +
  testes unitários das partes determinísticas.

**Resultado da última execução: 7 de 7 cenários aprovados** — site, jogo, app,
imagem, correção de bug, autocorreção com erro real de runtime e refino
incremental — em cerca de 4 minutos, com `gpt-5-mini`. Somam-se **31 testes
unitários** das partes determinísticas (todos passando). Detalhes, evidências e
os 5 bugs reais que os próprios testes encontraram estão em
[04-testes.md](04-testes.md).

## O que o protótipo NÃO faz (honestidade obrigatória)

Não gera backend/banco/autenticação/pagamentos. Não faz deploy com um clique
(apenas `.zip`). Não tem login, multiusuário, quotas nem cobrança. Não integra
Git. Não gera app nativo. A geração é síncrona (30–120 s) e sem streaming. A
autocorreção só encontra o que aparece no console — bug de lógica silencioso não
é detectado automaticamente.

## Próximos passos (detalhe em 03-roadmap.md)

1. **Deploy com um clique** — publicar o resultado e devolver URL pública.
2. **Login + histórico por conta + quotas** — pré-requisito de qualquer cobrança.
3. **Planos pagos** (Stripe/Mercado Pago) com limite de projetos e gerações.
4. **Templates testados** — maior ganho de confiabilidade por real investido.
5. **Multi-arquivo real e backend leve opcional** — persistência de verdade.

## Veredito

O brAIny é um MVP coerente e demonstrável: a promessa central — *gerar, executar,
detectar o erro e se corrigir sozinho* — está implementada em duas camadas e
verificada por testes, não apenas descrita. O caminho para produto está mapeado
em cinco passos, e a maior parte do trabalho restante é de produto (deploy,
contas, cobrança), não de pesquisa.
