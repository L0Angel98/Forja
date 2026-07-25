import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { eliminarPendiente, encolarReporte, listarPendientes } from "../cola-offline";

function borrarBaseDeDatos(): Promise<void> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.deleteDatabase("forja-cola-offline");
    solicitud.onsuccess = () => resolve();
    solicitud.onerror = () => reject(solicitud.error as Error);
  });
}

beforeEach(() => borrarBaseDeDatos());

describe("cola-offline (offline de escritura del formulario de fallas)", () => {
  it("encola un reporte y lo devuelve en listarPendientes", async () => {
    const payload = { machineId: "PRE-03", descripcion: "Ruido anormal", severidad: 3 };
    const pendiente = await encolarReporte(payload);

    const pendientes = await listarPendientes();
    const encontrado = pendientes.find((item) => item.id === pendiente.id);

    expect(encontrado).toBeDefined();
    expect(encontrado?.payload).toEqual(payload);

    await eliminarPendiente(pendiente.id);
  });

  it("eliminarPendiente lo quita de la cola (sincronizar no duplica)", async () => {
    const payload = { machineId: "HRN-01", descripcion: "Sobrecalentamiento", severidad: 4 };
    const pendiente = await encolarReporte(payload);

    await eliminarPendiente(pendiente.id);

    const pendientes = await listarPendientes();
    expect(pendientes.find((item) => item.id === pendiente.id)).toBeUndefined();
  });

  it("cada reporte encolado recibe un id distinto", async () => {
    const a = await encolarReporte({ machineId: "A" });
    const b = await encolarReporte({ machineId: "B" });

    expect(a.id).not.toBe(b.id);

    await eliminarPendiente(a.id);
    await eliminarPendiente(b.id);
  });
});
