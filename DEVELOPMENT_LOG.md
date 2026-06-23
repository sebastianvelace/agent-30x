# Bitácora de desarrollo — Problemas y decisiones

Este documento registra los problemas reales que enfrentamos construyendo `agent-30x`,
su causa raíz y cómo los resolvimos. Sirve como material para el video de proceso y como
referencia de las decisiones técnicas tomadas.

> Filosofía: en un equipo AI-first, la IA ejecuta pero el humano dirige. Varios de estos
> problemas surgieron de suposiciones incorrectas que la IA arrastró — y se resolvieron
> verificando contra la realidad (corriendo el código, leyendo la documentación), no
> confiando ciegamente en la primera respuesta.

---

## 1. Suposición falsa: "Voyage AI usa la misma API key de Anthropic"

**Síntoma:** El código original de embeddings llamaba a
`anthropic.Anthropic().embeddings.create(model="voyage-3", ...)`. Ese método no existe.

**Causa raíz:** Anthropic adquirió Voyage AI en 2024, y de ahí salió la suposición de que
compartían SDK y API key. Es falso: la API de Anthropic **no tiene endpoint de embeddings**,
y Voyage sigue siendo un servicio separado con su propio paquete (`voyageai`) y su propia key.

**Solución:**
- Migramos a `voyageai.Client().embed(texts, model="voyage-3", input_type="query"|"document")`.
- La forma de la respuesta es `response.embeddings[i]` (lista de listas), no `response.data[i].embedding`.
- Agregamos `VOYAGE_API_KEY` como variable de entorno separada.
- Corregimos el README y el CLAUDE.md, que repetían la afirmación falsa de "una sola key".

**Archivos:** `backend/ingestion/embedder.py`, `backend/agent/retriever.py`,
`backend/requirements.txt`, `backend/.env.example`, `README.md`, `CLAUDE.md`.

**Aprendizaje:** Una adquisición corporativa no significa fusión de productos. Siempre
verificar la firma real de la API antes de asumir que existe.

---

## 2. El `upsert` de Supabase con expresión JSONB fallaba en runtime

**Síntoma:** La ingesta intentaba `upsert(rows, on_conflict="source_doc,metadata->>content_hash")`.

**Causa raíz:** `on_conflict` requiere una columna con un índice único real. `metadata->>content_hash`
es una expresión sobre un campo JSONB, no una columna indexada — Postgres no puede resolver el
conflicto y la operación falla.

**Solución:** Cambiamos a `insert()` plano. La idempotencia se maneja a nivel de script con los
flags `--replace` (borra los chunks de un doc y re-inserta) y `--reset` (limpia todo y re-indexa).
Más simple y predecible que forzar un índice único sobre JSONB.

**Archivos:** `backend/ingestion/embedder.py`, `backend/scripts/ingest.py`.

---

## 3. El endpoint `/ingest` devolvía 422 en vez de 401 sin la API key

**Síntoma:** Una request a `/ingest` sin el header `X-Api-Key` devolvía `422 Unprocessable Entity`
en lugar de `401 Unauthorized`.

**Causa raíz:** El handler declaraba `x_api_key` y `file` como parámetros de la ruta. FastAPI
valida el body (el archivo multipart) **antes** de ejecutar la lógica del handler, así que la
ausencia del archivo disparaba un 422 antes de que el chequeo de la key llegara a correr.

**Solución:** Movimos la verificación a una dependencia `Depends(verify_key)` a nivel de ruta,
que se ejecuta antes de la validación del body. Ahora una key faltante o incorrecta devuelve 401
correctamente.

**Archivos:** `backend/api/routes/ingest.py`.

**Aprendizaje:** En FastAPI, el orden de validación importa. La autenticación debe ir en una
dependencia, no mezclada con los parámetros del body.

---

## 4. Conflicto de dependencias: `httpx` entre `anthropic` y `supabase`

**Síntoma:** `pip install -r requirements.txt` fallaba con `ResolutionImpossible`.

**Causa raíz:** Habíamos fijado `httpx==0.28.1`. Pero `supabase==2.10.0` requiere `httpx<0.28`
y `anthropic==0.40.0` acepta cualquier `<1`. El pin entraba en conflicto directo.

**Solución:** Quitamos el pin explícito de `httpx` y dejamos que pip resuelva la versión
compatible (terminó en 0.27.2). Lección de no sobre-fijar dependencias transitivas.

**Archivos:** `backend/requirements.txt`.

---

## 5. Los clientes de API se inicializaban en tiempo de importación

**Síntoma:** Importar la app de FastAPI fallaba con `SupabaseException: Invalid API key`
incluso antes de levantar el servidor — y rompía cualquier intento de testear imports en seco.

