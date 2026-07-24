# @forja/runtime

Loop del agente, registro de herramientas (Registry), políticas de ejecución.

- `RegistroHerramientas` (spec 11): Registry de herramientas filtrado por rol — `disponiblesPara(rol)` solo devuelve las herramientas cuyo `rolesPermitidos` incluye ese rol. Es la pieza que consumirá el loop del agente.

> El loop del agente (invocación del LLM, herramientas concretas, workspace) llega en la spec 12.
