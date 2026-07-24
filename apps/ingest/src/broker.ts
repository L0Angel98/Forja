import { createServer, type Server } from "node:net";
import { Aedes, type AuthenticateError } from "aedes";
import type { Flusher } from "./flusher";
import type { ProcesadorMensajesMqtt } from "./procesador-mensajes";

const BAD_USERNAME_OR_PASSWORD = 4 as AuthenticateError["returnCode"];

export interface ConfiguracionBroker {
  readonly puerto: number;
  readonly flushMaxLecturas: number;
  /** null = autenticación deshabilitada (dev/local). */
  readonly credenciales: ReadonlyMap<string, string> | null;
}

export interface BrokerMqtt {
  readonly aedes: Aedes;
  readonly servidor: Server;
  cerrar(): Promise<void>;
}

export async function iniciarBrokerMqtt(
  config: ConfiguracionBroker,
  procesador: ProcesadorMensajesMqtt,
  flusher: Flusher,
  tamanoBufferLecturas: () => number,
  logger: Pick<Console, "error"> = console,
): Promise<BrokerMqtt> {
  const aedes = await Aedes.createBroker();

  if (config.credenciales) {
    const credenciales = config.credenciales;
    aedes.authenticate = (_client, username, password, done) => {
      const esperado = username ? credenciales.get(username) : undefined;
      const autorizado = esperado !== undefined && password?.toString("utf8") === esperado;
      if (autorizado) {
        done(null, true);
        return;
      }
      const error = Object.assign(new Error("Credenciales inválidas"), {
        returnCode: BAD_USERNAME_OR_PASSWORD,
      });
      done(error, false);
    };
  }

  aedes.on("publish", (packet, client) => {
    if (!client) return; // mensajes internos ($SYS, heartbeat, etc.)

    const payload = Buffer.isBuffer(packet.payload) ? packet.payload.toString("utf8") : String(packet.payload);
    procesador.procesar(packet.topic, payload);

    if (tamanoBufferLecturas() >= config.flushMaxLecturas) {
      flusher.flush().catch((error: unknown) => {
        logger.error("ingest: fallo al volcar lecturas tras alcanzar el umbral de flush inmediato", error);
      });
    }
  });

  const servidor = createServer(aedes.handle);
  await new Promise<void>((resolve) => servidor.listen(config.puerto, resolve));

  return {
    aedes,
    servidor,
    async cerrar() {
      await new Promise<void>((resolve) => servidor.close(() => resolve()));
      await new Promise<void>((resolve) => aedes.close(() => resolve()));
    },
  };
}
