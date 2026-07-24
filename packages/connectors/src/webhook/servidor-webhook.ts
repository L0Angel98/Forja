import { WebhookUrlNoPermitida } from "@forja/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const NOMBRE_CONECTOR_WEBHOOK = "webhook";

/**
 * La lista blanca vive en `workspace/conectores.yaml` (ConectorConfigurado.
 * listaBlancaUrls) y se valida aquí, dentro del propio servidor MCP: es el
 * dueño natural de esa regla (spec 17: "URLs permitidas solo desde una
 * lista blanca en conectores.yaml"). Al cruzar el protocolo MCP los
 * errores se aplanan a texto (como con cualquier servidor MCP externo real),
 * así que se usa WebhookUrlNoPermitida solo por el mensaje consistente, no
 * porque su clase concreta vaya a sobrevivir del otro lado.
 */
export function crearServidorWebhook(listaBlancaUrls: readonly string[]): McpServer {
  const servidor = new McpServer({ name: NOMBRE_CONECTOR_WEBHOOK, version: "1.0.0" });

  servidor.registerTool(
    "llamar_webhook",
    {
      description: "Envía un POST con un payload JSON a una URL de la lista blanca configurada.",
      inputSchema: { url: z.string().url(), payload: z.record(z.string(), z.unknown()).default({}) },
      annotations: { readOnlyHint: false },
    },
    async (params) => {
      if (!listaBlancaUrls.includes(params.url)) throw new WebhookUrlNoPermitida(params.url);

      const respuesta = await fetch(params.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params.payload),
      });
      if (!respuesta.ok) {
        throw new Error(`El webhook respondió ${respuesta.status} ${respuesta.statusText}.`);
      }
      return { content: [{ type: "text", text: `Webhook llamado: ${params.url} (${respuesta.status})` }] };
    },
  );

  return servidor;
}
