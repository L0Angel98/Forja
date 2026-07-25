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
  // Valores calcados de EstadoFalla en @forja/core (packages/core/src/entities/falla.ts):
  // abierto → en_revision → atendido → cerrado.
  estadoFalla: {
    abierto: "Abierta",
    enRevision: "En revisión",
    atendido: "Atendida",
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
    errorEnvio: "No se pudo obtener respuesta del agente. Tu mensaje se guardó — usa Reportar si es urgente.",
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
  auth: {
    emailEtiqueta: "Correo",
    contrasenaEtiqueta: "Contraseña",
    entrar: "Entrar",
    cerrarSesion: "Cerrar sesión",
    credencialesInvalidas: "Correo o contraseña incorrectos",
    demasiadosIntentos: "Demasiados intentos. Espera un momento y vuelve a intentar",
    usuarioDesactivado: "Esta cuenta está desactivada",
    errorGenerico: "No se pudo iniciar sesión",
  },
  nav: {
    navegacionPrincipal: "Navegación principal",
    chat: "Chat",
    reportar: "Reportar",
    misReportes: "Mis reportes",
    bandeja: "Bandeja",
    maquinas: "Máquinas",
    documentos: "Documentos",
    conectores: "Conectores",
    rutinas: "Rutinas",
    workspace: "Workspace",
  },
  reportar: {
    titulo: "Reportar falla",
    maquinaEtiqueta: "Tag de máquina",
    maquinaAyuda: "El código de la torreta física, p. ej. PRE-03",
    sintomaEtiqueta: "Síntoma",
    descripcionEtiqueta: "Descripción",
    descripcionAyuda: "¿Qué pasó?",
    enviar: "Reportar falla",
    exito: "Falla reportada",
    sintomas: {
      ruido_anormal: "Ruido anormal",
      vibracion_excesiva: "Vibración excesiva",
      fuga: "Fuga",
      sobrecalentamiento: "Sobrecalentamiento",
      no_enciende: "No enciende",
      paro_total: "Paro total",
      error_sensor: "Error de sensor",
    },
  },
  misReportes: {
    titulo: "Mis reportes",
    vacioTitulo: "Sin reportes esta semana",
    vacioDescripcion: "Cuando reportes una falla, aparecerá aquí.",
  },
  bandeja: {
    titulo: "Bandeja de pendientes",
    vacioTitulo: "Sin fallas pendientes",
    vacioDescripcion: "Las fallas nuevas aparecerán aquí para su revisión.",
    avanzarAEnRevision: "Poner en revisión",
    avanzarAAtendido: "Marcar atendida",
    avanzarACerrado: "Cerrar",
  },
  documentos: {
    titulo: "Documentos",
    vacioTitulo: "Sin documentos",
    vacioDescripcion: "Los documentos que subas para consulta del agente aparecerán aquí.",
  },
  proximamente: {
    titulo: "Próximamente",
    descripcion: "Esta sección todavía no está disponible.",
  },
} as const;

export type DiccionarioEsMX = typeof esMX;
