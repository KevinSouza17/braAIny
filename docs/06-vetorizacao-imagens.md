# Vetorização de imagens — Opção A

## Resultado

Quando `BRAINY_IMAGE_PROVIDER=openai` ou `google`, o backend **não entrega o PNG/JPEG recebido**. O raster é tratado como entrada intermediária:

```text
prompt
  -> provedor de imagem
  -> bytes PNG/JPEG (Base64 ou URL)
  -> Pillow normaliza para RGBA/PNG
  -> vtracer rastreia cores e contornos
  -> sanitização
  -> assets/<id>.svg com paths reais
  -> GET /api/assets/<id>
```

O SVG final não contém `<image>`, `data:image`, `<script>` ou referências externas. A resposta da rota `/api/images` segue apontando para o asset, mas `kind` é `svg` e o `mime` é `image/svg+xml`.

## Adaptadores

### OpenAI GPT Image 2 / 2.5

- Variáveis: `BRAINY_IMAGE_PROVIDER=openai`, `BRAINY_IMAGE_API_KEY`, `BRAINY_IMAGE_MODEL`.
- Endpoint: `POST {BRAINY_IMAGE_BASE_URL}/images/generations`.
- Payload principal: `model`, `prompt`, `n`, `size`, `quality` e `output_format=png`.
- Leitura de resposta: `data[0].b64_json`; há suporte defensivo a `data[0].url`.
- Modelos documentados: `gpt-image-2.5-sunburst` e `gpt-image-2.5-flare`. O valor é configurável para compatibilidade com o catálogo habilitado na conta.

### Google Nano Banana

- Variáveis: `BRAINY_IMAGE_PROVIDER=google`, `BRAINY_GOOGLE_IMAGE_API_KEY` ou `GEMINI_API_KEY`, `BRAINY_GOOGLE_IMAGE_MODEL`.
- Endpoint padrão: `https://generativelanguage.googleapis.com/v1beta/interactions`.
- Header: `x-goog-api-key`.
- Payload principal: `model`, `input` e `response_format` de imagem.
- Leitura de resposta: `output_image.data` em Base64, com fallback defensivo para blocos de imagem em `steps[].content[]`.
- Modelos configuráveis: `gemini-nano-banana-2.1` e `gemini-3-pro-image` (Nano Banana Pro).

## Configuração mínima

```dotenv
BRAINY_IMAGE_PROVIDER=openai
BRAINY_IMAGE_API_KEY=sk-...
BRAINY_IMAGE_MODEL=gpt-image-2.5-flare
BRAINY_VECTORIZE_RASTER=true

# ou Google Nano Banana
BRAINY_IMAGE_PROVIDER=google
BRAINY_GOOGLE_IMAGE_API_KEY=...
BRAINY_GOOGLE_IMAGE_MODEL=gemini-nano-banana-2.1
```

## Módulos

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/images.py` | Adaptadores HTTP, extração de Base64/URL, orquestração e persistência do asset |
| `backend/app/vectorizer.py` | Normalização Pillow, conversão `vtracer`, garantia de `<path>` e rejeição de raster embutido |
| `backend/app/config.py` | Chaves, modelos, endpoint Google e parâmetros de qualidade do traçado |
| `backend/app/main.py` | Rotas existentes `/api/images` e `/api/assets/{id}` |
| `backend/tests/test_vectorizer.py` | Teste sem rede com PNG sintético |

## Qualidade e trade-off

A vetorização é uma aproximação geométrica. Ela funciona melhor para logos, ícones, ilustrações chapadas e imagens com poucas cores. Fotos, sombras e texturas complexas podem gerar muitos paths e arquivos grandes. Por isso os parâmetros ficam configuráveis:

- `BRAINY_VECTORIZER_FILTER_SPECKLE`: remove ruído pequeno.
- `BRAINY_VECTORIZER_LAYER_DIFFERENCE`: controla separação entre camadas de cor.
- `BRAINY_VECTORIZER_PATH_PRECISION`: precisão decimal do path.
- `BRAINY_VECTORIZER_MODE=spline`: curvas suaves; `polygon` reduz custo/complexidade.

Se o provedor ou o vtracer falhar, o sistema registra um warning e usa o fallback SVG gerado por código pelo LLM. Assim, o usuário ainda recebe SVG puro — nunca o raster bruto.

## Segurança

1. As chaves ficam somente no backend.
2. O raster recebido não é publicado nem salvo como asset final.
3. O SVG é sanitizado antes da persistência.
4. Elementos `<script>`, `foreignObject`, atributos `on*`, `javascript:` e links externos são removidos.
5. SVG sem `<path>` ou com `<image>` é rejeitado.

## Testes

```bash
cd backend
python -m pytest tests -q
# 35 passed
```

Fontes oficiais consultadas:

- [OpenAI — Image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [Google — Gemini image generation / Nano Banana](https://ai.google.dev/gemini-api/docs/image-generation)
