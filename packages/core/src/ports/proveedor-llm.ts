import type { DecisionLLM } from "../entities/decision-llm";
import type { Herramienta } from "../entities/herramienta";
import type { MensajeConversacion } from "../entities/mensaje-conversacion";

export interface ParametrosDecisionLLM {
  readonly systemPrompt: string;
  readonly historial: readonly MensajeConversacion[];
  readonly mensaje: string;
  readonly herramientasDisponibles: readonly Herramienta[];
}

export interface RespuestaProveedorLLM {
  readonly decision: DecisionLLM;
  readonly tokensEntrada: number;
  readonly tokensSalida: number;
  readonly costoUsd: number;
}

export interface ProveedorLLM {
  decidir(params: ParametrosDecisionLLM): Promise<RespuestaProveedorLLM>;
}
