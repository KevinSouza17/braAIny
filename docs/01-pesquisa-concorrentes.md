# 1. Pesquisa de concorrentes e posicionamento do brAIny

> Pesquisa feita em outubro de 2026 com base em material público dos próprios
> fornecedores e em análises independentes (fontes ao final). Preços e planos
> mudam com frequência — confirme sempre na página oficial.

## 1.1 O mercado em uma frase

Todas as ferramentas analisadas resolvem o mesmo problema — encurtar a distância
entre "eu descrevo" e "está funcionando" — e todas esbarram nos mesmos dois
limites: **o código gerado quebra e o usuário não vê por quê**, e **você só
consegue o que a plataforma escolher gerar** (stack, hospedagem, créditos).

## 1.2 Comparativo

| | **Lovable** | **Bolt.new** | **Replit Agent** | **v0 (Vercel)** | **brAIny** |
|---|---|---|---|---|---|
| Modelo de interação | Agent Mode + Chat Mode + Visual Edits | Prompt → app (Plan Mode / Build Now) | Agente + IDE completo com terminal | Prompt → componente/UI, com evolução para full-stack | Chat com preview ao vivo + edição por conversa |
| O que sai | React/TS/Tailwind + Supabase (auth, DB, Edge Functions, Stripe) | Full-stack JS (Node/Express), vários frameworks de frontend | Full-stack multi-linguagem (50+), runtime real | Componentes React/Next + shadcn/ui, CLI `npx v0 add` | **HTML/CSS/JS autocontido** (site, app ou jogo) — sem build |
| Execução do resultado | Preview no navegador | WebContainers (StackBlitz) no navegador | Runtime real no servidor | Preview no navegador | **iframe sandbox com CSP + harness que lê o console** |
| Diagnóstico de erro | O agente depura "explorando o código" | Debug em tempo real no editor | Logs e execução de migrações | Feedback visual imediato | **Erros reais do console capturados e devolvidos ao modelo** |
| Deploy | Lovable Cloud / exporta p/ Vercel e Netlify via GitHub | `.bolt.host`, Netlify | 4 tipos de deploy, domínio próprio | Vercel | Exporta `.zip` estático (deploy é roadmap) |
| Preço de entrada | Free: 5 créditos/dia (até 30/mês); Pro US$ 25/mês | Free: 300K tokens/dia (1M/mês); Pro a partir de US$ 25/mês | Starter grátis com créditos diários; Core US$ 20/mês; Pro US$ 100/mês | Free tier + planos pagos | **Só o custo do provedor de LLM que você escolher** |
| Limitações declaradas | Só React/TS/Tailwind; sem app nativo; "os últimos 10% dão trabalho" | Backend só Node/Express; saída às vezes "pela metade" | Complexidade do IDE; histórico de loops de bug consumindo créditos | Foco em UI; lock-in do ecossistema Vercel | Sem backend/DB/auth gerados; sem Git; sem deploy 1-clique |

## 1.3 Padrões que se repetem (o que já é commodity)

1. **Chat como interface** — ninguém mais discute isso; é o padrão.
2. **Preview ao vivo** ao lado do código.
3. **Edição por conversa** depois da primeira geração.
4. **Créditos/tokens como unidade de cobrança** — e, por consequência, medo de
   iterar (o usuário economiza tentativas em vez de resolver o problema).
5. **Integração com GitHub** para "não ficar preso".

## 1.4 Problemas que a pesquisa expõe (e que o brAIny ataca)

| Problema relatado | Evidência | Como o brAIny trata |
|---|---|---|
| "Pedi para a IA corrigir um bug e ela introduziu dois" | Citado como desafio comum das três principais ferramentas | O brAIny **executa** o que gerou, captura o erro real do console e só encerra quando o erro desaparece — com limite de tentativas e **bloqueio anti-loop** por assinatura de erro |
| Falha silenciosa: a tela fica branca e o usuário não sabe o motivo | Nenhuma das ferramentas expõe um console do código gerado ao usuário final | Aba **Console** com o log real do iframe + **Log técnico** com cada tentativa de autocorreção |
| Créditos acabam no meio da iteração | Modelo de cobrança por crédito de todas as plataformas | Provedor de LLM **configurável por variável de ambiente**, incluindo modelos locais (Ollama/vLLM) — custo marginal zero possível |
| Lock-in de stack, host e ferramenta | Lovable (React+Supabase), v0 (Vercel), Bolt (Node only) | O artefato é **um HTML autocontido**: abre com duplo clique, roda em qualquer host estático, e o modelo pode ser trocado sem tocar no código |
| "Você só entende o que aconteceu se confiar na plataforma" | Caixa-preta do agente | **Transparência por padrão**: eventos de geração, pré-flight, correções e avisos visíveis na UI e no banco |

## 1.5 Posicionamento do brAIny

> **brAIny não compete por amplitude de stack; compete por confiabilidade do que
> entrega.** É a ferramenta para quem precisa de um resultado pequeno, real e
> verificável em minutos — um site, um jogo, um utilitário, uma imagem — com
> prova de que funciona (o console) em vez de promessa.

Cinco diferenciais concretos:

1. **Autocorreção com evidência, em duas camadas.** Pré-flight determinístico no
   servidor (`node --check` + regras estruturais) *antes* de mostrar, e correção
   com os erros reais de runtime *depois*, pelo harness do iframe.
2. **Agnóstico de provedor.** GPT-5, Claude, Gemini ou modelo local — trocar é
   mudar uma variável de ambiente. Nenhum concorrente oferece isso.
3. **Artefato sem build.** O que sai é `index.html` (e opcionalmente
   `styles.css`/`app.js`) que funciona aberto direto no navegador, sem
   `node_modules` e sem etapa de build para o usuário final.
4. **Sem créditos proprietários.** Você paga o provedor que escolher, direto.
   Para prototipagem com modelo local, o custo é zero.
5. **Honestidade embutida.** A UI mostra as tentativas de correção e os avisos
   que permaneceram; a documentação lista o que o protótipo **não** faz.

## 1.6 Onde o brAIny é claramente inferior (e é honesto sobre isso)

- **Não gera backend, banco, autenticação nem pagamentos** — Lovable e Replit
  fazem isso bem. O brAIny gera front-end autocontido.
- **Não tem sincronização com Git nem colaboração em equipe.**
- **Não tem deploy com um clique** (apenas export `.zip`).
- **Não gera app nativo** (nem Lovable gera; Replit vai mais longe).
- **É um protótipo de usuário único**, sem login, sem multiusuário, sem quotas.

## 1.7 Fontes

- Lovable — *Bolt vs Replit vs Lovable (2026)*: https://lovable.dev/guides/bolt-vs-replit-vs-lovable
- Addy Osmani — *AI-Driven Prototyping: v0, Bolt, and Lovable Compared*: https://addyo.substack.com/p/ai-driven-prototyping-v0-bolt-and
- MindStudio — *Vercel v0 vs Bolt: Generating UIs vs Building Full Apps*: https://www.mindstudio.ai/blog/vercel-v0-vs-bolt
- Replit — *Replit vs v0: the complete comparison guide*: https://replit.com/discover/replit-vs-v0
- UI Bakery — *Best v0.dev Alternatives in 2026*: https://uibakery.io/blog/vercel-v0-alternatives
- Lovable — *Pricing*: https://lovable.dev/pricing