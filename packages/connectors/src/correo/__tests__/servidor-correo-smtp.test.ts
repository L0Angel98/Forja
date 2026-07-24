import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClienteMcpSdk } from "../../mcp/cliente-mcp-sdk";
import type { EnviadorCorreo } from "../enviador-correo";
import { crearServidorCorreoSmtp } from "../servidor-correo-smtp";

async function levantar(enviador: EnviadorCorreo) {
  const servidor = crearServidorCorreoSmtp(enviador);
  const [transporteCliente, transporteServidor] = InMemoryTransport.createLinkedPair();
  await servidor.connect(transporteServidor);
  const clienteMcp = new ClienteMcpSdk("prueba", "1.0.0", transporteCliente);
  await clienteMcp.conectar();
  return clienteMcp;
}

describe("crearServidorCorreoSmtp", () => {
  let clienteActivo: ClienteMcpSdk | undefined;

  afterEach(async () => {
    await clienteActivo?.cerrar();
    clienteActivo = undefined;
  });

  it("expone enviar_correo como herramienta de escritura", async () => {
    const enviador = { enviar: vi.fn().mockResolvedValue(undefined) };
    const clienteMcp = await levantar(enviador);
    clienteActivo = clienteMcp;

    const herramientas = await clienteMcp.listarHerramientas();

    expect(herramientas).toEqual([
      expect.objectContaining({ name: "enviar_correo", annotations: expect.objectContaining({ readOnlyHint: false }) }),
    ]);
  });

  it("delega en el enviador real y devuelve confirmación", async () => {
    const enviador = { enviar: vi.fn().mockResolvedValue(undefined) };
    const clienteMcp = await levantar(enviador);
    clienteActivo = clienteMcp;

    const resultado = await clienteMcp.invocar("enviar_correo", {
      destinatarios: ["a@planta.mx"],
      asunto: "Prueba",
      cuerpo: "Contenido",
    });

    expect(resultado).toContain("a@planta.mx");
    expect(enviador.enviar).toHaveBeenCalledWith({
      destinatarios: ["a@planta.mx"],
      asunto: "Prueba",
      cuerpo: "Contenido",
    });
  });

  it("propaga el error de un enviador no configurado", async () => {
    const enviador = { enviar: vi.fn().mockRejectedValue(new Error("SMTP no configurado")) };
    const clienteMcp = await levantar(enviador);
    clienteActivo = clienteMcp;

    await expect(
      clienteMcp.invocar("enviar_correo", { destinatarios: ["a@planta.mx"], asunto: "x", cuerpo: "y" }),
    ).rejects.toThrow("SMTP no configurado");
  });
});
