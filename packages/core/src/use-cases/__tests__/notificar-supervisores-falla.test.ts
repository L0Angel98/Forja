import { describe, expect, it } from "vitest";
import { notificarSupervisoresFalla, TIPO_NOTIFICACION_FALLA_REPORTADA } from "../notificar-supervisores-falla";
import { crearRepositorioNotificacionesFalso } from "../../testing/fakes";

describe("notificarSupervisoresFalla", () => {
  it("crea una notificación para el área de la falla", async () => {
    const notificaciones = crearRepositorioNotificacionesFalso();
    const ahora = new Date("2026-01-01T00:00:00.000Z");

    const notificacion = await notificarSupervisoresFalla(
      { notificaciones, generarId: () => "notificacion-1" },
      { areaId: "area-ensamble", failureReportId: "reporte-1", ahora },
    );

    expect(notificacion).toEqual({
      id: "notificacion-1",
      areaId: "area-ensamble",
      tipo: TIPO_NOTIFICACION_FALLA_REPORTADA,
      referenciaId: "reporte-1",
      creadaEn: ahora,
    });
    expect(notificaciones.notificaciones).toContainEqual(notificacion);
  });
});
