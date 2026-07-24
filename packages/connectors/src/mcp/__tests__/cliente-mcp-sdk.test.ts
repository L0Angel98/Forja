import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ClienteMcpSdk } from "../cliente-mcp-sdk";

async function levantarServidorDePrueba(): Promise<{ cliente: ClienteMcpSdk; servidor: McpServer }> {
  const servidor = new McpServer({ name: "servidor-prueba", version: "1.0.0" });
  servidor.registerTool(
    "eco",
    { description: "Repite el texto recibido.", inputSchema: { texto: z.string() }, annotations: { readOnlyHint: true } },
    async ({ texto }) => ({ content: [{ type: "text", text: `eco: ${texto}` }] }),
  );
  servidor.registerTool(
    "falla",
    { description: "Siempre falla.", inputSchema: {}, annotations: { readOnlyHint: false } },
    async () => ({ content: [{ type: "text", text: "algo salió mal" }], isError: true }),
  );

  const [transporteCliente, transporteServidor] = InMemoryTransport.createLinkedPair();
  await servidor.connect(transporteServidor);

  const cliente = new ClienteMcpSdk("cliente-prueba", "1.0.0", transporteCliente);
  await cliente.conectar();

  return { cliente, servidor };
}

describe("ClienteMcpSdk", () => {
  let clienteActivo: ClienteMcpSdk | undefined;

  afterEach(async () => {
    await clienteActivo?.cerrar();
    clienteActivo = undefined;
  });

  it("listarHerramientas() devuelve la respuesta cruda real de tools/list", async () => {
    const { cliente } = await levantarServidorDePrueba();
    clienteActivo = cliente;

    const herramientas = await cliente.listarHerramientas();

    expect(herramientas).toHaveLength(2);
    expect(herramientas.find((h) => h["name"] === "eco")).toMatchObject({
      name: "eco",
      description: "Repite el texto recibido.",
      annotations: { readOnlyHint: true },
    });
  });

  it("invocar() llama a la herramienta real y devuelve el texto de la respuesta", async () => {
    const { cliente } = await levantarServidorDePrueba();
    clienteActivo = cliente;

    const resultado = await cliente.invocar("eco", { texto: "hola" });

    expect(resultado).toBe("eco: hola");
  });

  it("invocar() lanza si la herramienta responde isError", async () => {
    const { cliente } = await levantarServidorDePrueba();
    clienteActivo = cliente;

    await expect(cliente.invocar("falla", {})).rejects.toThrow("algo salió mal");
  });

  it("cerrar() cierra la conexión: invocar() después falla", async () => {
    const { cliente } = await levantarServidorDePrueba();

    await cliente.cerrar();

    await expect(cliente.invocar("eco", { texto: "hola" })).rejects.toThrow();
  });
});
