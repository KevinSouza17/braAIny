# 3. Roadmap — os próximos 5 passos

Ordem pensada para entregar valor acumulado: cada passo habilita o seguinte.
Esforço estimado para uma pessoa.

---

## Passo 1 — Deploy com um clique (2 a 4 dias)

**O que:** botão "Publicar" que sobe o `index.html` do projeto para um host
estático e devolve uma URL pública (`https://brainy.app/p/{slug}`), usando o
próprio backend como proxy de upload (Netlify/Vercel/Cloudflare Pages API, ou um
bucket S3/Cloudflare R2 com domínio próprio).

**Por que primeiro:** hoje o produto termina em `.zip` — o usuário precisa saber
hospedar. Publicar é o passo que transforma "protótipo" em "resultado
compartilhável", e é a maior lacuna em relação a Bolt/Lovable.

**Entregável:** endpoint `POST /api/projects/{id}/publish`, botão na barra do
preview, domínio público por projeto, com rollback da última publicação.

**Riscos:** custo de hospedagem por projeto; moderação de conteúdo publicado
(precisa de termos de uso e um botão de denúncia desde o dia 1).

---

## Passo 2 — Login, histórico por conta e quotas (3 a 5 dias)

**O que:** autenticação (e-mail + OAuth Google/GitHub), projetos vinculados a
`user_id`, quota de geração por plano e limites de tamanho/rate limit por conta.

**Por que:** sem isso não existe multiusuário, não existe plano pago e não
existe proteção contra abuso — o custo do LLM fica aberto.

**Entregável:** tabela `users`, migração de `projects.user_id`, middleware de
quota, painel "Meu consumo" (chamadas, tokens, custo estimado por projeto).

**Decisão pendente:** manter a escolha de provedor de LLM com o usuário (BYOK,
trazendo sua chave) ou revender créditos com mark-up? BYOK preserva o
posicionamento "sem créditos proprietários"; revender exige uma camada de
billing que é justamente o que o brAIny critica nos concorrentes.

---

## Passo 3 — Planos pagos e billing (3 a 4 dias)

**O que:** assinatura (Stripe ou Mercado Pago para o Brasil), com limites por
plano: número de projetos, gerações/mês, correções automáticas, publicação.

**Por que:** monetização — e porque o passo 1 e 2 são pré-requisitos técnicos
dele.

**Entregável:** checkout, webhook de assinatura, gate de features, página de
faturamento, teste de upgrade/downgrade/cancelamento.

**Cuidado:** o custo variável é o LLM. O plano precisa embutir margem sobre o
pior caso (modelo caro + muitas autocorreções), ou limitar o modelo por plano.

---

## Passo 4 — Templates e "começar de algo" (2 a 3 dias)

**O que:** biblioteca de pontos de partida testados (landing, portfólio,
dashboard, formulário, jogo de plataforma, snake, quiz, app de tarefas) que não
passam por geração — são arquivos versionados no repositório, já validados pelo
pré-flight.

**Por que:** é o maior ganho de qualidade e confiabilidade por real investido:
template é determinístico, custa zero de LLM e nunca "alucina". Também é o que
permite cobrar mais barato em planos de entrada.

**Entregável:** `templates/` no repositório + galeria na UI + botão "usar como
base"; cada template com um teste automatizado no CI que roda o pré-flight.

---

## Passo 5 — Projetos multi-arquivo de verdade e também geração de backend leve (5 a 10 dias)

**O que:** evoluir do HTML único para um projeto com `index.html`, `styles.css`,
`app.js` e assets separados (o montador de preview já embute esses arquivos), e
opcionalmente um **backend local opcional** gerado junto: `server.py` (FastAPI)
com SQLite e `POST/GET` para persistência, executável com um comando.

**Por que:** é o limite natural do brAIny hoje. Apps de lista de tarefas sem
persistência são brinquedos. Também abre a porta para o passo seguinte
(Git/GitHub) e para projetos que migram suavemente para código mantido à mão.

**Entregável:** projeto com múltiplos arquivos navegáveis na aba "Código",
`README` de execução local, `docker-compose.yml` opcional, e um teste de fumaça
que sobe o backend gerado, chama os endpoints e derruba.

---

## Backlog contínuo (não é passo, mas não se esquece)

- **Isolamento mais forte do preview:** servir o preview em domínio separado e,
  quando disponível, executar em container com `seccomp`/`gVisor`.
- **Streaming de geração** para reduzir a percepção de espera (hoje 30–120 s).
- **Fila assíncrona** (RQ/Arq/Celery) + WebSocket para geração como job, com
  cancelamento.
- **GitHub sync** (exportar/importar repositório), respondendo ao padrão do
  mercado.
- **Cache de pré-flight** e deduplicação de gerações idênticas (economia direta).
- **Métricas de qualidade por modelo**: taxa de autocorreção por modelo, para
  escolher o melhor custo-benefício com dados, não com intuição.
- **Acessibilidade do gerado**: checagem automática (contraste, `alt`, labels)
  como parte do pré-flight.