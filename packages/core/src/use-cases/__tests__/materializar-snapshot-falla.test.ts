import { describe, expect, it } from "vitest";
import { materializarSnapshotFalla } from "../materializar-snapshot-falla";
import {
  crearRepositorioLecturasVentanaFalso,
  crearRepositorioSensoresPorMaquinaFalso,
  crearRepositorioSnapshotsFallaFalso,
} from "../../testing/fakes";

const OCURRIDO_EN = new Date("2026-01-01T12:00:00.000Z");

function construir() {
  let contador = 0;
  return {
    sensores: crearRepositorioSensoresPorMaquinaFalso({
      "maquina-1": [
        { id: "sensor-temp", machineId: "maquina-1", nombre: "Temperatura" },
        { id: "sensor-sin-lecturas", machineId: "maquina-1", nombre: "Vibración" },
      ],
    }),
    lecturas: crearRepositorioLecturasVentanaFalso({
      "sensor-temp": [
        { sensorId: "sensor-temp", ts: new Date("2026-01-01T11:30:00.000Z"), value: 70 },
        { sensorId: "sensor-temp", ts: new Date("2026-01-01T11:45:00.000Z"), value: 90 },
        { sensorId: "sensor-temp", ts: new Date("2026-01-01T11:59:00.000Z"), value: 85 },
        { sensorId: "sensor-temp", ts: new Date("2026-01-01T13:00:00.000Z"), value: 999 },
      ],
    }),
    snapshots: crearRepositorioSnapshotsFallaFalso(),
    generarId: () => `snapshot-${(contador += 1)}`,
    horasVentana: 1,
  };
}

describe("materializarSnapshotFalla", () => {
  it("calcula min/max/avg/last por sensor dentro de la ventana previa a la falla", async () => {
    const deps = construir();

    const snapshots = await materializarSnapshotFalla(deps, {
      failureReportId: "reporte-1",
      machineId: "maquina-1",
      ocurridoEn: OCURRIDO_EN,
    });

    expect(snapshots).toHaveLength(2);

    const snapshotTemp = snapshots.find((s) => s.sensorId === "sensor-temp");
    expect(snapshotTemp).toMatchObject({
      failureReportId: "reporte-1",
      sensorId: "sensor-temp",
      min: 70,
      max: 90,
      avg: 81.66666666666667,
      last: 85,
    });
    expect(snapshotTemp?.ventanaInicio).toEqual(new Date("2026-01-01T11:00:00.000Z"));
    expect(snapshotTemp?.ventanaFin).toEqual(OCURRIDO_EN);

    expect(deps.snapshots.snapshots).toHaveLength(2);
  });

  it("registra estadísticas nulas cuando el sensor no tiene lecturas en la ventana", async () => {
    const deps = construir();

    const snapshots = await materializarSnapshotFalla(deps, {
      failureReportId: "reporte-1",
      machineId: "maquina-1",
      ocurridoEn: OCURRIDO_EN,
    });

    const snapshotSinLecturas = snapshots.find((s) => s.sensorId === "sensor-sin-lecturas");
    expect(snapshotSinLecturas).toMatchObject({ min: null, max: null, avg: null, last: null });
  });

  it("no genera snapshots si la máquina no tiene sensores", async () => {
    const deps = construir();
    deps.sensores = crearRepositorioSensoresPorMaquinaFalso({});

    const snapshots = await materializarSnapshotFalla(deps, {
      failureReportId: "reporte-1",
      machineId: "maquina-sin-sensores",
      ocurridoEn: OCURRIDO_EN,
    });

    expect(snapshots).toEqual([]);
  });
});
