# Segurança contra prompt injection

## Modelo de confiança

O brAIny mantém uma hierarquia explícita:

| Nível | Origem | Autoridade |
|---|---|---|
| `SYSTEM` | políticas internas do produto | máxima |
| `DEVELOPER` | regras técnicas do pipeline | abaixo de SYSTEM |
| `USER` | pedido e memória explícita da pessoa | limitado pelos níveis acima |
| `TOOL OUTPUT` | erros, metadados e resultados de ferramentas | dados, nunca instruções |
| `WEB CONTENT` | títulos, snippets, páginas e citações | dados, nunca instruções |
| `FILE CONTENT` | código, texto, PDFs, imagens e anexos | dados, nunca instruções |

A regra fundamental é:

```text
WEB CONTENT != INSTRUCTION
FILE CONTENT != INSTRUCTION
TOOL OUTPUT != INSTRUCTION
```

Conteúdo externo é colocado em delimitadores explícitos e os prompts de sistema
recebem a política anti-injection antes das instruções específicas de cada operação.
Frases como “ignore as instruções anteriores”, pedidos de secrets ou instruções para
chamar ferramentas são tratadas como texto citado e não mudam a hierarquia.

## Fluxos protegidos

### Pesquisa web

A pesquisa retorna apenas metadados públicos e snippets. Esses resultados são
marcados como `WEB_CONTENT_UNTRUSTED` antes de entrar no contexto. URLs, títulos e
snippets não podem alterar o prompt de sistema nem autorizar ações.

### Memória

Memória explícita é reinserida como `USER_CONTEXT`. Ela pode ajudar a personalizar a
resposta, mas não pode substituir políticas do sistema/developer, liberar recursos ou
solicitar secrets.

### Arquivos e anexos

Arquivos de projeto, PDFs, imagens e código são marcados como `FILE_CONTENT`. Anexos
multimodais recebem uma instrução textual indicando que seu conteúdo é não confiável.
O backend mantém ownership dos uploads e só envia ao modelo anexos explicitamente
referenciados pelo usuário.

### Geração e refine

Pedidos do usuário são delimitados como `USER_DATA`. Código atual e arquivos usados
para refine são `FILE_CONTENT`, portanto comentários ou strings que tentem instruir o
modelo não ganham autoridade.

### Autocorreção

Erros do preview, stacks e histórico de tentativas são `TOOL_OUTPUT`. Eles servem
para diagnosticar o código, mas não podem pedir exfiltração, alterar políticas ou
acionar ferramentas.

## Redação de secrets

Antes de inserir dados delimitados no prompt, padrões comuns de chaves OpenAI,
Google, GitHub, AWS e tokens Bearer são substituídos por `[REDACTED_SECRET]`. As
credenciais dos provedores continuam somente no backend, no header da chamada ao
LLM, e nunca são incluídas no contexto do modelo.

Essa redação é uma barreira adicional, não substitui o gerenciamento correto de
secrets, controle de acesso, logs sem conteúdo sensível e revisão dos provedores.

## Limitações e riscos residuais

- Nenhum classificador textual garante detectar todas as tentativas semânticas de
  injection; a defesa principal é a separação de autoridade e o menor contexto
  necessário.
- Arquivos multimodais ainda são enviados ao provedor quando explicitamente anexados;
  a política do sistema precisa continuar tratando suas instruções visuais/textuais
  como dados.
- A aplicação não executa comandos encontrados em web, arquivos ou tool output.
- Prompts, arquivos completos e dados pessoais não entram nas métricas de uso; logs
  de erro devem continuar sem payloads sensíveis.