**Causa raíz:** `create_client(...)` y `anthropic.Anthropic(...)` se ejecutaban a nivel de
módulo, así que se disparaban apenas se importaba el archivo, antes de que las variables de
entorno estuvieran necesariamente cargadas.

**Solución:** Envolvimos cada cliente en una factory con `@lru_cache(maxsize=1)`
(`_supabase()`, `_voyage()`, `_claude()`). Así la inicialización es perezosa: ocurre en la
primera llamada real, no al importar. Patrón consistente en todo el backend.

**Archivos:** `backend/agent/retriever.py`, `backend/agent/llm.py`, `backend/ingestion/embedder.py`.

---

## 6. El umbral de similitud 0.75 escalaba TODAS las preguntas

**Síntoma:** Con `SIMILARITY_THRESHOLD=0.75`, hasta las 5 preguntas centrales del brief
escalaban al Chief of Staff en vez de responderse con los documentos.

**Causa raíz:** `voyage-3` produce scores de coseno absolutos más bajos que otros modelos de
embeddings. En este corpus, los tops medidos van de ~0.24 a ~0.60. Un umbral de 0.75 deja
afuera todo.

**Solución:** Medimos los scores reales contra el corpus y ajustamos el default a **0.4** — lo
suficientemente bajo para fundamentar las preguntas reales, lo suficientemente alto para seguir
escalando las off-topic (la pregunta de vacaciones puntúa 0.279). Cambiamos el default en el
código, en `.env.example` y en el README, para que un deploy nuevo funcione sin configuración extra.

**Archivos:** `backend/agent/retriever.py`, `backend/.env.example`, `README.md`.

**Aprendizaje:** Los umbrales de similitud no son universales — dependen del modelo de embeddings.
Hay que calibrarlos empíricamente contra datos reales, no copiar un número "razonable".

---

## 7. Límite del retrieval: scores que se solapan en un corpus chico

**Síntoma:** La pregunta "¿a quién contacto por un bloqueo técnico?" (score 0.24) y la off-topic
"¿política de vacaciones?" (0.279) tienen scores que se **solapan**. Ningún umbral único puede
fundamentar una y escalar la otra al mismo tiempo.

**Causa raíz:** El corpus es muy pequeño (7 chunks en total) y la información de contacto técnico
no está fuertemente representada en los documentos.

**Estado:** No bloqueante. La pregunta 5 del brief igual responde correctamente porque el
system prompt incluye las reglas de escalado (deriva al Chief of Staff / equipo de Tech).

**Mejora futura:** Para retrieval de nivel producción, se implementaría búsqueda híbrida
(keyword + semántica) o query expansion. Con más documentos, el problema se diluye naturalmente.

---

## 8. `create-next-app` creó un repo git anidado dentro de `frontend/`

**Síntoma:** Al hacer `git add frontend/`, git mostraba `Am frontend` y lo trataba como
submódulo en vez de agregar los archivos.

**Causa raíz:** El scaffolder de Next.js inicializa su propio `.git` dentro de la carpeta
generada. Git detectó un repositorio anidado y lo registró como gitlink (submódulo).

**Solución:** Borramos solo `frontend/.git` (el sub-repo), dejando los archivos intactos, y
re-agregamos `frontend/` como archivos normales.

**Aprendizaje:** Verificar siempre si una herramienta de scaffolding deja un `.git` propio antes
de integrarla a un repo existente.

---

## 9. La key de Voyage no se guardó (placeholder vs. valor real)

**Síntoma:** El agente de QA reportó que el `.env` seguía con el placeholder
`FILL_IN_YOUR_VOYAGE_API_KEY...` aunque se creía que la key ya estaba puesta.

**Causa raíz:** El archivo se editó en el IDE pero no se guardó (Ctrl+S). El valor real nunca
llegó al disco.

**Solución:** Verificamos el contenido real del archivo con un chequeo que confirma el prefijo
`pa-` sin imprimir el secreto. Una vez guardado de verdad, la cadena RAG completa funcionó.

**Aprendizaje:** "Lo puse" y "lo guardé" no son lo mismo. Verificar el estado real del archivo,
no la intención.

---

## Resumen de verificación final

Tras resolver todo lo anterior, el backend pasó el test end-to-end contra servicios reales:

- ✅ Ingesta: 7 chunks en Supabase
- ✅ Las 5 preguntas del brief: fundamentadas, en español, con fuentes
- ✅ RF-01: responde solo de los documentos, no inventa
- ✅ RF-02: mantiene memoria de conversación dentro de la sesión
- ✅ RF-03: escala correctamente cuando no sabe
- ✅ `/ingest` protegido: 401 sin la API key correcta
