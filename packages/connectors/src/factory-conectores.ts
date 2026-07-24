import {
  construirHerramientaConector,
  validarManifiestoConector,
  ConectorHerramientaDuplicada,
  type ClienteMcp,
  type ConectorActivo,
  type ConectorConfigurado,
  type EstadoConector,
  type Herramienta,
  type RegistroConectoresActivos,
} from "@forja/core";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EnviadorCorreoSmtpNoConfigurado } from "./correo/enviador-correo-no-configurado";
import { EnviadorCorreoSmtp } from "./correo/enviador-correo-smtp";
import type { EnviadorCorreo } from "./correo/enviador-correo";
import { crearServidorCorreoSmtp, NOMBRE_CONECTOR_CORREO_SMTP } from "./correo/servidor-correo-smtp";
import { ClienteGoogleCalendarNoConfigurado } from "./google-calendar/cliente-google-calendar-no-configurado";
import { ClienteGoogleCalendarOAuth } from "./google-calendar/cliente-google-calendar-oauth";
import type { ClienteGoogleCalendarApi } from "./google-calendar/cliente-google-calendar";
import { crearServidorGoogleCalendar, NOMBRE_CONECTOR_GOOGLE_CALENDAR } from "./google-calendar/servidor-google-calendar";
import { CircuitBreakerClienteMcp } from "./mcp/circuit-breaker-cliente-mcp";
import { ClienteMcpSdk } from "./mcp/cliente-mcp-sdk";
import { crearServidorWebhook, NOMBRE_CONECTOR_WEBHOOK } from "./webhook/servidor-webhook";

const VERSION_MANIFIESTO = "1.0.0";

export interface EstadoConectorInfo {
  readonly nombre: string;
  readonly estado: EstadoConector;
  readonly error: string | null;
}

export interface ResultadoFactoryConectores {
  readonly herramientas: readonly Herramienta[];
  readonly estados: readonly EstadoConectorInfo[];
  readonly registro: RegistroConectoresActivos;
  cerrarTodos(): Promise<void>;
}

export type ConstructorServidorConector = (config: ConectorConfigurado) => McpServer;

function leerEnvCredencial(config: ConectorConfigurado, clave: string): string | undefined {
  const nombreVariable = config.credenciales[clave];
  return nombreVariable ? process.env[nombreVariable] : undefined;
}

function construirClienteGoogleCalendar(config: ConectorConfigurado): ClienteGoogleCalendarApi {
  const clientId = leerEnvCredencial(config, "client_id");
  const clientSecret = leerEnvCredencial(config, "client_secret");
  const refreshToken = leerEnvCredencial(config, "refresh_token");
  if (!clientId || !clientSecret || !refreshToken) return new ClienteGoogleCalendarNoConfigurado();
  return new ClienteGoogleCalendarOAuth({ clientId, clientSecret, refreshToken });
}

/** Exportado para que la composición del server pueda reusar la misma resolución de credenciales al armar el canal "correo" de rutinas (spec 16). */
export function construirEnviadorCorreo(config: ConectorConfigurado): EnviadorCorreo {
  const host = leerEnvCredencial(config, "host");
  const user = leerEnvCredencial(config, "user");
  const password = leerEnvCredencial(config, "password");
  const from = leerEnvCredencial(config, "from");
  if (!host || !user || !password || !from) return new EnviadorCorreoSmtpNoConfigurado();
  const port = Number(leerEnvCredencial(config, "port") ?? "587");
  const secure = leerEnvCredencial(config, "secure") === "true";
  return new EnviadorCorreoSmtp({ host, port, secure, user, password, from });
}

