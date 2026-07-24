export const PACKAGE_NAME = "@forja/core";

export * from "./entities/usuario";
export * from "./entities/sesion";
export * from "./entities/herramienta";
export * from "./entities/mensaje-conversacion";
export * from "./entities/decision-llm";
export * from "./entities/turno-agente";
export * from "./entities/sugerencia-memoria";
export * from "./entities/workspace";
export * from "./permisos";
export * from "./politica-bloqueo-login";
export * from "./diff-lineas";
export * from "./config/sesion";

export * from "./errors/credenciales-invalidas";
export * from "./errors/usuario-desactivado";
export * from "./errors/sesion-invalida";
export * from "./errors/demasiados-intentos";
export * from "./errors/permiso-denegado";
export * from "./errors/herramienta-no-permitida";
export * from "./errors/sugerencia-memoria-no-encontrada";
export * from "./errors/sugerencia-memoria-ya-resuelta";
export * from "./errors/archivo-workspace-demasiado-grande";

export * from "./ports/index";

export * from "./use-cases/iniciar-sesion";
export * from "./use-cases/cerrar-sesion";
export * from "./use-cases/obtener-sesion-actual";
export * from "./use-cases/proponer-sugerencia-memoria";
export * from "./use-cases/aprobar-sugerencia-memoria";
export * from "./use-cases/rechazar-sugerencia-memoria";
export * from "./use-cases/editar-archivo-workspace";

/**
 * Dobles de prueba en memoria para los puertos de auth. Solo para tests
 * (de este paquete y de sus consumidores); nunca se usan en producción.
 */
export * from "./testing/fakes";
