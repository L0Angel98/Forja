# @forja/llm

Adaptador de proveedor LLM (Adapter) sobre Vercel AI SDK.

`VercelAiProveedorLLM` (spec 12) implementa el puerto `ProveedorLLM` de `@forja/core`. Recibe el `LanguageModel` por constructor (composition root en `apps/server`), así el proveedor real (Anthropic, OpenAI, Ollama local, etc.) es intercambiable sin tocar el loop del agente. `ejecutarTurno` (@forja/runtime) controla el ciclo de invocación de herramientas; por eso cada llamada a `decidir()` usa `maxSteps: 1` en el SDK.

> No se ejercita en CI (requiere credenciales reales de un proveedor). La cobertura del loop del agente usa un `ProveedorLLM` falso (`@forja/core`, `crearProveedorLLMFalso`). Solo `mapearMensajes` (pura, sin I/O) tiene test aquí.