/** Conectores integrados de esta spec; el mapa es inyectable para poder extenderlo o probarlo con dobles. */
export const CONSTRUCTORES_CONECTORES_INTEGRADOS: Readonly<Record<string, ConstructorServidorConector>> = {
  [NOMBRE_CONECTOR_GOOGLE_CALENDAR]: (config) => crearServidorGoogleCalendar(construirClienteGoogleCalendar(config)),
  [NOMBRE_CONECTOR_CORREO_SMTP]: (config) => crearServidorCorreoSmtp(construirEnviadorCorreo(config)),
  [NOMBRE_CONECTOR_WEBHOOK]: (config) => crearServidorWebhook(config.listaBlancaUrls),
};

/**
 * Factory (patrón Factory, spec 17): a partir de los conectores activos en
 * conectores.yaml, levanta cada servidor MCP in-process, conecta un
 * cliente real (con circuit breaker) por InMemoryTransport, valida su
 * manifiesto y construye las Herramienta[] listas para el Registry. Un
 * conector caído/desconocido/con manifiesto inválido/con nombre de
 * herramienta duplicado se marca `no_disponible` con el error visible; el
 * resto de conectores no se ve afectado (spec: "el resto del sistema no
 * se afecta").
 */
export async function crearConectores(
  configuraciones: readonly ConectorConfigurado[],
  constructores: Readonly<Record<string, ConstructorServidorConector>> = CONSTRUCTORES_CONECTORES_INTEGRADOS,
): Promise<ResultadoFactoryConectores> {
  const herramientas: Herramienta[] = [];
  const estados: EstadoConectorInfo[] = [];
  const activos = new Map<string, ConectorActivo>();
  const nombresHerramientasVistos = new Set<string>();
  const clientesParaCerrar: ClienteMcp[] = [];

  for (const config of configuraciones.filter((c) => c.activo)) {
    let cliente: ClienteMcp | undefined;
    try {
      const construirServidor = constructores[config.nombre];
      if (!construirServidor) {
        throw new Error(
          `conector desconocido: "${config.nombre}". Conectores disponibles: ${Object.keys(constructores).join(", ")}.`,
        );
      }

      const servidor = construirServidor(config);
      const [transporteCliente, transporteServidor] = InMemoryTransport.createLinkedPair();
      await servidor.connect(transporteServidor);
      const clienteBase = new ClienteMcpSdk(`forja-${config.nombre}`, VERSION_MANIFIESTO, transporteCliente);
      await clienteBase.conectar();
      cliente = new CircuitBreakerClienteMcp(config.nombre, clienteBase);

      const crudo = await cliente.listarHerramientas();
      const manifiesto = validarManifiestoConector(config.nombre, VERSION_MANIFIESTO, crudo);

      const herramientasDelConector: Herramienta[] = [];
      for (const herramientaManifiesto of manifiesto.herramientas) {
        const roles = config.permisos[herramientaManifiesto.nombre];
        if (!roles) continue;
        if (nombresHerramientasVistos.has(herramientaManifiesto.nombre)) {
          throw new ConectorHerramientaDuplicada(herramientaManifiesto.nombre);
        }
        herramientasDelConector.push(
          construirHerramientaConector(config.nombre, herramientaManifiesto, roles, {
            invocar: (nombre, parametros) => (cliente as ClienteMcp).invocar(nombre, parametros),
          }),
        );
      }

      for (const herramienta of herramientasDelConector) nombresHerramientasVistos.add(herramienta.nombre);
      herramientas.push(...herramientasDelConector);
      activos.set(config.nombre, { manifiesto, permisos: config.permisos, cliente });
      clientesParaCerrar.push(cliente);
      estados.push({ nombre: config.nombre, estado: "disponible", error: null });
    } catch (error) {
      if (cliente) await cliente.cerrar().catch(() => {});
      estados.push({
        nombre: config.nombre,
        estado: "no_disponible",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    herramientas,
    estados,
    registro: { obtener: (nombre) => activos.get(nombre) },
    async cerrarTodos() {
      for (const cliente of clientesParaCerrar) await cliente.cerrar().catch(() => {});
    },
  };
}
