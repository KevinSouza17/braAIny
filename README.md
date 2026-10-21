# brAIny — do pedido ao pronto

Protótipo funcional de uma IA que transforma pedidos em linguagem natural em
**coisas prontas**: sites, apps web, jogos 2D, imagens e código — com preview ao
vivo, refino por conversa e **autocorreção** (o brAIny executa o que gerou,
escuta o console e se corrige antes de te mostrar).

```
Você: "faça um jogo da cobrinha com pontuação e controles de toque"
brAIny: [gera o código] → [valida sintaxe] → [executa no sandbox] →
        [captura: "Uncaught TypeError ..."] → [corrige] → [executa limpo] →
        preview jogável + código + .zip
```

---

## 1. Rodar em menos de 5 minutos

### Pré-requisitos

- Python 3.11+
- Node.js 18+ (apenas para compilar a interface uma vez; em dev, para o Vite)
- Uma chave de LLM compatível com a API OpenAI (OpenAI, Groq, OpenRouter,
  Together, ou um modelo local em Ollama/vLLM)

### Três comandos

```bash
# 1. configure a chave do modelo
cp .env.example .env
#    edite .env e preencha: BRAINY_LLM_BASE_URL, BRAINY_LLM_API_KEY, BRAINY_LLM_MODEL

# 2. suba tudo (cria venv, instala, compila o frontend na primeira vez)
./scripts/run.sh

# 3. abra no navegador
#    http://localhost:8080
```

Se preferir o modo desenvolvimento (hot reload nos dois lados):

```bash
./scripts/dev.sh     # API em :8080 · UI em :5173 com proxy de /api
```

### Rodando dentro de um ambiente que já tem as chaves (ex.: sandbox Manus)

As variáveis `OPENAI_API_BASE` e `OPENAI_API_KEY` são reconhecidas
automaticamente — nesse caso nem é necessário criar o `.env`:

```bash
.venv/bin/pip install -r backend/requirements.txt
(cd frontend && npm install && npm run build)
(cd backend && ../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8080)
```

---

## 2. Variáveis de ambiente

Todas ficam em `.env` (na raiz). O frontend **nunca** vê chave nenhuma.

| Variável | Padrão | Para que serve |
|---|---|---|
| `BRAINY_LLM_BASE_URL` | `OPENAI_API_BASE` ou `https://api.openai.com/v1` | Endpoint compatível com Chat Completions |
| `BRAINY_LLM_API_KEY` | `OPENAI_API_KEY` | Credencial do provedor |
| `BRAINY_LLM_MODEL` | `gpt-5-mini` | Modelo. Bons candidatos: `gpt-5-mini` (barato), `gpt-5.5`, `claude-sonnet-4-6`, `gemini-3.1-pro-preview`, `qwen2.5-coder` (local) |
| `BRAINY_LLM_EFFORT` | `low` | Esforço de raciocínio em modelos GPT-5 (`minimal`…`high`) |
| `BRAINY_LLM_MAX_TOKENS` | `12000` | Teto de tokens de saída por chamada |
| `BRAINY_LLM_TIMEOUT` | `240` | Timeout em segundos |
| `BRAINY_LLM_RETRIES` | `2` | Tentativas adicionais (0–5); retries automáticos ficam limitados a 429 do provedor |
| `BRAINY_ALLOWED_MODELS` | `BRAINY_LLM_MODEL` | Allowlist de IDs separados por vírgula; o backend valida cada solicitação |
| `BRAINY_MODEL_PRICES_JSON` | `{}` | Preços reais por modelo, por 1.000 tokens de entrada/saída; obrigatório em produção para todos os modelos permitidos |
| `BRAINY_IMAGE_PRICES_JSON` | `{}` | Preço real por imagem para o modelo raster configurado; obrigatório em produção para provedor raster |
| `BRAINY_GLOBAL_MONTHLY_BUDGET_USD` | vazio | Teto global mensal aprovado; obrigatório em produção. Sem tarifa conhecida, não é exibido custo inventado |
| `BRAINY_PLAN_USAGE_QUOTAS_JSON` | `{}` | Overrides mensais por plano e operação; limites não listados mantêm os padrões do código |
| `BRAINY_USER_USAGE_QUOTAS_JSON` | `{}` | Overrides mensais por ID interno de usuário e operação; IDs de usuário não são e-mails nem tokens |
| `BRAINY_IMAGE_PROVIDER` | `svg` | `svg` (grátis, o LLM escreve o SVG) ou `openai` (usa `/images/generations`, com fallback automático para SVG) |
| `BRAINY_IMAGE_BASE_URL` / `_API_KEY` / `_MODEL` / `_SIZE` | — | Provedor de imagem, quando `openai` |
| `BRAINY_MAX_REPAIR_ATTEMPTS` | `3` | Quantas autocorreções antes de mostrar o resultado |
| `BRAINY_DATA_DIR` / `BRAINY_DB_PATH` | `./data` · `./data/brainy.db` | Onde ficam banco e imagens |
| `BRAINY_HOST` / `BRAINY_PORT` | `0.0.0.0` / `8080` | Endereço do servidor |
| `BRAINY_ENV` | `development` | Use `production` para exigir CORS explícito |
| `BRAINY_CORS_ORIGINS` | vazio | Origens HTTPS separadas por vírgula em produção |
| `BRAINY_RATE_LIMIT_REQUESTS` / `_WINDOW` | `30` / `60` | Limite de mutações por IP/endpoint e janela em segundos |

