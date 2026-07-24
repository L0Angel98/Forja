import type { CanalSalidaEnviador, ParametrosEnvioCanal } from "@forja/core";
import type { EnviadorCorreo } from "./enviador-correo";

const PREFIJO_ENV_GRUPO = "CORREO_GRUPO_";

function normalizarNombreGrupo(grupo: string): string {
  return grupo.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

/**
 * Implementa el canal "correo" de las rutinas (spec 16) sobre el conector
 * correo-smtp (spec 17: "usado también como canal de salida de rutinas").
 * Interpretación: como ni spec 16 ni spec 17 definen cómo un `grupo` de
 * texto (p. ej. "supervisores") se traduce a direcciones reales, se
 * resuelve vía una variable de entorno CORREO_GRUPO_<GRUPO> con
 * direcciones separadas por coma — mismo estilo que el resto de
 * credenciales/config sensible del proyecto (env var, nunca inline).
 */
export class CanalSalidaEnviadorCorreoSmtp implements CanalSalidaEnviador {
  constructor(private readonly enviador: EnviadorCorreo) {}

  async enviar(params: ParametrosEnvioCanal): Promise<void> {
    if (params.canal.tipo !== "correo") return;

    const variable = `${PREFIJO_ENV_GRUPO}${normalizarNombreGrupo(params.canal.grupo)}`;
    const valor = process.env[variable];
    if (!valor) {
      throw new Error(`No hay direcciones configuradas para el grupo "${params.canal.grupo}" (variable ${variable}).`);
    }
    const destinatarios = valor
      .split(",")
      .map((correo) => correo.trim())
      .filter((correo) => correo.length > 0);

    await this.enviador.enviar({
      destinatarios,
      asunto: `Forja · rutina ${params.rutinaNombre}`,
      cuerpo: params.resultado,
    });
  }
}
