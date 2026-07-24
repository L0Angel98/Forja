import type { Usuario } from "../entities/usuario";
import type { Sesion } from "../entities/sesion";
import type { RepositorioUsuarios } from "../ports/repositorio-usuarios";
import type { RepositorioSesiones } from "../ports/repositorio-sesiones";
import type { HasherContrasenas } from "../ports/hasher-contrasenas";
import type { RegistroIntentos, RepositorioIntentosLogin } from "../ports/repositorio-intentos-login";
import type { EventoAuditoria, RegistradorAuditoria } from "../ports/registrador-auditoria";
import type { SugerenciaMemoria } from "../entities/sugerencia-memoria";
import type { RepositorioSugerenciasMemoria } from "../ports/repositorio-sugerencias-memoria";
import type { EscritorMemoria } from "../ports/escritor-memoria";
import type { ArchivoWorkspaceEditable } from "../entities/workspace";
import type { EscritorArchivosWorkspace } from "../ports/escritor-archivos-workspace";
import type { TurnoAgente } from "../entities/turno-agente";
import type { RegistradorTrace } from "../ports/registrador-trace";
import type { ProveedorLLM, RespuestaProveedorLLM } from "../ports/proveedor-llm";
import type { Maquina } from "../entities/maquina";
import type { RepositorioMaquinas } from "../ports/repositorio-maquinas";
import type { RepositorioAreasUsuario } from "../ports/repositorio-areas-usuario";
import type { ReporteFalla } from "../entities/falla";
import type { FiltrosListarFallas, RepositorioFallas } from "../ports/repositorio-fallas";
import type { SensorInfo, LecturaSensor } from "../entities/sensor";
import type { RepositorioSensoresPorMaquina } from "../ports/repositorio-sensores-por-maquina";
import type { RepositorioLecturasVentana } from "../ports/repositorio-lecturas-ventana";
import type { SnapshotSensor } from "../entities/snapshot-sensor";
import type { RepositorioSnapshotsFalla } from "../ports/repositorio-snapshots-falla";
import type { Notificacion } from "../entities/notificacion";
import type { RepositorioNotificaciones } from "../ports/repositorio-notificaciones";
import type { ColaTrabajos } from "../ports/cola-trabajos";
import type { Documento } from "../entities/documento";
import type { FiltrosListarDocumentos, RepositorioDocumentos } from "../ports/repositorio-documentos";
import type { ChunkDocumento, CitaDocumento } from "../entities/chunk-documento";
import type { FiltrosBuscarSimilares, RepositorioChunks } from "../ports/repositorio-chunks";
import type { AlmacenArchivos } from "../ports/almacen-archivos";
import type { ExtractorTexto, TextoExtraido } from "../ports/extractor-texto";
import type { GeneradorEmbeddings } from "../ports/generador-embeddings";
import type { FeedbackRespuesta } from "../entities/feedback-respuesta";
import type { RepositorioFeedback } from "../ports/repositorio-feedback";
import type { LecturaIngerida } from "../entities/lectura-ingerida";
import type { RepositorioLecturas } from "../ports/repositorio-lecturas";
import type { LecturaCuarentena } from "../entities/lectura-cuarentena";
import type { RepositorioCuarentena } from "../ports/repositorio-cuarentena";
import type { SensorCatalogo } from "../entities/sensor-catalogo";
import type { RepositorioCatalogoSensores } from "../ports/repositorio-catalogo-sensores";
import { MAXIMO_PUNTOS_SERIE, type Bucket, type PuntoSerieAgregada, type TipoAgregacion } from "../entities/agregacion-sensor";
import type { ParametrosConsultaAgregada, RepositorioAgregacionesSensores } from "../ports/repositorio-agregaciones-sensores";
import type { EstadoIngesta } from "../entities/estado-ingesta";
import type { RepositorioEstadoIngesta } from "../ports/repositorio-estado-ingesta";
import type { CatalogoHerramientas } from "../ports/catalogo-herramientas";
import type { EjecucionRutina } from "../entities/ejecucion-rutina";
import type { RepositorioEjecucionesRutina } from "../ports/repositorio-ejecuciones-rutina";
import type { CanalSalidaEnviador, ParametrosEnvioCanal } from "../ports/canal-salida-enviador";
import type { EscritorArchivosRutinas } from "../ports/escritor-archivos-rutinas";
import type { ClienteMcp } from "../ports/cliente-mcp";
import type { ConectorActivo, RegistroConectoresActivos } from "../ports/registro-conectores-activos";

