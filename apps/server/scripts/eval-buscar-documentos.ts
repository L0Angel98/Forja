/**
 * Eval de retrieval RAG (herramienta buscar_documentos): 20 preguntas con
 * respuesta conocida sobre un corpus seed de 5 manuales (pasa si ≥17 traen
 * una cita del documento correcto) + 5 preguntas sin respuesta en el corpus
 * (pasa si ≥5 el retrieval reconoce que no hay nada, encontrado=false).
 *
 * A diferencia del eval de crear_reporte_falla (spec 13), este NO pasa por
 * el LLM/ejecutarTurno: `HerramientaInvocadaTrace` solo registra los
 * parámetros con los que se invocó una herramienta, no su valor de
 * retorno, así que no hay forma de inspeccionar qué citas trajo
 * buscar_documentos a través del loop del agente. Lo que la spec pide
 * evaluar ("cita correcta") es una propiedad del pipeline de retrieval
 * (chunking + embeddings + similitud), no de la elección del LLM — así que
 * el eval invoca la herramienta directamente con la pregunta como consulta.
 * Solo requiere OPENAI_API_KEY (embeddings reales), no ANTHROPIC_API_KEY.
 *
 * Uso: pnpm --filter @forja/server eval:documentos
 */
import {
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioChunksFalso,
  crearRepositorioDocumentosFalso,
  type Documento,
  type Usuario,
} from "@forja/core";
import { VercelAiGeneradorEmbeddings } from "@forja/llm";
import { PorEncabezados } from "@forja/rag";
import { crearHerramientaBuscarDocumentos } from "@forja/tools";
import { openai } from "@ai-sdk/openai";

const UMBRAL_CON_RESPUESTA = 17;
const UMBRAL_SIN_RESPUESTA = 5;
const DIMENSION_EMBEDDING = 1536;

const ADMIN: Usuario = {
  id: "usuario-eval-admin",
  email: "eval@planta.mx",
  passwordHash: "hash:x",
  nombre: "Eval Admin",
  rol: "admin",
  activo: true,
};

interface DocumentoFixture {
  clave: string;
  nombre: string;
  markdown: string;
}

const DOCUMENTOS: DocumentoFixture[] = [
  {
    clave: "linea-1",
    nombre: "Manual de la Línea 1.md",
    markdown: `# Manual de la Línea 1

## Arranque
Para arrancar la Línea 1, primero verifica que el botón de paro de emergencia esté liberado, luego presiona el botón verde de encendido durante 2 segundos.

## Mantenimiento semanal
Cada semana se debe lubricar la cadena transportadora con aceite ISO 68 y revisar la tensión de las bandas.

## Código de error E12
El código de error E12 indica un sensor de posición desalineado; reinicia el PLC y recalibra el sensor desde el panel de control.`,
  },
  {
    clave: "torno-cnc-1",
    nombre: "SOP Torno CNC 1.md",
    markdown: `# SOP Torno CNC 1

## Cambio de herramienta
Para cambiar la herramienta de corte del Torno CNC 1, coloca la máquina en modo manual, retira el portaherramientas con la llave Allen de 6mm y sustituye el inserto.

## Calibración
La calibración del cero pieza se hace tocando la superficie con el palpador y confirmando en la pantalla HMI.

## Refrigerante
El refrigerante debe reemplazarse cada 3 meses o antes si su color cambia a café oscuro.`,
  },
  {
    clave: "seguridad",
    nombre: "Procedimiento de seguridad general.md",
    markdown: `# Procedimiento de seguridad general

## Equipo de protección personal
Todo el personal debe usar lentes de seguridad, casco y calzado con punta de acero dentro del área de producción.

## Bloqueo y etiquetado
Antes de dar mantenimiento a cualquier máquina, se debe aplicar el procedimiento de bloqueo y etiquetado (LOTO): desconectar la energía, colocar el candado personal y verificar cero energía.

## Reporte de incidentes
Cualquier incidente, por menor que sea, debe reportarse al supervisor de turno dentro de la primera hora.`,
  },
  {
    clave: "robot-soldador",
    nombre: "Manual del Robot Soldador.md",
    markdown: `# Manual del Robot Soldador

## Programación de puntos
Los puntos de soldadura se programan moviendo el brazo manualmente con el teach pendant y guardando cada posición con el botón "Record".

## Gas de protección
El robot soldador usa una mezcla de gas argón-CO2 al 80/20; el flujo recomendado es de 15 litros por minuto.

## Mantenimiento de la punta
La punta de contacto debe revisarse cada turno y reemplazarse si muestra desgaste o deformación.`,
  },
  {
    clave: "fresadora-1",
    nombre: "Manual de la Fresadora 1.md",
    markdown: `# Manual de la Fresadora 1

## Sujeción de la pieza
La pieza debe sujetarse con la prensa hidráulica aplicando al menos 500 PSI antes de iniciar el maquinado.

## Velocidades recomendadas
Para aluminio se recomienda 3000 RPM; para acero, 800 RPM con refrigerante activo.

## Alarma de sobrecarga
La alarma de sobrecarga del husillo se limpia reduciendo la velocidad de avance y verificando que la herramienta no esté desafilada.`,
  },
];

