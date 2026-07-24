/**
 * Eval de la herramienta consultar_sensores: 12 preguntas de sensores en
 * español donde un operador razonable esperaría una agregación y un rango
 * concretos, más 3 preguntas que piden escritura o datos crudos masivos
 * (algo que la herramienta no soporta por diseño). Pasa si el LLM acierta
 * máquina + agregación + rango en ≥10/12, y rechaza (no invoca ninguna
 * herramienta) en las 3/3 preguntas de escritura/crudo.
 *
 * El rango se verifica por duración en días (con tolerancia), no por fechas
 * exactas: la fecha "hoy" se fija en el system prompt para que el cálculo
 * del LLM sea determinista, pero seguirá variando ligeramente entre
 * corridas (p. ej. si interpreta "hoy" como el día completo o desde ahora).
 * Un caso ("últimamente") verifica explícitamente la regla del spec de
 * asumir 7 días ante un rango ambiguo.
 *
 * Requiere ANTHROPIC_API_KEY (no está configurada en CI ni en este sandbox
 * de desarrollo): sin ella, el script termina con código 0 e informa que se
 * omitió, en vez de fallar el build por falta de credenciales.
 *
 * Uso: pnpm --filter @forja/server eval:sensores
 */
import {
  crearRegistradorTraceFalso,
  crearRepositorioAgregacionesSensoresFalso,
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioCatalogoSensoresFalso,
  crearRepositorioMaquinasFalso,
  type Maquina,
  type SensorCatalogo,
  type TipoAgregacion,
  type Usuario,
} from "@forja/core";
import { VercelAiProveedorLLM } from "@forja/llm";
import { ejecutarTurno, RegistroHerramientas } from "@forja/runtime";
import { crearHerramientaConsultarSensores } from "@forja/tools";
import { anthropic } from "@ai-sdk/anthropic";

const UMBRAL_MINIMO_CON_RESPUESTA = 10;
const TOTAL_CON_RESPUESTA = 12;
const TOTAL_RECHAZO = 3;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

const HOY = "sábado 24 de julio de 2026, 12:00 UTC";

const MAQUINAS: Maquina[] = [
  { id: "maquina-horno-3", areaId: "area-hornos", nombre: "Horno 3" },
  { id: "maquina-prensa-1", areaId: "area-ensamble", nombre: "Prensa 1" },
  { id: "maquina-torno-cnc-1", areaId: "area-maquinado", nombre: "Torno CNC 1" },
  { id: "maquina-linea-2", areaId: "area-ensamble", nombre: "Línea 2" },
];

const SENSORES: SensorCatalogo[] = [
  {
    id: "sensor-horno-3-temp",
    externalId: "horno-3-temp",
    machineId: "maquina-horno-3",
    nombre: "Temperatura",
    unidad: "C",
    rangoMin: 0,
    rangoMax: 800,
    mudoTrasMinutos: 30,
  },
  {
    id: "sensor-prensa-1-temp",
    externalId: "prensa-1-temp",
    machineId: "maquina-prensa-1",
    nombre: "Temperatura",
    unidad: "C",
    rangoMin: 0,
    rangoMax: 200,
    mudoTrasMinutos: 30,
  },
  {
    id: "sensor-torno-vib",
    externalId: "torno-cnc-1-vib",
    machineId: "maquina-torno-cnc-1",
    nombre: "Vibración",
    unidad: "mm/s",
    rangoMin: 0,
    rangoMax: 25,
    mudoTrasMinutos: 30,
  },
  {
    id: "sensor-linea-2-presion",
    externalId: "linea-2-presion",
    machineId: "maquina-linea-2",
    nombre: "Presión",
    unidad: "bar",
    rangoMin: 0,
    rangoMax: 10,
    mudoTrasMinutos: 30,
  },
];

interface CasoConRespuesta {
  pregunta: string;
  maquinaIdEsperada: string;
  agregacionEsperada: TipoAgregacion;
  /** [días mínimos, días máximos] de tolerancia para hasta-desde; null = no se verifica el rango. */
  rangoDiasEsperado: [number, number] | null;
}

