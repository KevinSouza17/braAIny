# Hardening P0 — requisitos de produção

**Data:** 2026-10-07 · **Atualização da arquitetura:** 2026-10-09

Esta etapa corrige exclusivamente os três bloqueadores P0 da auditoria final. Não altera os achados P1/P2, que permanecem registrados no relatório de auditoria.

## 1. Tenant e autenticação

- `main._owner_id()` agora exige `auth.require_user()` quando OAuth está configurado ou quando `BRAINY_ENV=production`.
- `main._idempotency_user_key()` usa o identificador do usuário autenticado nesses mesmos modos.
- Como `_enqueue_job()` utiliza essa chave, criação de projeto, geração de imagem, repair, refine e pesquisa não podem ser enfileirados anonimamente em produção.
- Consultas de jobs, SSE, cancelamento, retry e demais operações que dependem da chave de ownership também deixam de cair em `guest:*` em produção.
- O modo guest continua disponível apenas para desenvolvimento/testes locais explícitos.

## 2. Banco de dados

- `db._Connection` recusa SQLite quando o ambiente efetivo é `production`.
- `DATABASE_URL` produtivo deve começar com `mysql://` ou `mysql+pymysql://`; a conexão MySQL mantém TLS por padrão, salvo configuração explícita do parâmetro `ssl`.
- O startup valida essa condição antes de criar diretórios ou inicializar o schema.

## 3. Configuração fail-closed

- `BRAINY_ENV` aceita somente `development`, `test` ou `production`; valores como `prod` não são normalizados silenciosamente.
- A imagem Docker define `BRAINY_ENV=production` explicitamente.
- Em produção, o startup exige:
  - `DATABASE_URL` MySQL/MariaDB;
  - MySQL compartilhado para rate limit, idempotência e fila/leases de jobs (sem dependência Redis);
  - `BRAINY_CORS_ORIGINS` sem wildcard; vazio é permitido para a publicação same-origin;
  - Manus Project/OAuth configurados;
  - `MANUS_JWT_SECRET` (ou o alias publicado `JWT_SECRET`) com pelo menos 32 caracteres;
  - `BRAINY_CSRF_SECRET` dedicado é preferível; na ausência dele, um segredo JWT forte é usado como raiz HMAC do CSRF;
  - credencial de LLM;
  - `MANUS_API_URL` e `MANUS_API_KEY` para Storage gerenciado.
- A mensagem de configuração inválida lista somente nomes de requisitos, nunca valores de secrets.

## Operação

Para desenvolvimento, mantenha `BRAINY_ENV=development` e SQLite/fallback local. Para publicação, forneça os requisitos acima como configuração do runtime e use a imagem Docker. MySQL e Storage gerenciados são requisitos do caminho produtivo; falta do Storage falha fechada para uploads/gerações, sem fallback para disco efêmero. A configuração de produção não depende de Redis. O guard não provisiona OAuth ou credenciais externas; ele impede que a aplicação inicie fingindo estar pronta quando os recursos exigidos estiverem ausentes.
