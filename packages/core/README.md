# @forja/core

Dominio puro: entidades, casos de uso y puertos. Cero imports de infraestructura; su única dependencia permitida es `@forja/shared`.

- `entities/` — entidades y sus transiciones de estado (patrón State donde aplica).
- `use-cases/` — un caso de uso = una función/clase (principio S de SOLID).
- `ports/` — interfaces que implementa la infraestructura (`db`, `llm`, `connectors`).
- `events/` — bus de eventos de dominio in-process (patrón Observer).

> Paquete en fundación (spec 10): estructura lista; entidades y casos de uso se agregan en specs posteriores (11+).