export function crearRepositorioUsuariosMemoria(usuariosIniciales: Usuario[] = []): RepositorioUsuarios & {
  usuarios: Map<string, Usuario>;
} {
  const usuarios = new Map(usuariosIniciales.map((u) => [u.id, u]));

  return {
    usuarios,
    async buscarPorEmail(email) {
      for (const usuario of usuarios.values()) {
        if (usuario.email === email) return usuario;
      }
      return null;
    },
    async buscarPorId(id) {
      return usuarios.get(id) ?? null;
    },
  };
}

export function crearRepositorioSesionesMemoria(): RepositorioSesiones & { sesiones: Map<string, Sesion> } {
  const sesiones = new Map<string, Sesion>();

  return {
    sesiones,
    async crear(sesion) {
      sesiones.set(sesion.id, sesion);
    },
    async buscarPorId(id) {
      return sesiones.get(id) ?? null;
    },
    async actualizarUltimaActividad(id, fecha) {
      const sesion = sesiones.get(id);
      if (sesion) sesiones.set(id, { ...sesion, ultimaActividadEn: fecha });
    },
    async eliminar(id) {
      sesiones.delete(id);
    },
  };
}

/** Hasher falso: el "hash" es el texto plano con un prefijo, suficiente para probar la lógica de casos de uso sin costo criptográfico real. */
export function crearHasherContrasenasFalso(): HasherContrasenas {
  return {
    async hash(contrasenaPlana) {
      return `hash:${contrasenaPlana}`;
    },
    async verificar(hash, contrasenaPlana) {
      return hash === `hash:${contrasenaPlana}`;
    },
  };
}

export function crearRepositorioIntentosLoginMemoria(): RepositorioIntentosLogin & {
  registros: Map<string, RegistroIntentos>;
} {
  const registros = new Map<string, RegistroIntentos>();
  const clave = (ip: string, email: string) => `${ip}:${email}`;

  return {
    registros,
    async obtener(ip, email) {
      return registros.get(clave(ip, email)) ?? null;
    },
    async guardar(ip, email, registro) {
      registros.set(clave(ip, email), registro);
    },
    async eliminar(ip, email) {
      registros.delete(clave(ip, email));
    },
  };
}

export function crearRegistradorAuditoriaMemoria(): RegistradorAuditoria & { eventos: EventoAuditoria[] } {
  const eventos: EventoAuditoria[] = [];
  return {
    eventos,
    async registrar(evento) {
      eventos.push(evento);
    },
  };
}

export function crearRepositorioSugerenciasMemoriaFalso(): RepositorioSugerenciasMemoria & {
  sugerencias: Map<string, SugerenciaMemoria>;
} {
  const sugerencias = new Map<string, SugerenciaMemoria>();
  return {
    sugerencias,
    async crear(sugerencia) {
      sugerencias.set(sugerencia.id, sugerencia);
    },
    async buscarPorId(id) {
      return sugerencias.get(id) ?? null;
    },
    async listarPendientes() {
      return [...sugerencias.values()].filter((s) => s.estado === "pendiente");
    },
    async actualizarEstado(id, estado) {
      const sugerencia = sugerencias.get(id);
      if (sugerencia) sugerencias.set(id, { ...sugerencia, estado });
    },
  };
}

export function crearEscritorMemoriaFalso(): EscritorMemoria & { entradas: string[] } {
  const entradas: string[] = [];
  return {
    entradas,
    async agregarEntrada(texto) {
      entradas.push(texto);
    },
  };
}

export function crearEscritorArchivosWorkspaceFalso(
  contenidoInicial: Partial<Record<ArchivoWorkspaceEditable, string>> = {},
): EscritorArchivosWorkspace & { archivos: Record<string, string> } {
  const archivos: Record<string, string> = { soul: "", planta: "", ...contenidoInicial };
  return {
    archivos,
    async leer(archivo) {
      return archivos[archivo] ?? "";
    },
    async escribir(archivo, contenido) {
      archivos[archivo] = contenido;
    },
  };
}

export function crearRegistradorTraceFalso(): RegistradorTrace & { turnos: TurnoAgente[] } {
  const turnos: TurnoAgente[] = [];
  return {
    turnos,
    async registrarTurno(turno) {
      turnos.push(turno);
    },
  };
}

