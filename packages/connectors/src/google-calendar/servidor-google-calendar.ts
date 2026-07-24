import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ClienteGoogleCalendarApi } from "./cliente-google-calendar";

export const NOMBRE_CONECTOR_GOOGLE_CALENDAR = "google-calendar";

/**
 * Servidor MCP in-process (spec 17: "un conector = un servidor MCP, proceso
 * propio o in-process"). Los handlers dejan que los errores de `cliente`
 * (p. ej. ClienteGoogleCalendarNoConfigurado) suban tal cual: el SDK los
 * convierte automáticamente en `{ isError: true }`, que ClienteMcpSdk
 * vuelve a convertir en una excepción real del lado del cliente.
 */
export function crearServidorGoogleCalendar(cliente: ClienteGoogleCalendarApi): McpServer {
  const servidor = new McpServer({ name: NOMBRE_CONECTOR_GOOGLE_CALENDAR, version: "1.0.0" });

  servidor.registerTool(
    "crear_evento",
    {
      description:
        "Crea un evento en el calendario de la planta (p. ej. mantenimiento programado), con técnicos como invitados.",
      inputSchema: {
        titulo: z.string().min(1),
        descripcion: z.string().default(""),
        inicio: z.string().datetime(),
        fin: z.string().datetime(),
        invitados: z.array(z.string().email()).default([]),
      },
      annotations: { readOnlyHint: false },
    },
    async (params) => {
      const texto = await cliente.crearEvento(params);
      return { content: [{ type: "text", text: texto }] };
    },
  );

  servidor.registerTool(
    "consultar_disponibilidad",
    {
      description: "Consulta la disponibilidad del calendario de la planta en un rango de fechas.",
      inputSchema: { desde: z.string().datetime(), hasta: z.string().datetime() },
      annotations: { readOnlyHint: true },
    },
    async (params) => {
      const texto = await cliente.consultarDisponibilidad(params);
      return { content: [{ type: "text", text: texto }] };
    },
  );

  return servidor;
}
