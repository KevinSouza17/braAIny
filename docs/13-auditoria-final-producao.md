# Auditoria final de produção — brAIny

- **Data:** 2026-10-07
- **Escopo:** segurança, infraestrutura, IA, performance, observabilidade, testes e prontidão operacional.
**Método:** inspeção estática dos módulos críticos, revisão independente somente leitura e execução local da suíte/build. **Nenhum arquivo de aplicação foi alterado durante a auditoria.**

> **Atualização de implementação — 2026-10-09:** este relatório é um snapshot histórico, não o estado atual completo. Os P0 de ownership, banco obrigatório e guardrails de configuração foram implementados. Rate limit, idempotência e fila/leases de jobs agora usam coordenação compartilhada por MySQL, sem Redis. Uploads e SVGs gerados usam Storage gerenciado em produção; assets standalone também persistem `owner_id`. Cookies de sessão/CSRF usam `SameSite=None; Secure` em HTTPS público por proxy, mantendo tratamento compatível com HTTP local. Consulte `docs/02-arquitetura.md`, `docs/04-testes.md`, `docs/09-jobs-assincronos.md` e `docs/14-hardening-p0.md` para a arquitetura atual. As conclusões restantes deste snapshot continuam evidência histórica, não foram declaradas corrigidas por este aviso.

## 1. Veredito executivo

> **NO-GO para produção comercial/multi-instância no estado atual.**

A base evoluiu significativamente e já possui CSRF, ownership parametrizado, hardening de uploads, CSP/sandbox, rate limiting distribuído, idempotência, quotas, jobs assíncronos, SSE, proteção contra prompt injection, gerenciamento de contexto e uma suíte E2E determinística. Porém, ainda existem bloqueadores **P0** relacionados a isolamento de tenant, persistência e configuração fail-closed.

A aplicação pode continuar como **MVP técnico controlado**, desde que o ambiente seja explicitamente single-node/desenvolvimento e não seja tratado como produção durável ou multiusuário de alta confiança.

## 2. Evidências de validação

| Verificação | Resultado |
|---|---:|
| `python3 -m pytest tests -q` em `backend/` | **113 passed**, 4 warnings, 4,75 s |
| `python3 -m compileall -q backend/app backend/tests` | **OK** |
| `git diff --check` | **OK** |
| `npm run build` em `frontend/` | **OK**, Vite 5.4.21; bundle JS 186,02 kB |
| Estado Git após auditoria | **limpo**, branch `main` |
| Provedores externos nos testes | Não necessários; E2E usa mocks/fakes |

Os testes verdes demonstram regressão funcional na suíte existente, mas não comprovam prontidão multi-instância. Ainda faltam testes reais de MySQL, Redis, OAuth, storage gerenciado, crash/restart e carga.

## 3. Achados críticos — P0

### P0-S1 — Autenticação/tenant fail-open e criação anônima de operações caras

- **Evidência:** `backend/app/main.py`, `_owner_id()` e `_idempotency_user_key()`; rotas `POST /api/projects` e `POST /api/images`; `_enqueue_job()`.
- Quando a autenticação não está configurada, `_owner_id()` retorna `None`, permitindo consultas sem tenant. Quando está configurada, as rotas caras de criação não chamam obrigatoriamente `auth.require_user()` antes de enfileirar.
- **Impacto:** risco de dados globais entre usuários em modo sem OAuth, criação de jobs anônimos e consumo de LLM/imagem sem principal verificado. Isso combina isolamento insuficiente com abuso de custo.
- **Recomendação:** em produção, exigir principal autenticado para toda operação cara e tornar `owner_id` obrigatório. Se guest for uma decisão de produto, usar um tenant guest explicitamente segregado, com limites e sem acesso a dados de usuários autenticados. Adicionar testes de POST anônimo para projetos, imagens, assets e jobs.

### P0-I1 — Banco de produção pode cair silenciosamente em SQLite local

- **Evidência:** `backend/app/db.py`, `_Connection()` e `init_db()`; `Dockerfile`; `.env.example`.
- Qualquer `DATABASE_URL` ausente ou não reconhecida faz o backend usar SQLite local. O container apenas cria `/app/data`, sem persistência declarada.
- **Impacto:** perda de dados em recriação do container, divergência entre réplicas, jobs/quotas inconsistentes e ausência de durabilidade.
- **Recomendação:** exigir explicitamente MySQL/MariaDB gerenciado com TLS em produção; rejeitar SQLite fora de um modo single-node declarado; usar migrations versionadas; configurar backup, restore testado e storage persistente.

### P0-PROD1 — Defaults permissivos e dependência de string exata no ambiente