/** Proveedor LLM falso: entrega respuestas guionadas en orden, una por llamada a `decidir`. */
export function crearProveedorLLMFalso(respuestas: RespuestaProveedorLLM[]): ProveedorLLM & { llamadas: number } {
  const estado = { llamadas: 0 };
  return {
    get llamadas() {
      return estado.llamadas;
    },
    async decidir() {
      const respuesta = respuestas[estado.llamadas];
      estado.llamadas += 1;
      if (!respuesta) {
        throw new Error("El proveedor LLM falso se quedó sin respuestas guionadas.");
      }
      return respuesta;
    },
  };
}

export function crearRepositorioMaquinasFalso(maquinas: Maquina[] = []): RepositorioMaquinas & {
  maquinas: Map<string, Maquina>;
} {
  const mapa = new Map(maquinas.map((m) => [m.id, m]));
  return {
    maquinas: mapa,
    async buscarPorId(id) {
      return mapa.get(id) ?? null;
    },
    async listarPorArea(areaId) {
      return [...mapa.values()].filter((m) => m.areaId === areaId);
    },
  };
}

export function crearRepositorioAreasUsuarioFalso(
  asignaciones: Record<string, string[]> = {},
): RepositorioAreasUsuario & { asignaciones: Record<string, string[]> } {
  return {
    asignaciones,
    async areasDe(usuarioId) {
      return asignaciones[usuarioId] ?? [];
    },
  };
}

/**
 * `maquinas` es opcional y solo se usa para resolver `filtros.areaIds` (el
 * repo real hace un join con `machine`; el falso necesita el mismo mapa
 * machineId → areaId que ya expone `crearRepositorioMaquinasFalso`).
 */
export function crearRepositorioFallasFalso(
  maquinas?: Map<string, Maquina>,
): RepositorioFallas & { fallas: Map<string, ReporteFalla> } {
  const fallas = new Map<string, ReporteFalla>();
  return {
    fallas,
    async crear(reporte) {
      fallas.set(reporte.id, reporte);
    },
    async buscarPorId(id) {
      return fallas.get(id) ?? null;
    },
    async actualizarEstado(id, estado) {
      const reporte = fallas.get(id);
      if (reporte) fallas.set(id, { ...reporte, estado });
    },
    async listar(filtros: FiltrosListarFallas) {
      return [...fallas.values()].filter((f) => {
        if (filtros.machineId && f.machineId !== filtros.machineId) return false;
        if (filtros.estado && f.estado !== filtros.estado) return false;
        if (filtros.severidad && f.severidad !== filtros.severidad) return false;
        if (filtros.areaIds) {
          const areaId = maquinas?.get(f.machineId)?.areaId;
          if (!areaId || !filtros.areaIds.includes(areaId)) return false;
        }
        return true;
      });
    },
  };
}

export function crearRepositorioSensoresPorMaquinaFalso(
  sensoresPorMaquina: Record<string, SensorInfo[]> = {},
): RepositorioSensoresPorMaquina {
  return {
    async listarPorMaquina(machineId) {
      return sensoresPorMaquina[machineId] ?? [];
    },
  };
}

export function crearRepositorioLecturasVentanaFalso(
  lecturasPorSensor: Record<string, LecturaSensor[]> = {},
): RepositorioLecturasVentana {
  return {
    async leerVentana(sensorId, desde, hasta) {
      const lecturas = lecturasPorSensor[sensorId] ?? [];
      return lecturas.filter((l) => l.ts >= desde && l.ts <= hasta);
    },
  };
}

export function crearRepositorioSnapshotsFallaFalso(): RepositorioSnapshotsFalla & {
  snapshots: SnapshotSensor[];
} {
  const snapshots: SnapshotSensor[] = [];
  return {
    snapshots,
    async crear(snapshot) {
      snapshots.push(snapshot);
    },
    async listarPorReporte(failureReportId) {
      return snapshots.filter((s) => s.failureReportId === failureReportId);
    },
  };
}

export function crearRepositorioNotificacionesFalso(): RepositorioNotificaciones & {
  notificaciones: Notificacion[];
} {
  const notificaciones: Notificacion[] = [];
  return {
    notificaciones,
    async crear(notificacion) {
      notificaciones.push(notificacion);
    },
    async listar(areaId) {
      return areaId ? notificaciones.filter((n) => n.areaId === areaId) : notificaciones;
    },
  };
}

export function crearColaTrabajosFalso(): ColaTrabajos & {
  encolados: Array<{ tipo: string; payload: Record<string, unknown> }>;
} {
  const encolados: Array<{ tipo: string; payload: Record<string, unknown> }> = [];
  return {
    encolados,
    async encolar(tipo, payload) {
      encolados.push({ tipo, payload });
    },
  };
}

