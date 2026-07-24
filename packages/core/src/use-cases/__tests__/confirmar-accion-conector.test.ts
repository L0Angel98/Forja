import { describe, expect, it, vi } from "vitest";
import type { ConectorActivo } from "../../ports/registro-conectores-activos";
import type { Usuario } from "../../entities/usuario";
import { ConectorDesconocido } from "../../errors/conector-desconocido";
import { PermisoDenegado } from "../../errors/permiso-denegado";
import { crearRegistradorTraceFalso } from "../../testing/fakes";
import { confirmarAccionConector } from "../confirmar-accion-conector";

const supervisor: Usuario = {
  id: "u1",
  email: "sup@planta.mx",
  passwordHash: "x",
  nombre: "Supervisor",
  rol: "supervisor",
  activo: true,
};

const operador: Usuario = { ...supervisor, id: "u2", rol: "operador" };

function conectorActivo(overrides: Partial<{ invocar: ReturnType<typeof vi.fn> }> = {}): ConectorActivo {
  return {
    manifiesto: {
      nombre: "google-calendar",
      version: "1.0.0",
      herramientas: [
        { nombre: "crear_evento", descripcion: "x", esEscritura: true, schemaEntrada: {} },
      ],
    },
    permisos: { crear_evento: ["supervisor", "admin"] },
    cliente: {
      async listarHerramientas() {
        return [];
      },
      invocar: overrides.invocar ?? vi.fn().mockResolvedValue("evento-123"),
      async cerrar() {},
    },
  };
}

function registroCon(activo: ConectorActivo | undefined) {
  return { obtener: vi.fn().mockReturnValue(activo) };
}

const PARAMS_BASE = { plantId: "planta-1", conector: "google-calendar", herramienta: "crear_evento", parametros: { titulo: "Mantenimiento" } };

describe("confirmarAccionConector", () => {
  it("invoca el cliente MCP real y devuelve su resultado", async () => {
    const activo = conectorActivo();
    const trace = crearRegistradorTraceFalso();

    const resultado = await confirmarAccionConector(
      { registro: registroCon(activo), trace },
      { usuario: supervisor, ...PARAMS_BASE },
    );

    expect(resultado).toBe("evento-123");
    expect(activo.cliente.invocar).toHaveBeenCalledWith("crear_evento", { titulo: "Mantenimiento" });
  });

  it("registra un turno sintético con origen conector-confirmacion/{nombre}", async () => {
    const activo = conectorActivo();
    const trace = crearRegistradorTraceFalso();

    await confirmarAccionConector({ registro: registroCon(activo), trace }, { usuario: supervisor, ...PARAMS_BASE });

    expect(trace.turnos).toHaveLength(1);
    expect(trace.turnos[0]).toMatchObject({
      plantId: "planta-1",
      usuarioId: supervisor.id,
      origen: "conector-confirmacion/google-calendar",
      exitoso: true,
      herramientasInvocadas: [{ nombre: "crear_evento", parametros: { titulo: "Mantenimiento" }, exitosa: true }],
    });
  });

  it("rechaza si el rol del usuario no tiene permiso para esa herramienta", async () => {
    const activo = conectorActivo();
    const trace = crearRegistradorTraceFalso();

    await expect(
      confirmarAccionConector({ registro: registroCon(activo), trace }, { usuario: operador, ...PARAMS_BASE }),
    ).rejects.toThrow(PermisoDenegado);
    expect(activo.cliente.invocar).not.toHaveBeenCalled();
  });

  it("rechaza un conector inexistente/no activo", async () => {
    const trace = crearRegistradorTraceFalso();

    await expect(
      confirmarAccionConector({ registro: registroCon(undefined), trace }, { usuario: supervisor, ...PARAMS_BASE }),
    ).rejects.toThrow(ConectorDesconocido);
  });

  it("rechaza una herramienta que no está en el manifiesto del conector", async () => {
    const activo = conectorActivo();
    const trace = crearRegistradorTraceFalso();

    await expect(
      confirmarAccionConector(
        { registro: registroCon(activo), trace },
        { usuario: supervisor, ...PARAMS_BASE, herramienta: "borrar_evento" },
      ),
    ).rejects.toThrow(ConectorDesconocido);
  });

  it("registra el turno como fallido (y re-lanza) si el cliente MCP falla", async () => {
    const activo = conectorActivo({ invocar: vi.fn().mockRejectedValue(new Error("timeout MCP")) });
    const trace = crearRegistradorTraceFalso();

    await expect(
      confirmarAccionConector({ registro: registroCon(activo), trace }, { usuario: supervisor, ...PARAMS_BASE }),
    ).rejects.toThrow("timeout MCP");

    expect(trace.turnos).toHaveLength(1);
    expect(trace.turnos[0]).toMatchObject({
      exitoso: false,
      herramientasInvocadas: [{ nombre: "crear_evento", parametros: { titulo: "Mantenimiento" }, exitosa: false }],
    });
  });
});
