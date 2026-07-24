/**
 * Eval de la herramienta crear_reporte_falla: 15 descripciones de falla en
 * español, cada una con la máquina y el síntoma de la taxonomía cerrada que
 * un operador razonable esperaría. Passa si el LLM invoca crear_reporte_falla
 * con machineId y sintomaTaxonomia correctos en al menos 13/15 casos.
 *
 * Requiere ANTHROPIC_API_KEY (no está configurada en CI ni en este sandbox
 * de desarrollo): sin ella, el script termina con código 0 e informa que se
 * omitió, en vez de fallar el build por falta de credenciales.
 *
 * Uso: pnpm --filter @forja/server eval:fallas
 */
import {
  crearRegistradorTraceFalso,
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioMaquinasFalso,
  type Maquina,
  type SintomaTaxonomia,
  type Usuario,
} from "@forja/core";
import { VercelAiProveedorLLM } from "@forja/llm";
import { ejecutarTurno, RegistroHerramientas } from "@forja/runtime";
import { crearHerramientaCrearReporteFalla } from "@forja/tools";
import { anthropic } from "@ai-sdk/anthropic";

const UMBRAL_MINIMO = 13;
const TOTAL_CASOS = 15;

const MAQUINAS: Maquina[] = [
  { id: "maquina-linea-1", areaId: "area-ensamble", nombre: "Línea 1" },
  { id: "maquina-linea-2", areaId: "area-ensamble", nombre: "Línea 2" },
  { id: "maquina-robot-soldador", areaId: "area-ensamble", nombre: "Robot soldador" },
  { id: "maquina-torno-cnc-1", areaId: "area-maquinado", nombre: "Torno CNC 1" },
  { id: "maquina-fresadora-1", areaId: "area-maquinado", nombre: "Fresadora 1" },
];

interface CasoEval {
  descripcion: string;
  machineIdEsperado: string;
  sintomaEsperado: SintomaTaxonomia;
}

const CASOS: CasoEval[] = [
  { descripcion: "La Línea 1 está haciendo un ruido raro, como un chirrido metálico constante.", machineIdEsperado: "maquina-linea-1", sintomaEsperado: "ruido_anormal" },
  { descripcion: "El Torno CNC 1 vibra muchísimo más de lo normal desde esta mañana.", machineIdEsperado: "maquina-torno-cnc-1", sintomaEsperado: "vibracion_excesiva" },
  { descripcion: "Hay una fuga de aceite debajo de la Fresadora 1, se está formando un charco.", machineIdEsperado: "maquina-fresadora-1", sintomaEsperado: "fuga" },
  { descripcion: "El motor del Robot soldador está muy caliente, casi no se puede tocar la carcasa.", machineIdEsperado: "maquina-robot-soldador", sintomaEsperado: "sobrecalentamiento" },
  { descripcion: "La Línea 2 no enciende, le doy al botón de arranque y no pasa nada.", machineIdEsperado: "maquina-linea-2", sintomaEsperado: "no_enciende" },
  { descripcion: "El Torno CNC 1 se detuvo por completo a media operación, fue un paro total.", machineIdEsperado: "maquina-torno-cnc-1", sintomaEsperado: "paro_total" },
  { descripcion: "El sensor de temperatura de la Fresadora 1 está marcando un valor imposible, creo que está fallando.", machineIdEsperado: "maquina-fresadora-1", sintomaEsperado: "error_sensor" },
  { descripcion: "La Línea 1 vibra bastante más fuerte que ayer, se siente en el piso.", machineIdEsperado: "maquina-linea-1", sintomaEsperado: "vibracion_excesiva" },
  { descripcion: "Escucho un golpeteo anormal en el Robot soldador cada vez que gira el brazo.", machineIdEsperado: "maquina-robot-soldador", sintomaEsperado: "ruido_anormal" },
  { descripcion: "Está goteando refrigerante de la Línea 2 desde hace una hora.", machineIdEsperado: "maquina-linea-2", sintomaEsperado: "fuga" },
  { descripcion: "El Torno CNC 1 se recalienta después de 20 minutos de uso continuo.", machineIdEsperado: "maquina-torno-cnc-1", sintomaEsperado: "sobrecalentamiento" },
  { descripcion: "La Fresadora 1 quedó completamente muerta, no responde a nada, se paró todo.", machineIdEsperado: "maquina-fresadora-1", sintomaEsperado: "paro_total" },
  { descripcion: "No logro prender el Robot soldador, el interruptor no hace absolutamente nada.", machineIdEsperado: "maquina-robot-soldador", sintomaEsperado: "no_enciende" },
  { descripcion: "El sensor de vibración de la Línea 1 está dando lecturas erráticas y sin sentido.", machineIdEsperado: "maquina-linea-1", sintomaEsperado: "error_sensor" },
  { descripcion: "La Línea 2 hace un chillido agudo y constante que no había antes.", machineIdEsperado: "maquina-linea-2", sintomaEsperado: "ruido_anormal" },
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
  "Eres Forja, el copiloto de una planta manufacturera. Cuando un usuario describe una falla en una máquina, " +
  "usa la herramienta crear_reporte_falla para armar un borrador: identifica la máquina mencionada y el síntoma " +
  "de la taxonomía cerrada que mejor describe el problema.";

async function main(): Promise<void> {
  if (!process.env["ANTHROPIC_API_KEY"]) {
    console.log("ANTHROPIC_API_KEY no está configurada: se omite el eval de crear_reporte_falla (no es un fallo).");
    return;
  }

  const maquinas = crearRepositorioMaquinasFalso(MAQUINAS);
  const areasUsuario = crearRepositorioAreasUsuarioFalso();
  const registro = new RegistroHerramientas();
  registro.registrar(crearHerramientaCrearReporteFalla({ maquinas, areasUsuario }));

  const llm = new VercelAiProveedorLLM(anthropic(process.env["ANTHROPIC_MODEL"] ?? "claude-3-5-sonnet-latest"));
  const trace = crearRegistradorTraceFalso();

  let aciertos = 0;

  for (const [indice, caso] of CASOS.entries()) {
    const resultado = await ejecutarTurno(
      { registro, llm, trace },
      {
        usuario: ADMIN,
        plantId: "planta-eval",
        mensaje: caso.descripcion,
        historial: [],
        systemPrompt: SYSTEM_PROMPT,
        traceId: `eval-${indice}`,
      },
    );

    const invocacion = resultado.herramientasInvocadas.find((h) => h.nombre === "crear_reporte_falla");
    const parametros = invocacion?.parametros as { machineId?: string; sintomaTaxonomia?: string } | undefined;
    const acierto =
      parametros?.machineId === caso.machineIdEsperado && parametros.sintomaTaxonomia === caso.sintomaEsperado;

    if (acierto) aciertos += 1;

    console.log(
      `${acierto ? "✓" : "✗"} [${indice + 1}/${TOTAL_CASOS}] "${caso.descripcion}"\n` +
        `   esperado: ${caso.machineIdEsperado} / ${caso.sintomaEsperado}\n` +
        `   obtenido: ${parametros?.machineId ?? "(sin invocación)"} / ${parametros?.sintomaTaxonomia ?? "-"}`,
    );
  }

  console.log(`\nResultado: ${aciertos}/${TOTAL_CASOS} (umbral mínimo: ${UMBRAL_MINIMO}/${TOTAL_CASOS})`);

  if (aciertos < UMBRAL_MINIMO) {
    console.error("Eval por debajo del umbral mínimo.");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Error al correr el eval:", error);
  process.exit(1);
});