export function crearRepositorioDocumentosFalso(
  documentosIniciales: Documento[] = [],
): RepositorioDocumentos & { documentos: Map<string, Documento> } {
  const documentos = new Map(documentosIniciales.map((d) => [d.id, d]));
  return {
    documentos,
    async crear(documento) {
      documentos.set(documento.id, documento);
    },
    async buscarPorId(id) {
      return documentos.get(id) ?? null;
    },
    async listar(filtros: FiltrosListarDocumentos) {
      return [...documentos.values()].filter((d) => {
        if (filtros.soloVigentes && !d.vigente) return false;
        if (filtros.maquinaId && !d.asociaciones.maquinaIds.includes(filtros.maquinaId)) return false;
        if (filtros.areaId && !d.asociaciones.areaIds.includes(filtros.areaId)) return false;
        return true;
      });
    },
    async actualizarVigencia(id, vigente) {
      const documento = documentos.get(id);
      if (documento) documentos.set(id, { ...documento, vigente });
    },
    async actualizarEstadoIndexacion(id, estadoIndexacion) {
      const documento = documentos.get(id);
      if (documento) documentos.set(id, { ...documento, estadoIndexacion });
    },
  };
}

function similitudCoseno(a: readonly number[], b: readonly number[]): number {
  let producto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    producto += a[i]! * b[i]!;
    normaA += a[i]! * a[i]!;
    normaB += b[i]! * b[i]!;
  }
  if (normaA === 0 || normaB === 0) return 0;
  return producto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

/**
 * `documentos` es opcional y solo se usa para resolver el nombre del
 * documento y para aplicar `filtros.areaIds`/`filtros.maquinaId` (el repo
 * real hace un join con `document`/`document_area`/`document_machine`).
 */
export function crearRepositorioChunksFalso(
  documentos?: Map<string, Documento>,
): RepositorioChunks & { chunks: ChunkDocumento[] } {
  const chunks: ChunkDocumento[] = [];
  return {
    chunks,
    async crearMuchos(nuevos) {
      chunks.push(...nuevos);
    },
    async buscarPorDocumento(documentoId) {
      return chunks.filter((c) => c.documentoId === documentoId);
    },
    async marcarNoVigentesPorDocumento(documentoId) {
      for (let i = 0; i < chunks.length; i++) {
        if (chunks[i]!.documentoId === documentoId) {
          chunks[i] = { ...chunks[i]!, vigente: false };
        }
      }
    },
    async buscarSimilares(embeddingConsulta, filtros: FiltrosBuscarSimilares) {
      const resultados: CitaDocumento[] = [];

      for (const chunk of chunks) {
        if (!chunk.vigente) continue;
        const documento = documentos?.get(chunk.documentoId);
        if (documentos && (!documento || !documento.vigente)) continue;
        if (filtros.areaIds && documento && !filtros.areaIds.some((a) => documento.asociaciones.areaIds.includes(a))) {
          continue;
        }
        if (
          filtros.maquinaId &&
          documento &&
          documento.asociaciones.maquinaIds.length > 0 &&
          !documento.asociaciones.maquinaIds.includes(filtros.maquinaId)
        ) {
          continue;
        }

        const similitud = similitudCoseno(embeddingConsulta, chunk.embedding);
        if (similitud < filtros.umbralSimilitud) continue;

        resultados.push({
          documentoId: chunk.documentoId,
          documentoNombre: documento?.nombre ?? "documento",
          contenido: chunk.contenido,
          seccion: chunk.seccion,
          pagina: chunk.pagina,
          similitud,
        });
      }

      resultados.sort((a, b) => b.similitud - a.similitud);
      return resultados.slice(0, filtros.topK);
    },
  };
}

export function crearAlmacenArchivosFalso(): AlmacenArchivos & { archivos: Map<string, Buffer> } {
  const archivos = new Map<string, Buffer>();
  let contador = 0;
  return {
    archivos,
    async guardar(nombreSugerido, contenido) {
      contador += 1;
      const ruta = `falso://${contador}-${nombreSugerido}`;
      archivos.set(ruta, contenido);
      return ruta;
    },
    async leer(ruta) {
      const contenido = archivos.get(ruta);
      if (!contenido) throw new Error(`No existe el archivo falso en "${ruta}".`);
      return contenido;
    },
  };
}

