/**
 * Diccionario base (spec 02-interfaz: "Todo texto en packages/shared/i18n,
 * base es-MX, sin cadenas literales en componentes"). Español de planta,
 * no de software.
 */
export const esMX = {
  comun: {
    cargando: "Cargando…",
    reintentar: "Reintentar",
    confirmar: "Confirmar",
    corregir: "Corregir",
    cancelar: "Cancelar",
    guardar: "Guardar",
    cerrar: "Cerrar",
    enviar: "Enviar",
    buscar: "Buscar",
  },
  severidad: {
    etiqueta: "Severidad",
    nivel1: "Baja",
    nivel2: "Media",
    nivel3: "Alta",
    nivel4: "Crítica",
  },
  estadoFalla: {
    abierto: "Abierta",
    enProceso: "En proceso",
    resuelto: "Resuelta",
    cerrado: "Cerrada",
  },
  estadoMaquina: {
    operativa: "Operativa",
    enFalla: "En falla",
    enMantenimiento: "En mantenimiento",
    sensorMudo: "Sensor mudo",
  },
  estados: {
    vacioTitulo: "Nada por aquí todavía",
    errorTitulo: "No se pudo cargar",
    errorAccion: "Reintentar",
  },
  chat: {
    placeholder: "Escribe un mensaje…",
    remitenteUsuario: "Tú",
    remitenteAgente: "Agente",
  },
  graficaSensor: {
    rango: "Rango",
    rango24h: "24 h",
    rango7d: "7 d",
    rango30d: "30 d",
  },
  tablaDatos: {
    buscar: "Buscar",
    sinResultados: "Sin resultados para este filtro",
  },
  subidaArchivo: {
    tomarFoto: "Tomar foto",
    elegirArchivo: "Elegir archivo",
    subiendo: "Subiendo…",
    quitar: "Quitar",
    fallo: "No se pudo subir. Tus datos siguen aquí",
  },
} as const;

export type DiccionarioEsMX = typeof esMX;