- **Evidência:** `backend/app/config.py`, `ratelimit.py`, `jobs.py`, `idempotency.py` e `.env.example`.
- Redis só é obrigatório quando `BRAINY_ENV.lower() == "production"`. Fora disso, há fallback local; CORS pode ser `*`; SQLite também pode ser ativado.
- **Impacto:** um deploy com `BRAINY_ENV=prod`, `staging` ou variável omitida parece saudável, mas perde garantias distribuídas e de isolamento.
- **Recomendação:** validar enum de ambiente e falhar no startup quando a configuração produtiva não estiver completa. Exigir CORS explícito, DB gerenciado, Redis, OAuth/segredos, storage e LLM conforme as features habilitadas. Separar liveness de readiness.

## 4. Achados importantes — P1

### P1-S2 — SVG servido diretamente ainda pode permitir XSS/egress

- **Arquivos:** `backend/app/images.py`, `backend/app/main.py` (`/api/assets/{asset_id}`).
- `sanitize_svg()` usa regex parcial e não cobre de forma estrutural todos os atributos não cotados, namespaces e esquemas de URL. Assets SVG são servidos como `image/svg+xml` fora da CSP aplicada ao preview.
- **Impacto:** SVG gerado por prompt controlado pode conter execução ou referências externas ao ser aberto diretamente.
- **Recomendação:** sanitização XML por allowlist de elementos/atributos e esquemas; remover handlers, `foreignObject`, referências externas e namespaces perigosos; considerar servir como download ou por origem isolada; aplicar CSP e headers também no endpoint de assets. Testar variantes cotadas/não cotadas.

### P1-S3 — Repair aceita evidência controlada pelo cliente sem limites suficientes

- **Arquivos:** `backend/app/main.py` (`RepairRequest` e `/repair`), `backend/app/generators.py`, `backend/app/prompts.py`.
- `errors`, `stack`, linha/coluna e `attempt` aceitam volume/forma excessivos. O stack vindo do preview é controlável e pode carregar instruções maliciosas; nem todos os campos passam pela mesma limpeza/delimitação.
- **Impacto:** prompt injection residual, retenção de payloads sensíveis, DoS de tokens e reparos caros inventados pelo cliente.
- **Recomendação:** schema estrito, limites por item e limite total; truncar antes de persistir/enviar ao modelo; marcar todos os campos como `TOOL OUTPUT`; usar correlation ID/nonce se a autenticidade do erro for necessária; limitar tentativas.

### P1-S4 — Exportação ZIP não valida completamente os caminhos dos arquivos

- **Arquivos:** `backend/app/generators.py` (normalização de nomes) e `backend/app/main.py` (`/export`).
- A normalização remove apenas `./` e não rejeita de modo explícito `..`, caminhos absolutos, NUL ou separadores alternativos antes de gravar no ZIP.
- **Impacto:** extração posterior por ferramenta ingênua pode permitir path traversal ou sobrescrita fora do diretório escolhido.
- **Recomendação:** canonicalizar e rejeitar caminhos absolutos, `..`, NUL e nomes fora de allowlist; impor quantidade e tamanho total; testar ZIP malicioso.

### P1-S5 — OAuth confia em headers de proxy sem política de proxy confiável

- **Arquivo:** `backend/app/auth.py`.
- `X-Forwarded-Proto` e `X-Forwarded-Host` influenciam callback e cookie sem uma allowlist explícita de proxies confiáveis.
- **Impacto:** callback incorreto, origem manipulada ou comportamento inseguro de `Secure` em topologias mal configuradas.
- **Recomendação:** usar origem pública configurada e validada; aceitar forwarded headers somente quando reescritos por proxy confiável; validar `redirect_uri` contra a origem registrada; exigir segredos fortes.

### P1-I2 — Jobs podem ficar eternamente em `RUNNING`

- **Arquivo:** `backend/app/jobs.py`.
- O worker remove jobs com `BLPOP`, mas não há lease/ACK/visibility timeout, heartbeat ou recuperação de jobs `RUNNING` no startup. Apenas `PENDING` é reenfileirado.
- **Impacto:** crash ou kill deixa job sem conclusão; chamada travada prende o worker; não há dead-letter nem retry automático controlado.
- **Recomendação:** Redis Streams/consumer groups ou fila com ACK/lease; timeout total por job; heartbeat, recuperação de jobs expirados, backoff, limite de retry e dead-letter.

### P1-I3 — Fila embutida no processo HTTP e sem backpressure

- **Arquivos:** `backend/app/jobs.py`, `backend/app/db.py`.
- Existe um único worker por processo, sem limite de backlog/concurrency configurável e sem retenção/limpeza de `jobs` e `job_events`.
- **Impacto:** head-of-line blocking, crescimento indefinido e comportamento divergente entre réplicas.
- **Recomendação:** worker dedicado, consumidores configuráveis, limite de fila, métricas de backlog e lifecycle/TTL para jobs/eventos.

