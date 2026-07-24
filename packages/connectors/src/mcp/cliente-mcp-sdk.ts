import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ClienteMcp } from "@forja/core";

interface ContenidoTexto {
  readonly type: "text";
  readonly text: string;
}

function esContenidoTexto(valor: unknown): valor is ContenidoTexto {
  return typeof valor === "object" && valor !== null && (valor as { type?: unknown }).type === "text";
}

function extraerTexto(contenido: unknown): string {
  if (!Array.isArray(contenido)) return "";
  return contenido.filter(esContenidoTexto).map((item) => item.text).join("\n");
}

/** Adaptador (patrón Adapter) real sobre el cliente MCP del SDK oficial. */
export class ClienteMcpSdk implements ClienteMcp {
  private readonly cliente: Client;

  constructor(nombreCliente: string, version: string, private readonly transport: Transport) {
    this.cliente = new Client({ name: nombreCliente, version });
  }

  async conectar(): Promise<void> {
    await this.cliente.connect(this.transport);
  }

  async listarHerramientas(): Promise<readonly Record<string, unknown>[]> {
    const resultado = await this.cliente.listTools();
    return resultado.tools;
  }

  async invocar(nombreHerramienta: string, parametros: Record<string, unknown>): Promise<string> {
    const resultado = await this.cliente.callTool({ name: nombreHerramienta, arguments: parametros });
    const texto = extraerTexto((resultado as { content?: unknown }).content);
    if ((resultado as { isError?: boolean }).isError) {
      throw new Error(texto || `la herramienta "${nombreHerramienta}" devolvió un error.`);
    }
    return texto;
  }

  async cerrar(): Promise<void> {
    await this.cliente.close();
  }
}