export function crearExtractorTextoFalso(
  respuesta: TextoExtraido = { texto: "texto de prueba", totalPaginas: null, paginas: null },
): ExtractorTexto {
  return {
    async extraer() {
      return respuesta;
    },
  };
}

/** Genera embeddings deterministas a partir del texto, sin costo ni red. */
export function crearGeneradorEmbeddingsFalso(
  generar: (texto: string) => number[] = (texto) => [texto.length, [...texto].filter((c) => c === "a").length, 1],
): GeneradorEmbeddings & { llamadas: string[][] } {
  const llamadas: string[][] = [];
  return {
    dimensiones: 3,
    llamadas,
    async generar(textos) {
      llamadas.push([...textos]);
      return textos.map(generar);
    },
  };
}

export function crearRepositorioFeedbackFalso(): RepositorioFeedback & { feedbacks: FeedbackRespuesta[] } {
  const feedbacks: FeedbackRespuesta[] = [];
  return {
    feedbacks,
    async crear(feedback) {
      feedbacks.push(feedback);
    },
  };
}

export function crearRepositorioLecturasFalso(): RepositorioLecturas & { lecturas: LecturaIngerida[] } {
  const lecturas: LecturaIngerida[] = [];
  return {
    lecturas,
    async insertarLote(nuevas) {
      lecturas.push(...nuevas);
    },
    async ultimaLecturaEn(sensorId) {
      const delSensor = lecturas.filter((l) => l.sensorId === sensorId);
      if (delSensor.length === 0) return null;
      return delSensor.reduce((max, l) => (l.ts > max ? l.ts : max), delSensor[0]!.ts);
    },
  };
}

export function crearRepositorioCuarentenaFalso(): RepositorioCuarentena & { registros: LecturaCuarentena[] } {
  const registros: LecturaCuarentena[] = [];
  return {
    registros,
    async crear(lectura) {
      registros.push(lectura);
    },
    async contar() {
      return registros.length;
    },
  };
}

export function crearRepositorioCatalogoSensoresFalso(
  sensoresIniciales: SensorCatalogo[] = [],
): RepositorioCatalogoSensores & { sensores: Map<string, SensorCatalogo> } {
  const sensores = new Map(sensoresIniciales.map((s) => [s.id, s]));
  return {
    sensores,
    async listar() {
      return [...sensores.values()];
    },
    async buscarPorId(id) {
      return sensores.get(id) ?? null;
    },
    async listarPorMaquina(machineId) {
      return [...sensores.values()].filter((s) => s.machineId === machineId);
    },
  };
}

const BUCKET_MS: Record<Bucket, number> = { "5m": 5 * 60 * 1000, "1h": 60 * 60 * 1000, "1d": 24 * 60 * 60 * 1000 };
const ORDEN_BUCKETS: readonly Bucket[] = ["5m", "1h", "1d"];

function agregarValores(valores: number[], agregacion: TipoAgregacion): number | null {
  if (valores.length === 0) return agregacion === "count" ? 0 : null;
  switch (agregacion) {
    case "min":
      return Math.min(...valores);
    case "max":
      return Math.max(...valores);
    case "avg":
      return valores.reduce((a, b) => a + b, 0) / valores.length;
    case "count":
      return valores.length;
    case "last":
      return valores[valores.length - 1]!;
  }
}

function calcularPuntos(
  lecturas: readonly LecturaIngerida[],
  params: ParametrosConsultaAgregada,
  bucket: Bucket,
): PuntoSerieAgregada[] {
  const ms = BUCKET_MS[bucket];
  const grupos = new Map<number, number[]>();

  for (const lectura of lecturas) {
    if (lectura.sensorId !== params.sensorId) continue;
    if (lectura.ts < params.desde || lectura.ts > params.hasta) continue;
    const clave = Math.floor(lectura.ts.getTime() / ms) * ms;
    const valores = grupos.get(clave) ?? [];
    valores.push(lectura.value);
    grupos.set(clave, valores);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([clave, valores]) => ({ bucket: new Date(clave), valor: agregarValores(valores, params.agregacion) }));
}

