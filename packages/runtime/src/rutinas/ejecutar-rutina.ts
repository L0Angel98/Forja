import {
  rolBaseDeRutina,
  type EjecucionRutina,
  type EstadoEjecucionRutina,
  type ProveedorLLM,
  type RegistradorTrace,
  type RepositorioEjecucionesRutina,
  type RutinaProgramada,
  type Usuario,
} from "@forja/core";
import { ejecutarTurno } from "../loop-agente";
import { RegistroHerramientas } from "../registro-herramientas";
import type { RegistroCanalesSalida } from "./registro-canales-salida";

/** "Mensual" se aproxima como ventana móvil de 30 días desde `ahora`, no mes calendario: más simple de calcular y de probar. */
const DIAS_VENTANA_PRESUPUESTO_MENSUAL = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface DependenciasEjecutarRutina {
  registro: RegistroHerramientas;
  llm: ProveedorLLM;
  trace: RegistradorTrace;
  ejecuciones: RepositorioEjecucionesRutina;
  canales: RegistroCanalesSalida;
  generarId: () => string;
  presupuestoMensualGlobal: number;
}

export interface ParametrosEjecutarRutina {
  rutina: RutinaProgramada;
  plantId: string;
  systemPrompt: string;
  ahora: Date;
}

/**
 * Orquesta una corrida de rutina: non-overlap, presupuesto mensual global
 * por planta, ejecución con un registry acotado a las herramientas
 * declaradas (siempre de solo lectura por construcción), entrega por canal
 * (Strategy) y persistencia del historial. Vive en runtime (no core) porque
 * necesita ejecutarTurno y RegistroHerramientas, ambos de runtime.
 */
export async function ejecutarRutina(
  deps: DependenciasEjecutarRutina,
  params: ParametrosEjecutarRutina,
): Promise<EjecucionRutina> {
  const { rutina, plantId, ahora } = params;
  const idEjecucion = deps.generarId();

  if (await deps.ejecuciones.hayEnCurso(rutina.nombre)) {
    return persistir(deps, { id: idEjecucion, rutina, plantId, ahora, estado: "omitida", tokensUsados: 0, costoUsd: 0, salida: null, error: null });
  }

  const inicioVentana = new Date(ahora.getTime() - DIAS_VENTANA_PRESUPUESTO_MENSUAL * MS_POR_DIA);
  const tokensDelMes = await deps.ejecuciones.tokensUsadosDesde(plantId, inicioVentana);
  if (tokensDelMes >= deps.presupuestoMensualGlobal) {
    return persistir(deps, { id: idEjecucion, rutina, plantId, ahora, estado: "pausada", tokensUsados: 0, costoUsd: 0, salida: null, error: null });
  }

  const usuarioSintetico: Usuario = {
    id: `rutina:${rutina.nombre}`,
    email: `rutina+${rutina.nombre}@forja.local`,
    passwordHash: "",
    nombre: `Rutina: ${rutina.nombre}`,
    rol: rolBaseDeRutina(rutina.rol),
    activo: true,
  };

  let resultadoTurno;
  try {
    const registroRutina = RegistroHerramientas.desde(deps.registro.disponiblesParaRutina(rutina.herramientas));
    resultadoTurno = await ejecutarTurno(
      { registro: registroRutina, llm: deps.llm, trace: deps.trace },
      {
        usuario: usuarioSintetico,
        plantId,
        mensaje: rutina.prompt,
        historial: [],
        systemPrompt: params.systemPrompt,
        traceId: idEjecucion,
        origen: `rutina/${rutina.nombre}`,
        presupuestoTokens: rutina.presupuestoTokens,
        usuarioId: null,
      },
    );
  } catch (error) {
    return persistir(deps, {
      id: idEjecucion,
      rutina,
      plantId,
      ahora,
      estado: "fallida",
      tokensUsados: 0,
      costoUsd: 0,
      salida: null,
      error: error instanceof Error ? error.message : "error desconocido",
    });
  }

  const estado: EstadoEjecucionRutina = resultadoTurno.excedida
    ? "excedida"
    : resultadoTurno.exitoso
      ? "exitosa"
      : "fallida";

  let errorEntrega: string | null = null;
  if (estado !== "fallida") {
    try {
      await deps.canales.enviar({
        canal: rutina.salida,
        rutinaNombre: rutina.nombre,
        ejecucionId: idEjecucion,
        resultado: resultadoTurno.respuesta,
      });
    } catch (error) {
      errorEntrega = error instanceof Error ? error.message : "error desconocido al entregar por el canal";
    }
  }

  return persistir(deps, {
    id: idEjecucion,
    rutina,
    plantId,
    ahora,
    estado: errorEntrega ? "fallida" : estado,
    tokensUsados: resultadoTurno.tokensEntrada + resultadoTurno.tokensSalida,
    costoUsd: resultadoTurno.costoUsd,
    salida: resultadoTurno.respuesta,
    error: errorEntrega,
  });
}

interface DatosEjecucion {
  id: string;
  rutina: RutinaProgramada;
  plantId: string;
  ahora: Date;
  estado: EstadoEjecucionRutina;
  tokensUsados: number;
  costoUsd: number;
  salida: string | null;
  error: string | null;
}

async function persistir(deps: DependenciasEjecutarRutina, datos: DatosEjecucion): Promise<EjecucionRutina> {
  const ejecucion: EjecucionRutina = {
    id: datos.id,
    rutinaNombre: datos.rutina.nombre,
    plantId: datos.plantId,
    iniciadaEn: datos.ahora,
    finalizadaEn: new Date(),
    estado: datos.estado,
    tokensUsados: datos.tokensUsados,
    costoUsd: datos.costoUsd,
    salida: datos.salida,
    error: datos.error,
  };
  await deps.ejecuciones.crear(ejecucion);
  return ejecucion;
}
