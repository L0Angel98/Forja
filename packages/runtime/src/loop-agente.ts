import type {
  HerramientaInvocadaTrace,
  MensajeConversacion,
  ProveedorLLM,
  RegistradorTrace,
  Usuario,
} from "@forja/core";
import type { RegistroHerramientas } from "./registro-herramientas";

const MAX_INVOCACIONES_HERRAMIENTA = 6;
const MAX_REINTENTOS_PARAMETROS_INVALIDOS = 1;
const MENSAJE_LIMITE_ALCANZADO =
  "Reuní información con varias herramientas pero no logré armar una respuesta final. Intenta reformular tu pregunta.";
const MENSAJE_PARAMETROS_INVALIDOS =
  "No pude completar la acción porque los parámetros no eran válidos. Intenta reformular tu solicitud.";
const MENSAJE_DEGRADADO =
  "El asistente no está disponible en este momento. Puedes usar el formulario manual mientras tanto.";

export interface DependenciasLoopAgente {
  registro: RegistroHerramientas;
  llm: ProveedorLLM;
  trace: RegistradorTrace;
}

export interface ParametrosTurno {
  usuario: Usuario;
  plantId: string;
  mensaje: string;
  historial: readonly MensajeConversacion[];
  systemPrompt: string;
  traceId: string;
}

export interface ResultadoTurno {
  respuesta: string;
  herramientasInvocadas: readonly HerramientaInvocadaTrace[];
  exitoso: boolean;
}

export async function ejecutarTurno(
  deps: DependenciasLoopAgente,
  params: ParametrosTurno,
): Promise<ResultadoTurno> {
  const inicio = Date.now();
  const herramientasDisponibles = deps.registro.disponiblesPara(params.usuario.rol);
  const herramientasInvocadas: HerramientaInvocadaTrace[] = [];

  let historial = [...params.historial];
  let tokensEntrada = 0;
  let tokensSalida = 0;
  let costoUsd = 0;
  let reintentosParametrosInvalidos = 0;
  let respuesta: string | undefined;
  let exitoso = true;

  try {
    for (let invocacion = 0; invocacion < MAX_INVOCACIONES_HERRAMIENTA; invocacion++) {
      const salidaLlm = await deps.llm.decidir({
        systemPrompt: params.systemPrompt,
        historial,
        mensaje: params.mensaje,
        herramientasDisponibles,
      });
      tokensEntrada += salidaLlm.tokensEntrada;
      tokensSalida += salidaLlm.tokensSalida;
      costoUsd += salidaLlm.costoUsd;

      if (salidaLlm.decision.tipo === "respuesta") {
        respuesta = salidaLlm.decision.texto;
        break;
      }

      const { nombre, parametros } = salidaLlm.decision;
      const herramienta = deps.registro.buscarDisponiblePara(nombre, params.usuario.rol);

      if (!herramienta) {
        herramientasInvocadas.push({ nombre, parametros, exitosa: false });
        historial = agregarMensajeHerramienta(historial, nombre, `Error: la herramienta "${nombre}" no existe o no está permitida para tu rol.`);
        continue;
      }

      const parseo = herramienta.schema.safeParse(parametros);
      if (!parseo.success) {
        herramientasInvocadas.push({ nombre, parametros, exitosa: false });

        if (reintentosParametrosInvalidos >= MAX_REINTENTOS_PARAMETROS_INVALIDOS) {
          respuesta = MENSAJE_PARAMETROS_INVALIDOS;
          break;
        }
        reintentosParametrosInvalidos += 1;
        historial = agregarMensajeHerramienta(historial, nombre, `Parámetros inválidos: ${parseo.error.message}`);
        continue;
      }

      try {
        const resultado = await herramienta.execute(parseo.data, {
          usuario: params.usuario,
          plantId: params.plantId,
          traceId: params.traceId,
        });
        herramientasInvocadas.push({ nombre, parametros: parseo.data, exitosa: true });
        historial = agregarMensajeHerramienta(historial, nombre, JSON.stringify(resultado));
      } catch (error) {
        herramientasInvocadas.push({ nombre, parametros: parseo.data, exitosa: false });
        const mensaje = error instanceof Error ? error.message : "error desconocido";
        historial = agregarMensajeHerramienta(historial, nombre, `Error al ejecutar: ${mensaje}`);
      }
    }

    if (respuesta === undefined) {
      respuesta = MENSAJE_LIMITE_ALCANZADO;
    }
  } catch {
    exitoso = false;
    respuesta = MENSAJE_DEGRADADO;
  }

  await deps.trace.registrarTurno({
    plantId: params.plantId,
    usuarioId: params.usuario.id,
    origen: "chat",
    herramientasInvocadas,
    tokensEntrada,
    tokensSalida,
    costoUsd,
    latenciaMs: Date.now() - inicio,
    exitoso,
  });

  return { respuesta, herramientasInvocadas, exitoso };
}

function agregarMensajeHerramienta(
  historial: MensajeConversacion[],
  nombreHerramienta: string,
  contenido: string,
): MensajeConversacion[] {
  return [...historial, { rol: "herramienta", contenido, nombreHerramienta }];
}
