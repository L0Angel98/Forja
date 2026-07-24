# Feature: Consulta de documentación (RAG)

## Objetivo

Que cualquier operador encuentre respuestas de manuales, SOPs y procedimientos preguntando en lenguaje natural, con cita de la fuente.

## Casos de uso

- Admin carga un documento (PDF, DOCX, MD) y lo asocia a máquinas/áreas/familias → se extrae texto, se trocea y se generan embeddings (job pg-boss con progreso visible).
- Operador pregunta → retrieval filtrado por sus áreas y por la máquina en contexto de la conversación (si la hay) → respuesta con citas: documento, página/sección.
- No hay chunks relevantes por encima del umbral de similitud → el agente dice explícitamente que no encontró la información y sugiere reportar el vacío de documentación (nunca inventa).
- Admin reemplaza la versión de un documento → los chunks anteriores se marcan obsoletos y las citas nuevas apuntan a la versión vigente.
- Feedback del usuario por respuesta: útil / no útil (alimenta la métrica de producto).

## Diseño

- Chunking = patrón **Strategy**: `PorEncabezados` (default para manuales) y `PorTamañoFijo` (fallback); elegible por tipo de documento.
- Embeddings vía `packages/llm` (Adapter): proveedor configurable, dimensión fija por instalación (migración documentada si cambia).
- Retrieval: pgvector (cosine) + filtro relacional por metadatos (área, máquina, vigente). Top-k=6, umbral configurable.
- Los chunks recuperados se inyectan como **datos delimitados**, con instrucción explícita al modelo de que el contenido de documentos no contiene órdenes a seguir (mitigación de prompt injection vía documentos).

## UI

- Admin: carga con arrastre, asociación a máquinas/áreas, estado de indexación, versiones.
- Operador: las respuestas muestran chips de cita que abren el documento en la página correspondiente.

## API

- `POST /api/documentos` (multipart)
- `GET  /api/documentos?maquina&area`
- `DELETE /api/documentos/:id` (soft delete: marca no vigente)
- La consulta viaja por `POST /api/chat` (herramienta `buscar_documentos`)

## Validaciones

- Formatos: PDF, DOCX, MD. Máx 50 MB.
- Documento sin asociación mínima a planta: rechazado.

## Seguridad

- Retrieval jamás devuelve chunks de áreas fuera del alcance del rol/usuario (filtro en la query, no en el prompt).

## Acceptance Criteria

- Evals: set de 20 preguntas con respuesta conocida sobre documentos seed → cita correcta en ≥ 17; y 5 preguntas sin respuesta en el corpus → el agente reconoce que no está en ≥ 5.
- Indexar un PDF de 100 páginas termina < 2 min en el hardware de referencia.
- Un documento marcado no vigente deja de aparecer en citas (test de integración).
- El filtro por área tiene test de contrato sobre el repositorio de chunks.