As quotas de tokens e operações são contadas por usuário no período mensal UTC, com reservas atômicas antes das chamadas ao modelo. O preço estimado só aparece quando a tabela de preços configurada cobre todas as chamadas contabilizadas; timeouts ou chamadas sem preço tornam a estimativa incompleta, não zero. O valor é uma estimativa local e não uma fatura do provedor. O teto global inclui chamadas reservadas simultâneas; ele só limita custo quando os preços aplicáveis estão configurados. Em produção, o startup falha se allowlist, preços, orçamento global ou preço do modelo de imagem raster forem necessários e estiverem ausentes.

Exemplos de configuração:

```bash
# OpenAI (padrão)
BRAINY_LLM_BASE_URL=https://api.openai.com/v1
BRAINY_LLM_API_KEY=sk-...
BRAINY_LLM_MODEL=gpt-5-mini

# Modelo local (custo zero, privacidade total)
BRAINY_LLM_BASE_URL=http://localhost:11434/v1
BRAINY_LLM_API_KEY=ollama
BRAINY_LLM_MODEL=qwen2.5-coder:14b

# Groq (rápido e barato)
BRAINY_LLM_BASE_URL=https://api.groq.com/openai/v1
BRAINY_LLM_API_KEY=gsk_...
BRAINY_LLM_MODEL=llama-3.3-70b-versatile
```

---

## 3. Como usar

1. **Criar** — escolha um tipo (Automático / Site / App / Jogo / Imagem) ou
   clique num exemplo, descreva o que quer e clique em **Criar**. A geração leva
   de **30 a 120 segundos** (é uma chamada de LLM; a UI mostra as etapas).
2. **Ver** — o painel direito mostra o **Preview** rodando em iframe isolado. As
   abas dão acesso ao **Código**, ao **Console** (mensagens reais do código
   gerado) e ao **Log técnico** (gerações, pré-flight, autocorreções).
3. **Ajustar** — continue a conversa: *"deixa o botão maior"*, *"adiciona
   pontuação"*, *"muda a cor de destaque para verde"*. O brAIny aplica edições
   cirúrgicas (`ops`) e mostra quantos trechos mudou, em vez de recriar tudo.
4. **Baixar** — o ícone de download gera um `.zip` com o projeto + `README.md`
   de uso. Não há build: abra `index.html` e funciona.
5. **Assistente de código** — aba "Código", na barra lateral: cole um trecho e
   peça para explicar, corrigir bugs, refatorar ou revisar.

### O que a autocorreção faz na prática

- **Antes de mostrar (servidor):** valida cada `<script>` com `node --check` e
  checa estrutura (`<html>`/`<body>`, `localStorage` proibido, `<script src>`
  local não embutido). Erro → corrige e revalida, até 3 vezes.
- **Depois de mostrar (navegador):** o harness do iframe devolve `window.onerror`,
  rejeições de promise e `console.error`; o brAIny corrige a causa raiz e
  recarrega o preview. A **mesma assinatura de erro não dispara correção duas
  vezes** — é assim que ele não entra em loop.

---

## 4. Estrutura do projeto

```
brainy/
├── README.md                     ← você está aqui
├── .env.example                  ← todas as variáveis, comentadas
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py               ← rotas FastAPI
│       ├── config.py             ← configuração por env
│       ├── db.py                 ← SQLite (stdlib), 5 tabelas
│       ├── llm.py                ← cliente LLM OpenAI-compatível
│       ├── prompts.py            ← prompts + regras do sandbox + schemas JSON
│       ├── sandbox.py            ← montagem do preview, harness e pré-flight
│       ├── generators.py         ← geração, refino incremental, autocorreção
│       └── images.py             ← provedor de imagem + fallback SVG sanitizado
├── frontend/                     ← React + Vite + Tailwind (identidade do brAIny)
│   └── src/{App.jsx,api.js,components/,lib/}
├── docs/
│   ├── 00-resumo-executivo.md
│   ├── 01-pesquisa-concorrentes.md
│   ├── 02-arquitetura.md         ← diagramas Mermaid + decisões
│   ├── 03-roadmap.md             ← próximos 5 passos
│   ├── 04-testes.md              ← cenários reais, com resultados
│   └── diagramas/                ← .mmd (fonte) e .png (renderizado)
├── scripts/
│   ├── run.sh                    ← sobe tudo
│   ├── dev.sh                    ← modo desenvolvimento
│   └── test_scenarios.py         ← suíte de cenários reais
└── data/                         ← brainy.db + imagens geradas (criado em runtime)
```