### P1-I4 — Storage local não é durável em produção

- **Arquivos:** `backend/app/storage.py`, `backend/app/images.py`, `Dockerfile`.
- Uploads e SVGs são gravados no filesystem do container quando storage gerenciado não está configurado.
- **Impacto:** perda de assets em rollout/restart e divergência entre réplicas; possíveis órfãos se storage e banco falharem em momentos diferentes.
- **Recomendação:** exigir object storage em produção ou volume durável single-node; implementar reconciliação/limpeza de órfãos e lifecycle.

### P1-AI1 — Quotas de tokens não são reservadas atomicamente

- **Arquivo:** `backend/app/usage.py`.
- O contador de operação é atualizado atomicamente, mas input/output tokens só são registrados depois da resposta. Duas chamadas concorrentes podem passar pela mesma leitura de saldo.
- **Impacto:** ultrapassagem de quota e custo real acima do estimado.
- **Recomendação:** reservar input/output estimados de forma transacional/Redis, aplicar teto pós-resposta e definir política explícita para falhas e retries cobrados.

### P1-AI2 — Modelo é controlável pelo request e custo é heurístico

- **Arquivos:** schemas em `backend/app/main.py`, `backend/app/llm.py`, `backend/app/usage.py`.
- `model` não tem allowlist server-side nem registro de custo por provider; a estimativa distingue apenas uma família `gpt-5`.
- **Impacto:** seleção de modelo caro/não autorizado, subestimação de custo e ausência de teto por chamada.
- **Recomendação:** allowlist por plano, limite de tamanho, registry de modelos/preços, orçamento máximo e quota por chamada.

### P1-AI3 — Retries amplos aumentam custo e podem vazar erro em logs

- **Arquivos:** `backend/app/llm.py`, `backend/app/images.py`, `backend/app/generators.py`.
- O cliente repete também erros 400/401/403 e registra parte do texto retornado pelo provedor. Falha na imagem pode ainda acionar fallback LLM; autocorreção pode gerar chamadas adicionais.
- **Impacto:** latência/custo multiplicados e possível exposição de conteúdo sensível em logs/respostas.
- **Recomendação:** retry apenas para 408/429/5xx com backoff/jitter; circuit breaker e orçamento global; redigir erros externos; contabilizar todas as chamadas.

### P1-AI4 — Limites totais de contexto e repair são insuficientes

- **Arquivos:** `backend/app/main.py`, `backend/app/generators.py`, `backend/app/context_manager.py`.
- Há limite de quantidade de mensagens, mas não há limite total rigoroso de bytes/tokens para mensagens, `question`, `errors`, stacks e anexos antes do provider.
- **Impacto:** estouro de contexto, custo, latência e DoS.
- **Recomendação:** impor limites totais por endpoint, por mensagem e por arquivo; estimar tokens antes da chamada e rejeitar payloads acima do orçamento.

### P1-AI5 — Refine/repair concorrentes usam last-write-wins

- **Arquivo:** `backend/app/generators.py`.
- Dois jobs do mesmo projeto podem ler a mesma versão e sobrescrever arquivos em ordem diferente.
- **Impacto:** perda silenciosa de alterações e resultados inconsistentes.
- **Recomendação:** versionamento/optimistic locking, serialização por projeto ou rejeição de job obsoleto.

## 5. Achados P2

- **Rate limit por path de alta cardinalidade:** `backend/app/ratelimit.py` usa endpoint literal com IDs; combinar bucket por rota canônica, usuário/IP e operação.
- **IP atrás de proxy:** `request.client.host` pode representar o proxy; definir política de proxy confiável antes de usar IP para abuso.
- **SQLite/pool:** `backend/app/db.py` abre conexão por operação e não configura `busy_timeout`; MySQL também não usa pool. Pode haver locks sob concorrência.
- **Alocação de memória:** uploads leem até 12 MB e imagens baixam/base64am respostas sem teto equivalente robusto; aplicar `Content-Length`, streaming e limites separados.
- **CSP do preview:** `img-src https:` e fontes externas permitem egress; `frame-ancestors` não está declarado. Restringir origens e remover recursos não indispensáveis.
- **Redaction parcial:** `prompt_security.py` reconhece padrões conhecidos, não uma fronteira completa de secrets; nunca depender somente de regex.
- **Observabilidade:** não há request/correlation ID, métricas, tracing ou latência/custo por provider; `/api/health` é liveness superficial e não testa DB/Redis/storage.
- **Docker/supply chain:** `Dockerfile` roda como root, não declara `HEALTHCHECK` nem separa worker; `requirements.txt` usa ranges sem lock/constraints hashes.
- **Jobs armazenam resultados grandes:** projetos completos são serializados em `jobs.result` e retornados no job público; preferir referência autorizada (`project_id`/asset ID).
- **Retry de job:** transições entre autorização, reset e enqueue não formam uma outbox transacional; pode haver quota consumida sem execução.
- **Lifecycle:** memórias, histórico, jobs, eventos e assets não têm retenção/limite global suficientemente explícito.
- **Assets standalone:** geração de imagem sem `project_id` precisa de `owner_id` próprio para não depender de join com projetos.

