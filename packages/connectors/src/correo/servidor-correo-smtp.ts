import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { EnviadorCorreo } from "./enviador-correo";

export const NOMBRE_CONECTOR_CORREO_SMTP = "correo-smtp";

export function crearServidorCorreoSmtp(enviador: EnviadorCorreo): McpServer {
  const servidor = new McpServer({ name: NOMBRE_CONECTOR_CORREO_SMTP, version: "1.0.0" });

  servidor.registerTool(
    "enviar_correo",
    {
      description: "Envía un correo a uno o más destinatarios.",
      inputSchema: {
        destinatarios: z.array(z.string().email()).min(1),
        asunto: z.string().min(1),
        cuerpo: z.string().min(1),
      },
      annotations: { readOnlyHint: false },
    },
    async (params) => {
      await enviador.enviar(params);
      return { content: [{ type: "text", text: `Correo enviado a ${params.destinatarios.join(", ")}.` }] };
    },
  );

  return servidor;
}
