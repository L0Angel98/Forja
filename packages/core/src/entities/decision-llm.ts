export type DecisionLLM =
  | { readonly tipo: "respuesta"; readonly texto: string }
  | { readonly tipo: "invocar_herramienta"; readonly nombre: string; readonly parametros: unknown };