/** Replica en memoria el re-bucketing automático (≤ MAXIMO_PUNTOS_SERIE) que hace el repo real. */
export function crearRepositorioAgregacionesSensoresFalso(
  lecturasIniciales: LecturaIngerida[] = [],
): RepositorioAgregacionesSensores & { lecturas: LecturaIngerida[] } {
  const lecturas = [...lecturasIniciales];
  return {
    lecturas,
    async consultar(params) {
      let indice = ORDEN_BUCKETS.indexOf(params.bucket);
      let bucketUsado = params.bucket;
      let puntos = calcularPuntos(lecturas, params, bucketUsado);
      let reBucketizado = false;

      while (puntos.length > MAXIMO_PUNTOS_SERIE && indice < ORDEN_BUCKETS.length - 1) {
        indice += 1;
        bucketUsado = ORDEN_BUCKETS[indice]!;
        puntos = calcularPuntos(lecturas, params, bucketUsado);
        reBucketizado = true;
      }

      return { sensorId: params.sensorId, agregacion: params.agregacion, bucket: bucketUsado, puntos, reBucketizado };
    },
  };
}

export function crearRepositorioEstadoIngestaFalso(): RepositorioEstadoIngesta & { estado: EstadoIngesta | null } {
  const estado = { valor: null as EstadoIngesta | null };
  return {
    get estado() {
      return estado.valor;
    },
    async actualizar(nuevo) {
      estado.valor = nuevo;
    },
    async obtener() {
      return estado.valor;
    },
  };
}

/** `herramientas` mapea nombre -> soloLectura. */
export function crearCatalogoHerramientasFalso(
  herramientas: Record<string, boolean> = {},
): CatalogoHerramientas & { herramientas: Map<string, boolean> } {
  const mapa = new Map(Object.entries(herramientas));
  return {
    herramientas: mapa,
    existe(nombre) {
      return mapa.has(nombre);
    },
    esSoloLectura(nombre) {
      return mapa.get(nombre) ?? false;
    },
  };
}

export function crearRepositorioEjecucionesRutinaFalso(): RepositorioEjecucionesRutina & {
  ejecuciones: EjecucionRutina[];
} {
  const ejecuciones: EjecucionRutina[] = [];
  return {
    ejecuciones,
    async crear(ejecucion) {
      ejecuciones.push(ejecucion);
    },
    async listarPorRutina(rutinaNombre, limite) {
      return ejecuciones
        .filter((e) => e.rutinaNombre === rutinaNombre)
        .sort((a, b) => b.iniciadaEn.getTime() - a.iniciadaEn.getTime())
        .slice(0, limite);
    },
    async hayEnCurso(rutinaNombre) {
      return ejecuciones.some((e) => e.rutinaNombre === rutinaNombre && e.finalizadaEn === null);
    },
    async tokensUsadosDesde(plantId, desde) {
      return ejecuciones
        .filter((e) => e.plantId === plantId && e.iniciadaEn >= desde)
        .reduce((total, e) => total + e.tokensUsados, 0);
    },
  };
}

export function crearCanalSalidaEnviadorFalso(): CanalSalidaEnviador & { envios: ParametrosEnvioCanal[] } {
  const envios: ParametrosEnvioCanal[] = [];
  return {
    envios,
    async enviar(params) {
      envios.push(params);
    },
  };
}

export function crearEscritorArchivosRutinasFalso(
  contenidoInicial: Record<string, string> = {},
): EscritorArchivosRutinas & { archivos: Map<string, string> } {
  const archivos = new Map(Object.entries(contenidoInicial));
  return {
    archivos,
    async listar() {
      return [...archivos.keys()];
    },
    async leer(nombre) {
      return archivos.get(nombre) ?? null;
    },
    async escribir(nombre, contenido) {
      archivos.set(nombre, contenido);
    },
    async eliminar(nombre) {
      archivos.delete(nombre);
    },
  };
}

export function crearClienteMcpFalso(
  herramientas: readonly Record<string, unknown>[] = [],
  respuestas: Record<string, string> = {},
): ClienteMcp & { invocaciones: Array<{ nombre: string; parametros: Record<string, unknown> }>; cerrado: boolean } {
  const invocaciones: Array<{ nombre: string; parametros: Record<string, unknown> }> = [];
  const estado = { cerrado: false };
  return {
    invocaciones,
    get cerrado() {
      return estado.cerrado;
    },
    async listarHerramientas() {
      return herramientas;
    },
    async invocar(nombre, parametros) {
      invocaciones.push({ nombre, parametros });
      return respuestas[nombre] ?? "";
    },
    async cerrar() {
      estado.cerrado = true;
    },
  };
}

export function crearRegistroConectoresActivosFalso(
  conectores: Record<string, ConectorActivo> = {},
): RegistroConectoresActivos {
  return {
    obtener(nombreConector) {
      return conectores[nombreConector];
    },
  };
}
