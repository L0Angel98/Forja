# workspace.example/

Workspace de agente de ejemplo. En una instalación real se monta como volumen en `WORKSPACE_DIR` (default `./workspace` en `apps/server`) y lo edita el rol admin — vía la API (`GET/PUT /api/admin/workspace/:archivo`, spec 12) o directamente en disco si la planta versiona su workspace en git.

- `soul.md` — personalidad, tono, idioma, límites del copiloto.
- `planta.md` — contexto local: turnos, áreas, jerga.
- `memoria.md` — memoria curada; el agente la propone (herramienta `proponer_memoria`), el admin la aprueba o rechaza desde `/api/admin/memoria/sugerencias`.
- `rutinas/*.md` — una rutina programada = un archivo. Contenido real en la spec 16; por ahora el loader ya detecta frontmatter YAML inválido en esta carpeta sin tumbar el resto del workspace.
- `conectores.yaml` — conectores MCP activos y permisos por rol. Formato de referencia; el loader llega en la spec 17.