## 6. Achados P3

- Sessão HMAC stateless de 30 dias: logout apaga o cookie, mas não revoga uma sessão já copiada (`backend/app/auth.py`).
- `/api/health`, `/api/config` e `/api/models` revelam versão, modelo e provider; reduzir exposição pública se não for necessário.
- `user_id` é devolvido no objeto público do próprio job; avaliar se é realmente necessário.
- Há warnings de depreciação por `@app.on_event` em `backend/app/main.py`; migrar para lifespan quando houver uma etapa de manutenção apropriada.
- Os E2E são determinísticos e valiosos, mas não substituem testes com Redis/MySQL/OAuth/storage/provider reais ou mocks de falha de crash.

## 7. O que já está correto

- **CSRF:** token assinado e associado à sessão, cookie de sessão HttpOnly, validação em POST/PUT/PATCH/DELETE e testes de ausência, invalidez, expiração/troca de sessão.
- **Cookies/OAuth:** sessão HttpOnly; `Secure` e `SameSite=None` no fluxo público HTTPS; estado OAuth separado.
- **Ownership parametrizado:** projetos, memórias, uploads, jobs e SSE filtram por usuário quando há principal válido.
- **Uploads:** nome seguro, extensão/MIME/magic bytes cruzados, Pillow `verify`, proteção contra decompression bomb, limites por família e testes de arquivo falsificado/corrompido/traversal.
- **Storage local:** chave física aleatória, resolução anti-traversal e permissões 0700/0600.
- **Preview:** sandbox sem `allow-same-origin`, CSP com `default-src 'none'`, `connect-src 'none'`, `frame-src/object-src 'none'`, nonce para inline e preflight determinístico.
- **Rate limiting/idempotência:** Redis obrigatório no modo explicitamente produtivo, fallback somente em desenvolvimento, scripts atômicos e isolamento por usuário/operação/chave.
- **Jobs/SSE:** estados explícitos, ownership, replay por `Last-Event-ID`, heartbeat, timeout de stream e eventos sem chain-of-thought/payload.
- **Prompt security:** hierarquia SYSTEM/DEVELOPER/USER e WEB/FILE/TOOL como não confiáveis, delimitadores e testes de injection.
- **Contexto/memória:** resumo + mensagens recentes + memória relevante, tipos de memória, CRUD com ownership e limites de janela.
- **SQL básico:** queries parametrizadas, foreign keys/cascade, índices principais, WAL no SQLite e TLS MySQL por padrão.

## 8. O que falta para produção

1. Corrigir os três P0: tenant/auth fail-closed, DB produtivo obrigatório e validação explícita de configuração/ambiente.
2. Tornar SVG/asset endpoint seguro por parser/allowlist ou origem isolada.
3. Fechar limites e autenticidade dos erros de repair; validar paths de ZIP.
4. Implementar fila com ACK/lease/recovery, timeout total, retry limitado, dead-letter e worker separado.
5. Exigir storage persistente e definir backup/restore e lifecycle.
6. Corrigir reserva transacional de quotas, allowlist de modelos e orçamento por chamada.
7. Implementar request IDs, logs estruturados sanitizados, métricas, readiness real e alertas.
8. Executar testes de integração com duas instâncias, Redis, MySQL, OAuth, storage, crash/restart e carga concorrente.
9. Fixar dependências, executar como usuário não-root e adicionar healthcheck/container hardening.
10. Formalizar retenção, privacidade/LGPD, exclusão/exportação de dados e resposta a incidentes.

## 9. Recomendação de decisão

- **Publicação como MVP controlado:** possível somente com single-node explícito, sem promessa de durabilidade, com acesso restrito e monitoramento manual.
- **Produção comercial/multi-instância:** não aprovar antes de fechar os três P0 e os P1 de fila, SVG, storage, limites de entrada e quotas.
- **Escopo desta auditoria:** nenhum problema foi corrigido automaticamente; itens fora da etapa de auditoria foram apenas registrados, conforme solicitado.