const CASOS_CON_RESPUESTA: CasoConRespuesta[] = [
  {
    pregunta: "¿Cómo estuvo la temperatura promedio del Horno 3 esta semana?",
    maquinaIdEsperada: "maquina-horno-3",
    agregacionEsperada: "avg",
    rangoDiasEsperado: [4, 10],
  },
  {
    pregunta: "¿Cuál fue la temperatura máxima que alcanzó la Prensa 1 hoy?",
    maquinaIdEsperada: "maquina-prensa-1",
    agregacionEsperada: "max",
    rangoDiasEsperado: [0, 2],
  },
  {
    pregunta: "¿Cuál fue la vibración mínima del Torno CNC 1 en las últimas 24 horas?",
    maquinaIdEsperada: "maquina-torno-cnc-1",
    agregacionEsperada: "min",
    rangoDiasEsperado: [0, 2],
  },
  {
    pregunta: "¿Cuántas lecturas tuvo el sensor de presión de la Línea 2 en la última hora?",
    maquinaIdEsperada: "maquina-linea-2",
    agregacionEsperada: "count",
    rangoDiasEsperado: [0, 1],
  },
  {
    pregunta: "¿Cuál es el último valor de temperatura del Horno 3?",
    maquinaIdEsperada: "maquina-horno-3",
    agregacionEsperada: "last",
    rangoDiasEsperado: null,
  },
  {
    pregunta: "¿Cómo estuvo la vibración del Torno CNC 1 la semana pasada, en promedio?",
    maquinaIdEsperada: "maquina-torno-cnc-1",
    agregacionEsperada: "avg",
    rangoDiasEsperado: [4, 10],
  },
  {
    pregunta: "¿Cuál fue la presión máxima de la Línea 2 este mes?",
    maquinaIdEsperada: "maquina-linea-2",
    agregacionEsperada: "max",
    rangoDiasEsperado: [15, 40],
  },
  {
    pregunta: "¿Cuál ha sido la temperatura promedio de la Prensa 1 en el último mes?",
    maquinaIdEsperada: "maquina-prensa-1",
    agregacionEsperada: "avg",
    rangoDiasEsperado: [15, 40],
  },
  {
    pregunta: "¿Cuál fue la temperatura mínima del Horno 3 en las últimas 24 horas?",
    maquinaIdEsperada: "maquina-horno-3",
    agregacionEsperada: "min",
    rangoDiasEsperado: [0, 2],
  },
  {
    pregunta: "¿Cuántas lecturas de vibración tuvo el Torno CNC 1 hoy?",
    maquinaIdEsperada: "maquina-torno-cnc-1",
    agregacionEsperada: "count",
    rangoDiasEsperado: [0, 2],
  },
  {
    pregunta: "¿Cómo ha estado la temperatura del Horno 3 últimamente?",
    maquinaIdEsperada: "maquina-horno-3",
    agregacionEsperada: "avg",
    rangoDiasEsperado: [4, 10],
  },
  {
    pregunta: "¿Cuál es la última lectura de presión de la Línea 2?",
    maquinaIdEsperada: "maquina-linea-2",
    agregacionEsperada: "last",
    rangoDiasEsperado: null,
  },
];

const PREGUNTAS_RECHAZO: string[] = [
  "Necesito el archivo CSV con todas las lecturas crudas de temperatura del Horno 3 del último año.",
  "Cambia el rango de operación normal del sensor de vibración del Torno CNC 1 a 0-50 mm/s.",
  "Elimina las lecturas fuera de rango de la última semana de la Línea 2.",
];

const ADMIN: Usuario = {
  id: "usuario-eval-admin",
  email: "eval@planta.mx",
  passwordHash: "hash:x",
  nombre: "Eval Admin",
  rol: "admin",
  activo: true,
};

const SYSTEM_PROMPT =
  `Eres Forja, el copiloto de una planta manufacturera. Hoy es ${HOY}. Cuando un usuario pregunte por el ` +
  "comportamiento histórico de un sensor, usa la herramienta consultar_sensores con la agregación (min|max|avg|" +
  "count|last), el bucket (5m|1h|1d) y el rango de fechas que mejor respondan la pregunta. Si el rango es " +
  "ambiguo (p. ej. 'últimamente'), asume 7 días y dilo explícitamente en tu respuesta. La herramienta solo " +
  "sirve para series agregadas: si te piden datos crudos masivos, exportar un archivo, o cambiar/borrar " +
  "configuración de un sensor, explica que no puedes hacerlo, no inventes una respuesta ni llames la herramienta.";

function diferenciaEnDias(desde: string, hasta: string): number {
  return (new Date(hasta).getTime() - new Date(desde).getTime()) / MS_POR_DIA;
}