---

## 5. Testes

```bash
# com a API rodando em :8080
PYTHONPATH=backend .venv/bin/python scripts/test_scenarios.py

# ou um cenário específico
PYTHONPATH=backend .venv/bin/python scripts/test_scenarios.py --only 1,2
```

A suíte cobre 7 cenários (site, jogo, app, imagem, correção de bug, autocorreção
com erro de runtime e refino incremental) e escreve o resultado bruto em
`docs/testes/resultado.json`. Os resultados da última execução estão em
[`docs/04-testes.md`](docs/04-testes.md).

Testes unitários das partes determinísticas (montagem de preview, pré-flight,
ops de refino, assinatura de erros, persistência) — não chamam LLM e rodam em
menos de um segundo:

```bash
cd backend && ../.venv/bin/python -m pytest tests -q     # 31 passed
```

**Último resultado da suíte de cenários: 7/7 aprovados** (~4 min no total, com
`gpt-5-mini`). A execução encontrou e documentou 5 bugs reais no protótipo, todos
corrigidos com teste de regressão — veja a seção 4.4 de `docs/04-testes.md`.

---

## 6. Limitações conhecidas (leia antes de usar)

**O que o protótipo faz:** gera sites, apps de página única e jogos 2D em
HTML/CSS/JS autocontido; gera imagens (SVG por código, ou API externa se
configurada); explica/corrige/refatora/revisa código colado; guarda histórico;
exporta `.zip`; se autocorrige com base em erros reais.

**O que o protótipo NÃO faz — seja honesto consigo mesmo sobre isto:**

1. **Não gera backend, banco de dados, autenticação nem pagamentos.** Os apps
   criados são client-side. Persistência entre sessões não existe.
2. **Não faz deploy com um clique.** Só exporta `.zip` (passo 1 do roadmap).
3. **Não tem login, multiusuário, quotas ou cobrança.** É um protótipo local de
   usuário único; o banco é um arquivo SQLite.
4. **Não integra com Git/GitHub nem permite edição colaborativa.**
5. **Não gera aplicativos móveis nativos** (só web responde a toque).
6. **Não executa `npm install` nem build no projeto gerado** — por design, o
   artefato não tem dependências locais além de CDNs opcionais.
7. **A geração é síncrona e sem streaming** (30–120 s por criação, dependendo do
   modelo). Não há fila: gerações simultâneas competem pela mesma worker.
8. **O preview roda JavaScript de verdade no seu navegador** — isolado por
   sandbox e CSP, mas ainda é código de terceiros (no caso, do modelo).
9. **A qualidade depende do modelo escolhido.** Com `gpt-5-mini` funciona bem;
   com modelos pequenos locais, a taxa de autocorreção sobe.
10. **A autocorreção não é onisciente.** Ela corrige o que aparece no console.
    Bug de lógica que não gera erro (ex.: cálculo errado sem exceção) não é
    detectado automaticamente — está no roadmap como checagem de acessibilidade
    e testes de comportamento.

---

## 7. Segurança

- O código gerado **nunca** é executado no servidor. A validação usa
  `node --check`, que faz parsing sem executar.
- O preview roda em `iframe sandbox` **sem `allow-same-origin`** (origem opaca,
  sem acesso ao app) e recebe `Content-Security-Policy` restritiva, impedindo
  requisições arbitrárias e navegação do topo.
- SVGs gerados passam por sanitização (sem `<script>`, `on*`, `javascript:` ou
  `href` externo).
- Chaves de API vivem apenas no `.env` do backend.
- **Endurecimento para produção:** defina `BRAINY_ENV=production` e
  `BRAINY_CORS_ORIGINS`; a API aplica headers de segurança, rate limit e
  idempotência compartilhados pelo banco MySQL gerenciado. A fila de jobs usa
  claims transacionais e leases recuperáveis, sem depender de Redis ou do disco
  efêmero do container.

---

## 8. Documentação

| Documento | Conteúdo |
|---|---|
| [Resumo executivo](docs/00-resumo-executivo.md) | Uma página: problema, solução, diferenciais, estado e próximos passos |
| [Pesquisa de concorrentes](docs/01-pesquisa-concorrentes.md) | Lovable, Bolt, Replit, v0 — e o posicionamento do brAIny |
| [Arquitetura](docs/02-arquitetura.md) | Diagramas, componentes, ciclo de autocorreção, decisões e segurança |
| [Roadmap](docs/03-roadmap.md) | Os próximos 5 passos, com esforço e riscos |
| [Testes](docs/04-testes.md) | 7 cenários reais executados, com evidências |
| [Auditoria de produção](docs/05-auditoria-produção.md) | Status por área, riscos, P0/P1/P2, LGPD e monetização |
