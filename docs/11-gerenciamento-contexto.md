# Gerenciamento de contexto

O brAIny não envia histórico ilimitado ao modelo. A composição segue:

```text
Conversation Summary
+ Recent Messages
+ Relevant Memory
+ contexto explícito da mensagem atual
```

## Limites

- até 100 mensagens são lidas do histórico persistente para preparar o contexto;
- somente as 12 mensagens mais recentes são enviadas como mensagens de conversa;
- quando o contexto acumulado ultrapassa 14.000 caracteres, um resumo determinístico
  é persistido por usuário em `conversation_summaries`;
- o bloco combinado de resumo, memória e contexto tem no máximo 7.000 caracteres;
- o resumo não chama um segundo LLM, evitando custo recursivo e latência adicional.

O resumo contém apenas uma versão compacta das mensagens antigas. Mensagens recentes
continuam separadas para preservar intenção, tom e continuidade.

## Memórias

Cada memória possui:

- `id`;
- `user_id`;
- `type`: `PREFERENCE`, `CONTEXT` ou `INSTRUCTION`;
- `content`;
- `source`;
- `created_at`;
- `updated_at`.

`key` e `value` antigos continuam sendo mantidos para compatibilidade com clientes
anteriores. `content` é a representação canônica exibida no novo fluxo.

A seleção é feita por relevância lexical em relação à pergunta atual, com limite de
cinco memórias. Memórias de `INSTRUCTION` são apenas contexto auxiliar e não possuem
prioridade equivalente a `SYSTEM` ou `DEVELOPER`.

## API

```http
GET   /api/me/memories
POST  /api/me/memories
PATCH /api/me/memories/{memory_id}
DELETE /api/me/memories/{memory_id}
```

O ownership é aplicado em todas as operações: uma pessoa não pode ler, editar ou
excluir a memória de outra.

## Isolamento

O resumo e as memórias são armazenados por `user_id`. O contexto é marcado no prompt
como dado auxiliar do usuário; ele não pode substituir regras de sistema, liberar
secrets ou executar instruções externas.
