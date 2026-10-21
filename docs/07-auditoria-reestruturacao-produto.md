# Auditoria e reestruturação do brAIny

> **Status 2026-10-09:** este relatório registra achados e prioridades da auditoria original. A arquitetura distribuída recomendada na época foi implementada com MySQL gerenciado para rate limit, idempotência e fila/leases de jobs (Redis não é requerido); Storage gerenciado persiste uploads e imagens geradas em produção. As prioridades históricas devem ser interpretadas à luz das atualizações em `docs/02-arquitetura.md`, `docs/04-testes.md`, `docs/09-jobs-assincronos.md` e `docs/14-hardening-p0.md`; outros itens listados aqui não são declarados resolvidos por este aviso.

## Escopo analisado

Foram revisados arquitetura, FastAPI, persistência SQLite/MySQL, autenticação Manus OAuth, geração de código, prompts, preview sandbox, geração/vetorização de imagens, frontend React/Vite, responsividade, acessibilidade básica, SEO, tratamento de erros, rate limit e fluxo de publicação.

## Problemas encontrados e corrigidos

1. **Isolamento de projetos insuficiente quando OAuth estava configurado.** As rotas de projetos usavam `db.get_project(id)` sem proprietário e permitiam enumeração/acesso por ID. As rotas agora usam o usuário da sessão e filtram por `owner_id` para listar, abrir, renomear, excluir, refinar, reparar, pré-visualizar, exportar e ler arquivos.
2. **Criação de projetos não propagava o proprietário.** Geração, imagem e refinamento agora preservam `owner_id`.
3. **Assistência de código e geração de imagens podiam ser chamadas sem a mesma barreira de conta.** Em ambiente com OAuth configurado, esses endpoints passam pelo guard de sessão. O modo convidado continua disponível somente quando o OAuth não está configurado, preservando o desenvolvimento local.
4. **Erro de provedor de imagem podia vazar detalhes internos.** A API agora registra o stack trace no servidor e responde com mensagem amigável, sem expor credenciais, URL interna ou resposta bruta do provedor.
5. **Headers básicos incompletos.** Foram adicionados `nosniff`, política de referrer, Permissions Policy, COOP e HSTS somente em produção. Não foi usado `X-Frame-Options`, pois o preview público precisa ser carregado dentro do iframe do Webdev.
6. **Histórico sem busca.** A sidebar agora pesquisa por nome, tipo e prompt, com estado vazio específico e contagem filtrada.
7. **Respostas sem ação de cópia.** Respostas do assistente agora têm botão de copiar com fallback silencioso quando o navegador bloqueia clipboard.
8. **SEO social mínimo.** Foram adicionados theme color, Open Graph, Twitter Card, `robots.txt` e `sitemap.xml`.

## O que já existia e foi preservado

- Chat de criação e refinamento incremental.
- Preview sandbox com preflight e autocorreção.
- Login Manus OAuth e memória explícita.
- Upload com limite de 12 MB e validação de MIME.
- Persistência SQLite local e compatibilidade MySQL via `DATABASE_URL`.
- Integração com GPT Image/Nano Banana e raster → SVG real via vtracer.
- Tema claro/escuro, layout responsivo e publicação containerizada.

## Pontos que continuam pendentes

- Cadastro, recuperação de senha e troca de senha são responsabilidade do Manus OAuth; não há senha local para armazenar.
- Stripe/planos pagos ainda não estão ligados a um gateway. A persistência atual já tem base de usuário, mas faltam entitlements, medição de uso e webhooks.
- Streaming de tokens, edição/regeneração de mensagens, compartilhamento público e exclusão de conta ainda não estão completos.
- O histórico de projetos depende de banco persistente em produção; SQLite em container é armazenamento temporário e deve ser substituído por MySQL gerenciado antes de escalar.
- Upload de DOCX/CSV existe parcialmente na camada de MIME/Storage, mas a extração semântica por tipo precisa de workers e bibliotecas específicas.
- Rate limit atual é em memória por processo; para múltiplas réplicas, migrar para Redis ou gateway de borda.
- O pipeline de vetorização continua sendo CPU-bound; para imagens grandes, usar fila de workers, cache por hash, resize e quantização antes do vtracer.

## Riscos

- Custo variável das chamadas de IA e pesquisa web.
- Arquivos e projetos grandes podem elevar memória e latência.
- Provedores externos podem alterar modelos ou formatos de resposta.
- Sem observabilidade centralizada, diagnóstico de falhas de produção fica limitado.
- SQLite e armazenamento em disco local não são adequados para alta disponibilidade.

## Próxima versão prioritária

1. Migrar produção para MySQL + Storage persistente.
2. Criar tabela de uso/entitlements por plano e limites Free/Pro no backend.
3. Adicionar Redis para rate limit, idempotência e cache distribuído.
4. Implementar streaming de respostas e jobs assíncronos para geração/vetorização.
5. Completar exportação de PDF/DOCX/CSV com extração segura.
6. Adicionar telemetria sem conteúdo sensível: latência, erros, tokens aproximados, custo estimado e conversão.
7. Completar testes de integração de OAuth, upload, ownership e mobile.

## Avaliação atual

| Critério | Nota | Observação |
|---|---:|---|
| Produto/UX | 7,0/10 | Identidade consistente, criação + preview diferenciados; faltam ações avançadas no chat. |
| Prontidão para mercado | 5,5/10 | Boa base para beta fechado; persistência, billing, observabilidade e workers ainda são necessários para escala. |
| Segurança | 7,0/10 | Ownership, sanitização, CSP do preview e headers melhorados; ainda precisa de hardening operacional e testes de integração. |
| Performance | 6,5/10 | Cache local e preflight existem; falta streaming, fila e cache distribuído. |

## Estimativa de custos técnicos

- **Desenvolvimento:** maior custo nas áreas de billing, workers, observabilidade, migração MySQL/Storage e QA de integrações.
- **Operação:** custos dominantes serão chamadas LLM/imagem, pesquisa web, armazenamento de uploads e banco gerenciado.
- **Controle recomendado:** orçamento por usuário/plano, limite de tokens, cache de respostas determinísticas, modelo barato para roteamento e confirmação antes de tarefas caras.

## Validação desta rodada

- Backend: `36 passed`.
- Frontend: build Vite concluído com sucesso.
- Teste novo: projeto de um proprietário não aparece para outro proprietário.