interface CasoConRespuesta {
  pregunta: string;
  documentoEsperado: string;
}

const CASOS_CON_RESPUESTA: CasoConRespuesta[] = [
  { pregunta: "¿Cómo arranco la Línea 1?", documentoEsperado: "linea-1" },
  { pregunta: "¿Cada cuánto debo lubricar la cadena transportadora de la Línea 1?", documentoEsperado: "linea-1" },
  { pregunta: "¿Qué significa el código de error E12 en la Línea 1?", documentoEsperado: "linea-1" },
  { pregunta: "Además de lubricar, ¿qué debo revisar en el mantenimiento semanal de la Línea 1?", documentoEsperado: "linea-1" },
  { pregunta: "¿Cómo cambio la herramienta de corte del Torno CNC 1?", documentoEsperado: "torno-cnc-1" },
  { pregunta: "¿Cómo se calibra el cero pieza del Torno CNC 1?", documentoEsperado: "torno-cnc-1" },
  { pregunta: "¿Cada cuánto debo cambiar el refrigerante del Torno CNC 1?", documentoEsperado: "torno-cnc-1" },
  { pregunta: "¿Qué llave necesito para retirar el portaherramientas del Torno CNC 1?", documentoEsperado: "torno-cnc-1" },
  { pregunta: "¿Qué equipo de protección personal debo usar en el área de producción?", documentoEsperado: "seguridad" },
  { pregunta: "¿Qué es el procedimiento de bloqueo y etiquetado?", documentoEsperado: "seguridad" },
  { pregunta: "¿En cuánto tiempo debo reportar un incidente?", documentoEsperado: "seguridad" },
  { pregunta: "¿Qué debo hacer antes de dar mantenimiento a una máquina?", documentoEsperado: "seguridad" },
  { pregunta: "¿Cómo se programan los puntos de soldadura del robot soldador?", documentoEsperado: "robot-soldador" },
  { pregunta: "¿Qué mezcla de gas usa el robot soldador?", documentoEsperado: "robot-soldador" },
  { pregunta: "¿Cada cuánto debo revisar la punta de contacto del robot soldador?", documentoEsperado: "robot-soldador" },
  { pregunta: "¿Cuál es el flujo de gas recomendado para el robot soldador?", documentoEsperado: "robot-soldador" },
  { pregunta: "¿Con cuánta presión debo sujetar la pieza en la Fresadora 1?", documentoEsperado: "fresadora-1" },
  { pregunta: "¿Qué velocidad de husillo recomiendan para maquinar acero en la Fresadora 1?", documentoEsperado: "fresadora-1" },
  { pregunta: "¿Cómo limpio la alarma de sobrecarga del husillo de la Fresadora 1?", documentoEsperado: "fresadora-1" },
  { pregunta: "¿Qué velocidad recomiendan para maquinar aluminio en la Fresadora 1?", documentoEsperado: "fresadora-1" },
];

const PREGUNTAS_SIN_RESPUESTA: string[] = [
  "¿Cuál es el procedimiento para calibrar la balanza industrial de recepción de materia prima?",
  "¿Cómo configuro el sistema de facturación electrónica de la planta?",
  "¿Cuál es el protocolo para evacuar el edificio en caso de sismo?",
  "¿Qué antivirus está instalado en las computadoras de la oficina de RRHH?",
  "¿Cuál es la política de vacaciones para operadores de nuevo ingreso?",
];