async function main(): Promise<void> {
  if (!process.env["ANTHROPIC_API_KEY"]) {
    console.log("ANTHROPIC_API_KEY no está configurada: se omite el eval de consultar_sensores (no es un fallo).");
    return;
  }

  const maquinas = crearRepositorioMaquinasFalso(MAQUINAS);
  const areasUsuario = crearRepositorioAreasUsuarioFalso();
  const catalogo = crearRepositorioCatalogoSensoresFalso(SENSORES);
  const agregaciones = crearRepositorioAgregacionesSensoresFalso();

  const registro = new RegistroHerramientas();
  registro.registrar(crearHerramientaConsultarSensores({ maquinas, areasUsuario, catalogo, agregaciones }));

  const llm = new VercelAiProveedorLLM(anthropic(process.env["ANTHROPIC_MODEL"] ?? "claude-3-5-sonnet-latest"));
  const trace = crearRegistradorTraceFalso();

  let aciertosConRespuesta = 0;

  for (const [indice, caso] of CASOS_CON_RESPUESTA.entries()) {
    const resultado = await ejecutarTurno(
      { registro, llm, trace },
      {
        usuario: ADMIN,
        plantId: "planta-eval",
        mensaje: caso.pregunta,
        historial: [],
        systemPrompt: SYSTEM_PROMPT,
        traceId: `eval-sensores-${indice}`,
      },
    );

    const invocacion = resultado.herramientasInvocadas.find((h) => h.nombre === "consultar_sensores");
    const parametros = invocacion?.parametros as
      | { maquinaId?: string; agregacion?: string; desde?: string; hasta?: string }
      | undefined;

    const maquinaCorrecta = parametros?.maquinaId === caso.maquinaIdEsperada;
    const agregacionCorrecta = parametros?.agregacion === caso.agregacionEsperada;
    const rangoCorrecto =
      caso.rangoDiasEsperado === null ||
      (parametros?.desde !== undefined &&
        parametros.hasta !== undefined &&
        (() => {
          const dias = diferenciaEnDias(parametros.desde!, parametros.hasta!);
          return dias >= caso.rangoDiasEsperado![0] && dias <= caso.rangoDiasEsperado![1];
        })());

    const acierto = maquinaCorrecta && agregacionCorrecta && rangoCorrecto;
    if (acierto) aciertosConRespuesta += 1;

    console.log(
      `${acierto ? "✓" : "✗"} [${indice + 1}/${TOTAL_CON_RESPUESTA}] "${caso.pregunta}"\n` +
        `   esperado: ${caso.maquinaIdEsperada} / ${caso.agregacionEsperada} / rango ${caso.rangoDiasEsperado ?? "(no verificado)"} días\n` +
        `   obtenido: ${parametros?.maquinaId ?? "(sin invocación)"} / ${parametros?.agregacion ?? "-"} / ` +
        `${parametros?.desde ?? "?"} → ${parametros?.hasta ?? "?"}`,
    );
  }

  let aciertosRechazo = 0;

  for (const [indice, pregunta] of PREGUNTAS_RECHAZO.entries()) {
    const resultado = await ejecutarTurno(
      { registro, llm, trace },
      {
        usuario: ADMIN,
        plantId: "planta-eval",
        mensaje: pregunta,
        historial: [],
        systemPrompt: SYSTEM_PROMPT,
        traceId: `eval-sensores-rechazo-${indice}`,
      },
    );

    const acierto = resultado.herramientasInvocadas.length === 0;
    if (acierto) aciertosRechazo += 1;

    console.log(`${acierto ? "✓" : "✗"} [rechazo ${indice + 1}/${TOTAL_RECHAZO}] "${pregunta}"`);
  }

  console.log(
    `\nCon respuesta: ${aciertosConRespuesta}/${TOTAL_CON_RESPUESTA} (umbral: ${UMBRAL_MINIMO_CON_RESPUESTA})\n` +
      `Rechazo correcto: ${aciertosRechazo}/${TOTAL_RECHAZO} (umbral: ${TOTAL_RECHAZO})`,
  );

  if (aciertosConRespuesta < UMBRAL_MINIMO_CON_RESPUESTA || aciertosRechazo < TOTAL_RECHAZO) {
    console.error("Eval por debajo del umbral mínimo.");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Error al correr el eval:", error);
  process.exit(1);
});
