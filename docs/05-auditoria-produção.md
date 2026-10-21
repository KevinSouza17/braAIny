# Auditoria de produção do brAIny

Data: 2026-10-06

> **Status 2026-10-09:** este é um snapshot histórico. O caminho produtivo aprovado usa MySQL gerenciado para coordenação, sem Redis, e Storage gerenciado para uploads/assets duráveis; consulte `docs/02-arquitetura.md`, `docs/04-testes.md`, `docs/09-jobs-assincronos.md` e `docs/14-hardening-p0.md` para as instruções atuais. Os demais achados históricos exigem verificação própria antes de serem tratados como resolvidos.

## Escopo auditado

Foram revisados o shell React/Vite, API FastAPI, persistência SQLite, cliente OpenAI-compatível, prompts, geração de projetos, geração de SVG/PNG, sandbox de preview, histórico, exportação, dependências, configuração de ambiente e fluxo de publicação.

## Correções implementadas nesta rodada

- **CORS configurável:** `BRAINY_CORS_ORIGINS` controla as origens permitidas; em `BRAINY_ENV=production`, nenhuma origem é liberada implicitamente.
- **Rate limiting de mutações:** POST/PATCH/DELETE de `/api/*` recebem limite por IP e endpoint, configurável por `BRAINY_RATE_LIMIT_REQUESTS` e `BRAINY_RATE_LIMIT_WINDOW`.
- **Cabeçalhos de segurança:** `nosniff`, `Referrer-Policy` e `Permissions-Policy` são aplicados às respostas sem bloquear o Preview cross-site.
- **Limites de entrada existentes preservados:** Pydantic limita prompts, mensagens, código e instruções; o frontend não recebe chaves.
- **IA:** cálculo local, cache de respostas e pesquisa, classificação de intenção no prompt, pesquisa web seletiva e validação/autocorreção de SVG.
- **Documentação:** variáveis de produção e limites de abuso foram adicionados ao `.env.example`.

## Achados por área

| Área | Status | Evidência / risco restante |
|---|---|---|
| IA e prompts | ✅ Pronto para protótipo | Tem contexto de até 20 mensagens, busca seletiva, cache e instruções de incerteza. RAG/embeddings não são necessários enquanto não há corpus privado. |
| Frontend/UX | ✅ Pronto para MVP | Interface responsiva, modo Perguntar, criação explícita e mobile validado. Ainda faltam autenticação e preferências persistentes. |
| Backend/API | ⚠️ Precisa de atenção | Rotas principais funcionam; rate limit atual é em memória e não é distribuído entre réplicas. |
| Banco de dados | ⚠️ Precisa de atenção | SQLite é adequado para usuário único/MVP, mas deve migrar para MySQL/Postgres antes de múltiplas instâncias ou alto volume. |
| Segurança | ⚠️ Melhorado, não pronto para público amplo | CORS, headers, sandbox, CSP, sanitização e rate limit básico existem. Falta autenticação/autorização, gestão de sessões e isolamento de preview em domínio/container separado. |
| LGPD | ❌ Não pronto para lançamento comercial | Ainda faltam política de privacidade, consentimento quando aplicável, exportação/exclusão por titular e definição formal de retenção. |
| Performance | ✅ MVP | Bundle e cache foram verificados; geração síncrona continua custosa e sem fila/streaming. |
| Escalabilidade | ❌ Não pronto | Worker único, SQLite, arquivos locais e rate limit local impedem escala horizontal segura. |
| Testes | ✅ Base automatizada | 33 testes unitários passam; faltam testes E2E, autenticação, carga e segurança automatizada. |
| Infraestrutura/deploy | ⚠️ Precisa de atenção | Docker/build/health estão preparados; falta domínio final, observabilidade do provedor, backup automatizado e teste de restauração. |
| Monetização | ❌ Não implementado | Nenhum pagamento foi adicionado, conforme solicitado. Arquitetura comercial futura ainda precisa de decisão sobre planos/créditos. |
| Administração | ❌ Não implementado | Não há contas nem painel administrativo; não deve ser exposto sem autorização e modelo de papéis. |

## P0 — obrigatório antes do lançamento público

1. Escolher provedor de autenticação e modelo de contas/organizações.
2. Migrar dados duráveis para banco gerenciado e storage de objetos.
3. Separar preview gerado do domínio principal e executar em isolamento apropriado.
4. Usar rate limiting distribuído (Redis ou gateway) e quotas por usuário/plano.
5. Publicar política de privacidade, retenção, exclusão e atendimento LGPD.
6. Configurar backups, restauração testada, logs sem segredos e alertas.
7. Criar testes E2E, carga e segurança para os fluxos críticos.

## P1 — depois do lançamento inicial

- Fila assíncrona para gerações longas e streaming de progresso.
- Histórico de conversas persistente por usuário e busca semântica somente quando houver corpus suficiente.
- Painel administrativo com RBAC, uso, erros e custos agregados.
- Planos gratuito/premium com créditos e limites transparentes.
- Git/deploy, colaboração e integrações.

## P2 — evolução

- RAG por arquivos do usuário com consentimento e controles de retenção.
- Avaliação automática de qualidade e testes comportamentais dos artefatos.
- Aplicativos móveis nativos e execução de backends gerados com isolamento dedicado.

## Modelo de custo e monetização

O custo dominante é a geração de código/imagem e autocorreções. O MVP deve controlar custo com cache, limites por requisição, limite de tokens, número máximo de reparos e quotas por período. Um plano gratuito pode oferecer créditos mensais limitados; um plano premium pode aumentar créditos, modelos e prioridade de fila; empresas podem ter workspace, retenção e limites contratados. Pagamentos reais não foram implementados.

## Conclusão

O brAIny está funcional como **MVP técnico público controlado**, mas não deve ser classificado como produto comercial pronto enquanto autenticação, isolamento multiusuário, LGPD, storage/banco gerenciados, observabilidade e quotas distribuídas não forem resolvidos.