async function main(): Promise<void> {
  if (!process.env["OPENAI_API_KEY"]) {
    console.log("OPENAI_API_KEY no está configurada: se omite el eval de buscar_documentos (no es un fallo).");
    return;
  }

  const modeloEmbeddings = process.env["OPENAI_EMBEDDING_MODEL"] ?? "text-embedding-3-small";
  const embeddings = new VercelAiGeneradorEmbeddings(openai.textEmbeddingModel(modeloEmbeddings), DIMENSION_EMBEDDING);

  const documentosPorClave = new Map<string, Documento>();
  const documentos: Documento[] = DOCUMENTOS.map((fixture, indice) => {
    const documento: Documento = {
      id: `documento-eval-${indice}`,
      nombre: fixture.nombre,
      tipoArchivo: "md",
      rutaAlmacenada: "",
      tamanoBytes: fixture.markdown.length,
      asociaciones: { maquinaIds: [], areaIds: [], familiaIds: [] },
      version: 1,
      documentoAnteriorId: null,
      vigente: true,
      estadoIndexacion: "indexado",
      subidoPor: ADMIN.id,
      creadoEn: new Date(),
    };
    documentosPorClave.set(fixture.clave, documento);
    return documento;
  });

  const documentosRepo = crearRepositorioDocumentosFalso(documentos);
  const chunksRepo = crearRepositorioChunksFalso(documentosRepo.documentos);

  const estrategia = new PorEncabezados();
  let contadorChunk = 0;
  for (const fixture of DOCUMENTOS) {
    const documento = documentosPorClave.get(fixture.clave)!;
    const troceados = estrategia.trocear({ texto: fixture.markdown, totalPaginas: null, paginas: null });
    const vectores = await embeddings.generar(troceados.map((t) => t.contenido));

    for (const [indice, troceado] of troceados.entries()) {
      chunksRepo.chunks.push({
        id: `chunk-eval-${(contadorChunk += 1)}`,
        documentoId: documento.id,
        indice,
        contenido: troceado.contenido,
        seccion: troceado.seccion,
        pagina: troceado.pagina,
        embedding: vectores[indice] ?? [],
        vigente: true,
      });
    }
  }

  const herramienta = crearHerramientaBuscarDocumentos({
    embeddings,
    chunks: chunksRepo,
    areasUsuario: crearRepositorioAreasUsuarioFalso(),
  });

  let aciertosConRespuesta = 0;
  for (const [indice, caso] of CASOS_CON_RESPUESTA.entries()) {
    const resultado = await herramienta.execute(
      { consulta: caso.pregunta },
      { usuario: ADMIN, plantId: "planta-eval", traceId: `eval-con-respuesta-${indice}` },
    );
    const esperado = documentosPorClave.get(caso.documentoEsperado)!;
    const acierto = resultado.encontrado && resultado.citas.some((cita) => cita.documentoId === esperado.id);
    if (acierto) aciertosConRespuesta += 1;
    console.log(`${acierto ? "✓" : "✗"} [${indice + 1}/${CASOS_CON_RESPUESTA.length}] "${caso.pregunta}"`);
  }

  let aciertosSinRespuesta = 0;
  for (const [indice, pregunta] of PREGUNTAS_SIN_RESPUESTA.entries()) {
    const resultado = await herramienta.execute(
      { consulta: pregunta },
      { usuario: ADMIN, plantId: "planta-eval", traceId: `eval-sin-respuesta-${indice}` },
    );
    const acierto = !resultado.encontrado;
    if (acierto) aciertosSinRespuesta += 1;
    console.log(`${acierto ? "✓" : "✗"} [sin respuesta ${indice + 1}/${PREGUNTAS_SIN_RESPUESTA.length}] "${pregunta}"`);
  }

  console.log(
    `\nCon respuesta: ${aciertosConRespuesta}/${CASOS_CON_RESPUESTA.length} (umbral: ${UMBRAL_CON_RESPUESTA})\n` +
      `Sin respuesta reconocida: ${aciertosSinRespuesta}/${PREGUNTAS_SIN_RESPUESTA.length} (umbral: ${UMBRAL_SIN_RESPUESTA})`,
  );

  if (aciertosConRespuesta < UMBRAL_CON_RESPUESTA || aciertosSinRespuesta < UMBRAL_SIN_RESPUESTA) {
    console.error("Eval por debajo del umbral mínimo.");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Error al correr el eval:", error);
  process.exit(1);
});
