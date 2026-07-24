export const PACKAGE_NAME = "@forja/core";

export * from "./entities/usuario";
export * from "./entities/sesion";
export * from "./permisos";
export * from "./politica-bloqueo-login";
export * from "./config/sesion";

export * from "./errors/credenciales-invalidas";
export * from "./errors/usuario-desactivado";
export * from "./errors/sesion-invalida";
export * from "./errors/demasiados-intentos";
export * from "./errors/permiso-denegado";

export * from "./ports/index";

export * from "./use-cases/iniciar-sesion";
export * from "./use-cases/cerrar-sesion";
export * from "./use-cases/obtener-sesion-actual";

/**
 * Dobles de prueba en memoria para los puertos de auth. Solo para tests
 * (de este paquete y de sus consumidores); nunca se usan en producción.
 */
export * from "./testing/fakes";
