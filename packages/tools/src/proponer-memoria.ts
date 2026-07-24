import { proponerSugerenciaMemoria, type Herramienta, type RepositorioSugerenciasMemoria } from "@forja/core";
import { z } from "zod";

const schema = z.object({ contenido: z.string().min(1).max(2000) });

export interface DependenciasHerramientaProponerMemoria {
  sugerencias: RepositorioSugerenciasMemoria;
  generarId: () => string;
}

export function crearHerramientaProponerMemoria(
  deps: DependenciasHerramientaProponerMemoria,
): Herramienta<{ contenido: string }, { id: string }> {
  return {
    nombre: "proponer_memoria",
    descripcion:
      "Propone una entrada de memoria curada sobre la planta (patrones, contexto útil) para que un admin la apruebe o rechace.",
    rolesPermitidos: ["operador", "supervisor", "admin"],
    schema,
    async execute(parametros) {
      const sugerencia = await proponerSugerenciaMemoria(deps, {
        contenido: parametros.contenido,
        ahora: new Date(),
      });
      return { id: sugerencia.id };
    },
  };
}
