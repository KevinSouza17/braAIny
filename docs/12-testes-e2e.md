# Suíte de testes end-to-end

A suíte está em `backend/tests/e2e/test_flows.py` e não substitui os testes
unitários ou de integração existentes.

## Fluxos cobertos

1. Login simulado, criação, geração, preview e sucesso;
2. Código inválido, preflight, repair e nova validação;
3. Isolamento de projeto entre usuários;
4. Upload válido;
5. Upload falsificado/malicioso;
6. Mutação sem CSRF;
7. Rate limit atingido;
8. `Idempotency-Key` com duas requisições e um job;
9. Quota excedida antes da chamada ao provedor;
10. Criação, processamento e conclusão de job;
11. Prompt injection em conteúdo web como conteúdo não confiável.

## Reprodutibilidade

- Cada teste usa SQLite temporário;
- usuários e sessão são simulados localmente;
- LLM, worker, pesquisa web e storage são fakes;
- nenhum provedor externo ou API paga é chamado;
- o rate limiter é recriado por teste;
- jobs são processados pelo worker assíncrono real da aplicação.

Executar somente a suíte E2E:

```bash
cd backend
python3 -m pytest tests/e2e/test_flows.py -q
```

Executar tudo, incluindo os testes anteriores:

```bash
cd backend
python3 -m pytest tests -q
```
