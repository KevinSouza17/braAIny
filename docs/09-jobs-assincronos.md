# Jobs assíncronos

Operações demoradas de geração de projeto, refine, repair, imagem e pesquisa web não aguardam o
provedor dentro do worker HTTP. A API valida ownership, quota e idempotência,
cria um registro e retorna `202 Accepted` com um `job_id`.

```text
API -> Job(PENDING) no MySQL compartilhado -> polling + claim/lease -> Worker
    -> LLM/Imagem -> persistência/validação -> Job(COMPLETED/FAILED)
```

## Estados

- `PENDING`: criado e aguardando processamento;
- `RUNNING`: reservado por um worker;
- `COMPLETED`: resultado persistido e disponível;
- `FAILED`: erro seguro persistido, sem detalhes do provedor;
- `CANCELLED`: cancelado pelo proprietário antes da conclusão.

Cada registro tem ID, proprietário, tipo, estado, progresso de 0 a 100,
timestamps, número de tentativas, erro seguro e resultado. O payload de entrada
não é devolvido no endpoint público de status.

## Endpoints

```http
POST /api/projects
POST /api/projects/{id}/refine
POST /api/projects/{id}/repair
POST /api/images
POST /api/research
GET  /api/jobs/{job_id}
GET  /api/jobs/{job_id}/events
POST /api/jobs/{job_id}/cancel
POST /api/jobs/{job_id}/retry
```

As quatro operações de criação/refine/repair/imagem retornam rapidamente:

```json
{
  "job_id": "job_...",
  "status": "PENDING",
  "type": "project_create",
  "created_at": "..."
}
```

A consulta de status só retorna o job quando `user_id` coincide com a identidade
da sessão. Usuários diferentes recebem `404`, evitando confirmar a existência
de jobs de terceiros.

## Fila persistida e coordenação

A fila é a própria tabela `jobs` do banco. O worker consulta jobs elegíveis por
polling e faz um claim condicional `PENDING -> RUNNING` com `worker_id` e lease de
120 segundos; instâncias concorrentes não processam o mesmo claim. Se uma
instância desaparecer, outro worker pode recuperar o job após expirar o lease.
O resultado só é gravado se o job continuar `RUNNING` e pertencer ao worker que o
reivindicou, portanto cancelamento ou perda do lease não publica resultado obsoleto.

Em produção, MySQL gerenciado é obrigatório e usado por todas as instâncias para
jobs, claims, progresso e eventos. SQLite e fallback local são somente para
desenvolvimento/testes isolados. Não há dependência Redis no caminho aprovado.

## Idempotência e quotas

`Idempotency-Key` continua vinculada ao usuário, à operação e ao payload. O replay
retorna o mesmo `job_id`, e não cria uma segunda operação. A quota é reservada
antes do enqueue; retry exige nova autorização de quota. Falhas de execução não
expõem mensagens internas do LLM ou do provedor.

## Frontend

O cliente abre `GET /api/jobs/{job_id}/events` com `EventSource` e cookies de sessão.
Cada evento contém somente `type`, `progress`, `message` e `status`; payloads,
prompts, respostas internas e chain-of-thought nunca são enviados.

Eventos de estado suportados incluem:

```text
job.created, job.started, generation.started, generation.progress,
validation.started, repair.started, repair.progress,
generation.finalizing, generation.completed, generation.failed
```

Os eventos são persistidos em `job_events` e possuem um ID monotônico. Após uma
queda de conexão, o frontend reconecta usando `last_event_id` e o servidor também
aceita o header `Last-Event-ID`, sem duplicar eventos já entregues. Heartbeats
mantêm proxies ativos; o stream encerra ao atingir estado terminal, desconexão do
cliente ou `BRAINY_JOB_STREAM_TIMEOUT` (600 segundos por padrão). Se SSE não estiver
disponível, o cliente volta automaticamente ao polling existente.

O ownership é validado antes de abrir o stream e a consulta de cada iteração usa o
mesmo proprietário. Em caso de falha ou cancelamento, exibe-se somente o erro seguro
do job.
