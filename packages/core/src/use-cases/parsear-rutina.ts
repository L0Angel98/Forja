import { CronExpressionParser } from "cron-parser";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { parsearCanalSalida, ROLES_RUTINA, type RutinaProgramada } from "../entities/rutina";
import { RutinaCanalInvalido } from "../errors/rutina-canal-invalido";
import { RutinaCronInvalido } from "../errors/rutina-cron-invalido";
import { RutinaFrecuenciaInvalida } from "../errors/rutina-frecuencia-invalida";
import { RutinaFrontmatterInvalido } from "../errors/rutina-frontmatter-invalido";
import { RutinaHerramientaDesconocida } from "../errors/rutina-herramienta-desconocida";
import { RutinaHerramientaEscrituraNoPermitida } from "../errors/rutina-herramienta-escritura-no-permitida";
import { RutinaPresupuestoExcedeMaximo } from "../errors/rutina-presupuesto-excede-maximo";
import type { CatalogoHerramientas } from "../ports/catalogo-herramientas";

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const FRECUENCIA_MINIMA_MS = 5 * 60 * 1000;
const MUESTRAS_FRECUENCIA = 3;

const schemaFrontmatter = z.object({
  nombre: z.string().min(1),
  cron: z.string().min(1),
  rol: z.enum(ROLES_RUTINA),
  herramientas: z.array(z.string().min(1)).min(1),
  salida: z.string().min(1),
  presupuesto_tokens: z.number().int().positive(),
  activa: z.boolean(),
});

export interface DependenciasParsearRutina {
  catalogoHerramientas: CatalogoHerramientas;
  presupuestoMaximoGlobal: number;
}

export interface ParametrosParsearRutina {
  contenidoArchivo: string;
}

/**
 * Frontmatter YAML de workspace/rutinas/{nombre}.md -> RutinaProgramada
 * validada. Todas las invariantes de la spec 16 se verifican aquí, antes de
 * que el scheduler la registre: cron real (no regex), frecuencia mínima de
 * 5 min, herramientas existentes y de solo lectura, canal conocido,
 * presupuesto dentro del máximo global.
 */
export function parsearRutina(deps: DependenciasParsearRutina, params: ParametrosParsearRutina): RutinaProgramada {
  const coincidencia = FRONTMATTER.exec(params.contenidoArchivo);
  if (!coincidencia) {
    throw new RutinaFrontmatterInvalido("falta el bloque de frontmatter YAML (--- ... ---).");
  }

  let datosCrudos: unknown;
  try {
    datosCrudos = parseYaml(coincidencia[1] ?? "");
  } catch (error) {
    throw new RutinaFrontmatterInvalido(error instanceof Error ? error.message : "YAML inválido.");
  }

  const resultado = schemaFrontmatter.safeParse(datosCrudos);
  if (!resultado.success) {
    throw new RutinaFrontmatterInvalido(resultado.error.message);
  }
  const frontmatter = resultado.data;

  validarCron(frontmatter.cron);

  const canal = parsearCanalSalida(frontmatter.salida);
  if (!canal) throw new RutinaCanalInvalido();

  for (const nombreHerramienta of frontmatter.herramientas) {
    if (!deps.catalogoHerramientas.existe(nombreHerramienta)) {
      throw new RutinaHerramientaDesconocida(nombreHerramienta);
    }
    if (!deps.catalogoHerramientas.esSoloLectura(nombreHerramienta)) {
      throw new RutinaHerramientaEscrituraNoPermitida(nombreHerramienta);
    }
  }

  if (frontmatter.presupuesto_tokens > deps.presupuestoMaximoGlobal) {
    throw new RutinaPresupuestoExcedeMaximo();
  }

  return {
    nombre: frontmatter.nombre,
    cron: frontmatter.cron,
    rol: frontmatter.rol,
    herramientas: frontmatter.herramientas,
    salida: canal,
    presupuestoTokens: frontmatter.presupuesto_tokens,
    activa: frontmatter.activa,
    prompt: (coincidencia[2] ?? "").trim(),
  };
}

function validarCron(cron: string): void {
  let expresion;
  try {
    expresion = CronExpressionParser.parse(cron, { currentDate: new Date() });
  } catch {
    throw new RutinaCronInvalido();
  }

  let anterior = expresion.next().toDate();
  for (let i = 0; i < MUESTRAS_FRECUENCIA; i++) {
    const siguiente = expresion.next().toDate();
    if (siguiente.getTime() - anterior.getTime() < FRECUENCIA_MINIMA_MS) {
      throw new RutinaFrecuenciaInvalida();
    }
    anterior = siguiente;
  }
}
