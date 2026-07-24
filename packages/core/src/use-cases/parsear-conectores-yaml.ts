import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { ROLES } from "../entities/usuario";
import type { ConectorConfigurado } from "../entities/conector";
import { ConectoresYamlInvalido } from "../errors/conectores-yaml-invalido";
import { ConectoresYamlSecretoInline } from "../errors/conectores-yaml-secreto-inline";

const NOMBRE_VARIABLE_ENTORNO = /^[A-Z_][A-Z0-9_]*$/;

const schemaConector = z.object({
  nombre: z.string().min(1),
  activo: z.boolean(),
  permisos: z.record(z.string(), z.array(z.enum(ROLES)).min(1)).default({}),
  credenciales: z.record(z.string(), z.string()).default({}),
  lista_blanca_urls: z.array(z.string().url()).default([]),
});

const schemaArchivo = z.object({
  conectores: z.array(schemaConector).default([]),
});

/**
 * Parsea y valida `workspace/conectores.yaml`. Las credenciales nunca son
 * el secreto en sí: cada valor debe ser el NOMBRE de una variable de
 * entorno (spec 17, "credenciales referidas por variable de entorno, nunca
 * inline"); un valor que no tenga pinta de nombre de variable se rechaza
 * como probable secreto inline.
 */
export function parsearConectoresYaml(contenidoYaml: string): ConectorConfigurado[] {
  let datosCrudos: unknown;
  try {
    datosCrudos = parseYaml(contenidoYaml) ?? {};
  } catch (error) {
    throw new ConectoresYamlInvalido(error instanceof Error ? error.message : "YAML inválido.");
  }

  const resultado = schemaArchivo.safeParse(datosCrudos);
  if (!resultado.success) throw new ConectoresYamlInvalido(resultado.error.message);

  const nombresVistos = new Set<string>();
  for (const conector of resultado.data.conectores) {
    if (nombresVistos.has(conector.nombre)) {
      throw new ConectoresYamlInvalido(`conector duplicado: "${conector.nombre}".`);
    }
    nombresVistos.add(conector.nombre);

    for (const [clave, valor] of Object.entries(conector.credenciales)) {
      if (!NOMBRE_VARIABLE_ENTORNO.test(valor)) {
        throw new ConectoresYamlSecretoInline(`conector "${conector.nombre}", credencial "${clave}"`);
      }
    }
  }

  return resultado.data.conectores.map((conector) => ({
    nombre: conector.nombre,
    activo: conector.activo,
    permisos: conector.permisos,
    credenciales: conector.credenciales,
    listaBlancaUrls: conector.lista_blanca_urls,
  }));
}
