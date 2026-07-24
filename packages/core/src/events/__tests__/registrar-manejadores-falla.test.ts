import { describe, expect, it } from "vitest";
import { BusEventos } from "../bus-eventos";
import { EVENTO_FALLA_REPORTADA } from "../falla-reportada";
import { registrarManejadoresFalla, TRABAJO_MATERIALIZAR_SNAPSHOT } from "../registrar-manejadores-falla";
import { crearColaTrabajosFalso, crearRepositorioNotificacionesFalso } from "../../testing/fakes";

describe("registrarManejadoresFalla", () => {
  it("al publicarse FallaReportada, encola el snapshot y notifica al área", async () => {
    const bus = new BusEventos();
    const cola = crearColaTrabajosFalso();
    const notificaciones = crearRepositorioNotificacionesFalso();

    registrarManejadoresFalla(bus, { cola, notificaciones, generarId: () => "notificacion-1" });

    const ocurridoEn = new Date("2026-01-01T00:00:00.000Z");
    await bus.publicar(EVENTO_FALLA_REPORTADA, {
      failureReportId: "reporte-1",
      machineId: "maquina-1",
      areaId: "area-ensamble",
      ocurridoEn,
    });

    expect(cola.encolados).toEqual([
      {
        tipo: TRABAJO_MATERIALIZAR_SNAPSHOT,
        payload: {
          failureReportId: "reporte-1",
          machineId: "maquina-1",
          ocurridoEn: ocurridoEn.toISOString(),
        },
      },
    ]);

    expect(notificaciones.notificaciones).toEqual([
      {
        id: "notificacion-1",
        areaId: "area-ensamble",
        tipo: "falla_reportada",
        referenciaId: "reporte-1",
        creadaEn: ocurridoEn,
      },
    ]);
  });
});
