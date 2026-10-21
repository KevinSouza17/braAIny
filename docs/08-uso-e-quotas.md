# Uso, quotas e métricas do brAIny

## Objetivo

O `UsageService` é a camada central para autorizar operações caras e registrar
consumo agregado. Ele não armazena prompts, respostas, anexos, nomes de arquivos
ou outros dados sensíveis como parte das métricas.

O período atual é o mês UTC (`YYYY-MM`). Cada registro contém somente:

- `user_id`;
- período e plano;
- tokens de entrada e saída;
- gerações de imagem;
- pesquisas web;
- operações de repair;
- projetos criados;
- gerações de código e chats;
- custo estimado em USD.

## Planos iniciais

Os limites estão em `backend/app/usage.py`, em `PLAN_QUOTAS`:

| Recurso | FREE | PRO | TEAM |
|---|---:|---:|---:|
| Tokens de entrada | 100.000 | 2.000.000 | 10.000.000 |
| Tokens de saída | 50.000 | 1.000.000 | 5.000.000 |
| Imagens | 20 | 500 | 2.000 |
| Pesquisas web | 50 | 2.000 | 10.000 |
| Repairs | 30 | 500 | 2.000 |
| Projetos | 10 | 200 | 1.000 |

O plano padrão pode ser definido por `BRAINY_DEFAULT_PLAN`. Não há pagamento,
checkout ou alteração automática de plano nesta etapa.

## Fluxo obrigatório

Toda operação que possa chamar um provedor de IA deve:

1. escolher um nome de operação existente;
2. chamar `usage_service.authorize(user_id, operation)` **antes** do provedor;
3. não executar o provedor quando `UsageLimitExceeded` ocorrer;
4. liberar a reserva com `usage_service.release(reservation)` se a operação falhar;
5. registrar tokens através do contexto de uso, nunca manualmente em vários módulos;
6. registrar custo fixo somente após uma geração externa concluída.

As rotas caras já usam `_run_idempotent`, que integra autorização de quota,
idempotência e contexto de tokens. Para uma nova rota com uma operação cara:

```python
async def minha_rota(request: Request, payload: MinhaPayload):
    async def operation():
        # O provedor só deve ser chamado dentro deste callback.
        return await chamar_provedor(payload)

    return await _run_idempotent(
        request,
        "code_generation",  # ou image, repair, project_create
        payload,
        operation,
    )
```

Para uma operação fora desse executor, use diretamente:

```python
reservation = usage_service.authorize(user_id, "web_search")
try:
    resultado = await pesquisar()
except Exception:
    usage_service.release(reservation)
    raise
```

O contexto `usage_service.context(user_id, operation)` é consumido por
`llm.chat`. Quando o provedor informa tokens, eles são usados; caso contrário,
o serviço usa uma estimativa baseada no tamanho serializado das mensagens.

## Quotas excedidas

O backend responde `429` sem chamar o provedor e informa headers não sensíveis:

```text
X-Usage-Plan
X-Usage-Resource
X-Usage-Limit
X-Usage-Used
```

O endpoint autenticado `GET /api/me/usage` expõe o snapshot agregado do período
atual para a própria pessoa usuária.

## Persistência e concorrência

A tabela `usage_periods` tem uma linha por usuário e mês. A reserva usa um
`UPDATE` com predicado de limite, evitando que duas instâncias ultrapassem a quota
de operações simultaneamente. SQLite é usado localmente e MySQL em ambientes
configurados com `DATABASE_URL`.

## O que não fazer

- não criar contadores locais em rotas ou módulos de provedor;
- não salvar prompt, resposta, URL privada, conteúdo de arquivo ou anexos na tabela;
- não verificar quota depois da chamada ao provedor;
- não usar custo como autorização de pagamento;
- não registrar o mesmo consumo em mais de uma camada.
