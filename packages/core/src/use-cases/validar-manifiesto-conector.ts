import { z } from "zod";
import type { ManifiestoConector } from "../entities/conector";
import { ManifiestoConectorInvalido } from "../errors/manifiesto-conector-invalido";

const schemaHerramientaCruda = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.record(z.string(), z.unknown()),
  annotations: z.object({ readOnlyHint: z.boolean().optional() }).partial().optional(),
});

/**
 * No valida un documento de manifiesto aparte: valida (Zod) y da forma a la
 * respuesta cruda y real de `tools/list` de un cliente MCP — así un
 * servidor MCP mal formado no puede colar herramientas inválidas en el
 * registry sin que el loader lo detecte (spec 17: "manifiesto validado con
 * Zod al cargar").
 */
export function validarManifiestoConector(
  nombreConector: string,
  version: string,
  herramientasCrudas: readonly Record<string, unknown>[],
): ManifiestoConector {
  const herramientas = herramientasCrudas.map((cruda) => {
    const resultado = schemaHerramientaCruda.safeParse(cruda);
    if (!resultado.success) {
      throw new ManifiestoConectorInvalido(`conector "${nombreConector}": ${resultado.error.message}`);
    }
    return {
      nombre: resultado.data.name,
      descripcion: resultado.data.description,
      // Postura segura por defecto: sin readOnlyHint explícito se asume escritura.
      esEscritura: !(resultado.data.annotations?.readOnlyHint ?? false),
      schemaEntrada: resultado.data.inputSchema,
    };
  });

  const nombresVistos = new Set<string>();
  for (const herramienta of herramientas) {
    if (nombresVistos.has(herramienta.nombre)) {
      throw new ManifiestoConectorInvalido(
        `conector "${nombreConector}": herramienta duplicada "${herramienta.nombre}".`,
      );
    }
    nombresVistos.add(herramienta.nombre);
  }

  return { nombre: nombreConector, version, herramientas };
}
