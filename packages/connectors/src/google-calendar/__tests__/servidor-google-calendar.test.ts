import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClienteMcpSdk } from "../../mcp/cliente-mcp-sdk";
import type { ClienteGoogleCalendarApi } from "../cliente-google-calendar";
import { crearServidorGoogleCalendar } from "../servidor-google-calendar";

async function levantar(cliente: ClienteGoogleCalendarApi) {
  const servidor = crearServidorGoogleCalendar(cliente);
  const [transporteCliente, transporteServidor] = InMemoryTransport.createLinkedPair();
  await servidor.connect(transporteServidor);
  const clienteMcp = new ClienteMcpSdk("prueba", "1.0.0", transporteCliente);
  await clienteMcp.conectar();
  return clienteMcp;
}

describe("crearServidorGoogleCalendar", () => {
  let clienteActivo: ClienteMcpSdk | undefined;

  afterEach(async () => {
    await clienteActivo?.cerrar();
    clienteActivo = undefined;
  });

  it("expone crear_evento (escritura) y consultar_disponibilidad (lectura)", async () => {
    const cliente = {
      crearEvento: vi.fn().mockResolvedValue("Evento creado: abc123"),
      consultarDisponibilidad: vi.fn().mockResolvedValue("Sin conflictos."),
    };
    const clienteMcp = await levantar(cliente);
    clienteActivo = clienteMcp;

    const herramientas = await clienteMcp.listarHerramientas();

    expect(herramientas).toEqual([
      expect.objectContaining({ name: "crear_evento", annotations: expect.objectContaining({ readOnlyHint: false }) }),
      expect.objectContaining({
        name: "consultar_disponibilidad",
        annotations: expect.objectContaining({ readOnlyHint: true }),
      }),
    ]);
  });

  it("crear_evento delega en el cliente real y devuelve su resultado", async () => {
    const cliente = {
      crearEvento: vi.fn().mockResolvedValue("Evento creado: abc123"),
      consultarDisponibilidad: vi.fn(),
    };
    const clienteMcp = await levantar(cliente);
    clienteActivo = clienteMcp;

    const resultado = await clienteMcp.invocar("crear_evento", {
      titulo: "Mantenimiento torno 3",
      inicio: "2026-08-01T09:00:00.000Z",
      fin: "2026-08-01T10:00:00.000Z",
      invitados: ["tecnico@planta.mx"],
    });

    expect(resultado).toBe("Evento creado: abc123");
    expect(cliente.crearEvento).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: "Mantenimiento torno 3", invitados: ["tecnico@planta.mx"] }),
    );
  });

  it("propaga el error de un cliente no configurado como fallo real de la invocación", async () => {
    const cliente = {
      crearEvento: vi.fn().mockRejectedValue(new Error("Google Calendar no está configurado")),
      consultarDisponibilidad: vi.fn(),
    };
    const clienteMcp = await levantar(cliente);
    clienteActivo = clienteMcp;

    await expect(
      clienteMcp.invocar("crear_evento", {
        titulo: "x",
        inicio: "2026-08-01T09:00:00.000Z",
        fin: "2026-08-01T10:00:00.000Z",
      }),
    ).rejects.toThrow("Google Calendar no está configurado");
  });
});
