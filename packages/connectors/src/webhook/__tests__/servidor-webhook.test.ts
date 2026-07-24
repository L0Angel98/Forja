import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClienteMcpSdk } from "../../mcp/cliente-mcp-sdk";
import { crearServidorWebhook } from "../servidor-webhook";

async function levantar(listaBlancaUrls: readonly string[]) {
  const servidor = crearServidorWebhook(listaBlancaUrls);
  const [transporteCliente, transporteServidor] = InMemoryTransport.createLinkedPair();
  await servidor.connect(transporteServidor);
  const clienteMcp = new ClienteMcpSdk("prueba", "1.0.0", transporteCliente);
  await clienteMcp.conectar();
  return clienteMcp;
}

describe("crearServidorWebhook", () => {
  let clienteActivo: ClienteMcpSdk | undefined;

  afterEach(async () => {
    await clienteActivo?.cerrar();
    clienteActivo = undefined;
    vi.unstubAllGlobals();
  });

  it("expone llamar_webhook como herramienta de escritura", async () => {
    const clienteMcp = await levantar(["https://ejemplo.com/hook"]);
    clienteActivo = clienteMcp;

    const herramientas = await clienteMcp.listarHerramientas();

    expect(herramientas).toEqual([
      expect.objectContaining({ name: "llamar_webhook", annotations: expect.objectContaining({ readOnlyHint: false }) }),
    ]);
  });

  it("hace un POST real a una URL de la lista blanca", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    const clienteMcp = await levantar(["https://ejemplo.com/hook"]);
    clienteActivo = clienteMcp;

    const resultado = await clienteMcp.invocar("llamar_webhook", {
      url: "https://ejemplo.com/hook",
      payload: { evento: "falla" },
    });

    expect(resultado).toContain("https://ejemplo.com/hook");
    expect(fetchFalso).toHaveBeenCalledWith(
      "https://ejemplo.com/hook",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ evento: "falla" }) }),
    );
  });

  it("rechaza una URL que no está en la lista blanca sin llamar a fetch", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    const clienteMcp = await levantar(["https://ejemplo.com/hook"]);
    clienteActivo = clienteMcp;

    await expect(
      clienteMcp.invocar("llamar_webhook", { url: "https://otro-dominio.com/hook", payload: {} }),
    ).rejects.toThrow();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("lanza si la respuesta HTTP no es exitosa", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500, statusText: "Error" })));
    const clienteMcp = await levantar(["https://ejemplo.com/hook"]);
    clienteActivo = clienteMcp;

    await expect(
      clienteMcp.invocar("llamar_webhook", { url: "https://ejemplo.com/hook", payload: {} }),
    ).rejects.toThrow("500");
  });
});
