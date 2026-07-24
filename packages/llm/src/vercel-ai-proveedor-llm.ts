import type { Herramienta, ParametrosDecisionLLM, ProveedorLLM, RespuestaProveedorLLM } from "@forja/core";
import { generateText, type LanguageModel, type Tool, type ToolSet } from "ai";
import { mapearMensajes } from "./mapear-mensajes";

export interface CalculadoraCostoUsd {
  (tokensEntrada: number, tokensSalida: number): number;
}

const SIN_COSTO: CalculadoraCostoUsd = () => 0;

/**
 * Adapter (patrón Adapter) del puerto ProveedorLLM sobre el Vercel AI SDK.
 * El `model` es inyectado por el composition root (apps/server), así el
 * proveedor real (Anthropic, OpenAI, Ollama local, etc.) es intercambiable.
 *
 * No se ejercita en CI: requiere credenciales reales de un proveedor. La
 * cobertura de `ejecutarTurno` (@forja/runtime) usa un ProveedorLLM falso.
 */
export class VercelAiProveedorLLM implements ProveedorLLM {
  constructor(
    private readonly modelo: LanguageModel,
    private readonly calcularCostoUsd: CalculadoraCostoUsd = SIN_COSTO,
  ) {}

  async decidir(params: ParametrosDecisionLLM): Promise<RespuestaProveedorLLM> {
    const resultado = await generateText({
      model: this.modelo,
      system: params.systemPrompt,
      messages: [...mapearMensajes(params.historial), { role: "user", content: params.mensaje }],
      tools: construirHerramientas(params.herramientasDisponibles),
      maxSteps: 1,
    });

    const tokensEntrada = resultado.usage.promptTokens;
    const tokensSalida = resultado.usage.completionTokens;
    const costoUsd = this.calcularCostoUsd(tokensEntrada, tokensSalida);

    const [primeraLlamada] = resultado.toolCalls;
    if (primeraLlamada) {
      return {
        decision: {
          tipo: "invocar_herramienta",
          nombre: primeraLlamada.toolName,
          parametros: primeraLlamada.args,
        },
        tokensEntrada,
        tokensSalida,
        costoUsd,
      };
    }

    return {
      decision: { tipo: "respuesta", texto: resultado.text },
      tokensEntrada,
      tokensSalida,
      costoUsd,
    };
  }
}

function construirHerramientas(herramientas: readonly Herramienta[]): ToolSet {
  const tools: ToolSet = {};
  for (const herramienta of herramientas) {
    const definicion: Tool = { description: herramienta.descripcion, parameters: herramienta.schema };
    tools[herramienta.nombre] = definicion;
  }
  return tools;
}
