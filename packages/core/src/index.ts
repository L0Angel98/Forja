export const PACKAGE_NAME = "@forja/core";

export * from "./entities/usuario";
export * from "./entities/sesion";
export * from "./entities/herramienta";
export * from "./entities/mensaje-conversacion";
export * from "./entities/decision-llm";
export * from "./entities/turno-agente";
export * from "./entities/sugerencia-memoria";
export * from "./entities/workspace";
export * from "./entities/falla";
export * from "./entities/maquina";
export * from "./entities/sensor";
export * from "./entities/snapshot-sensor";
export * from "./entities/notificacion";
export * from "./entities/documento";
export * from "./entities/chunk-documento";
export * from "./entities/feedback-respuesta";
export * from "./entities/lectura-ingerida";
export * from "./entities/lectura-cuarentena";
export * from "./entities/sensor-catalogo";
export * from "./entities/agregacion-sensor";
export * from "./entities/sensor-mudo";
export * from "./entities/estado-ingesta";
export * from "./entities/rutina";
export * from "./entities/ejecucion-rutina";
export * from "./entities/conector";
export * from "./permisos";
export * from "./politica-bloqueo-login";
export * from "./diff-lineas";
export * from "./estado-falla";
export * from "./clasificar-lectura";
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
export * from "./errors/maquina-no-encontrada";
export * from "./errors/maquina-fuera-de-area";
export * from "./errors/sintoma-requerido";
export * from "./errors/demasiadas-fotos";
export * from "./errors/reporte-falla-no-encontrado";
export * from "./errors/transicion-estado-invalida";
export * from "./errors/formato-documento-no-soportado";
export * from "./errors/documento-demasiado-grande";
export * from "./errors/documento-sin-asociacion";
export * from "./errors/documento-no-encontrado";
export * from "./errors/rango-consulta-demasiado-amplio";
export * from "./errors/sensor-no-encontrado";
export * from "./errors/rutina-cron-invalido";
export * from "./errors/rutina-frecuencia-invalida";
export * from "./errors/rutina-herramienta-desconocida";
export * from "./errors/rutina-herramienta-escritura-no-permitida";
export * from "./errors/rutina-canal-invalido";
export * from "./errors/rutina-presupuesto-excede-maximo";
export * from "./errors/rutina-no-encontrada";
export * from "./errors/rutina-frontmatter-invalido";
export * from "./errors/manifiesto-conector-invalido";
export * from "./errors/conector-herramienta-duplicada";
export * from "./errors/conectores-yaml-invalido";
export * from "./errors/conectores-yaml-secreto-inline";
export * from "./errors/conector-no-disponible";
export * from "./errors/conector-desconocido";
export * from "./errors/webhook-url-no-permitida";

export * from "./events/bus-eventos";
export * from "./events/falla-reportada";
export * from "./events/registrar-manejadores-falla";

export * from "./ports/index";

export * from "./use-cases/iniciar-sesion";
export * from "./use-cases/cerrar-sesion";
export * from "./use-cases/obtener-sesion-actual";
export * from "./use-cases/proponer-sugerencia-memoria";
export * from "./use-cases/aprobar-sugerencia-memoria";
export * from "./use-cases/rechazar-sugerencia-memoria";
export * from "./use-cases/editar-archivo-workspace";
export * from "./use-cases/preparar-borrador-reporte-falla";
export * from "./use-cases/crear-reporte-falla";
export * from "./use-cases/cambiar-estado-falla";
export * from "./use-cases/materializar-snapshot-falla";
export * from "./use-cases/notificar-supervisores-falla";
export * from "./use-cases/cargar-documento";
export * from "./use-cases/reemplazar-version-documento";
export * from "./use-cases/eliminar-documento";
export * from "./use-cases/indexar-documento";
export * from "./use-cases/buscar-documentos";
export * from "./use-cases/registrar-feedback-respuesta";
export * from "./use-cases/consultar-sensores";
export * from "./use-cases/listar-sensores-mudos";
export * from "./use-cases/parsear-rutina";
export * from "./use-cases/validar-manifiesto-conector";
export * from "./use-cases/parsear-conectores-yaml";
export * from "./use-cases/construir-herramienta-conector";
export * from "./use-cases/confirmar-accion-conector";

/**
 * Dobles de prueba en memoria para los puertos de auth. Solo para tests
 * (de este paquete y de sus consumidores); nunca se usan en producción.
 */
export * from "./testing/fakes";
