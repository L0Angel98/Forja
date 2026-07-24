import { describe, expect, it } from "vitest";
import { cambiarEstadoFalla } from "../cambiar-estado-falla";
import { ReporteFallaNoEncontrado } from "../../errors/reporte-falla-no-encontrado";
import { TransicionEstadoInvalida } from "../../errors/transicion-estado-invalida";
import { crearRepositorioFallasFalso } from "../../testing/fakes";
import type { ReporteFalla } from "../../entities/falla";

const REPORTE_BASE: ReporteFalla = {
  id: "reporte-1",
  machineId: "maquina-1",
  reportadoPor: "usuario-1",
  sintomaTaxonomia: "fuga",
  sintomaOtro: null,
  descripcion: "fuga de aceite",
  severidad: 2,
  fotos: [],
  origen: "formulario",
  estado: "abierto",
  creadoEn: new Date("2026-01-01T00:00:00.000Z"),
};

describe("cambiarEstadoFalla", () => {
  it("aplica una transición válida", async () => {
    const fallas = crearRepositorioFallasFalso();
    fallas.fallas.set(REPORTE_BASE.id, REPORTE_BASE);

    const reporte = await cambiarEstadoFalla({ fallas }, { id: REPORTE_BASE.id, siguiente: "en_revision" });

    expect(reporte.estado).toBe("en_revision");
    expect(fallas.fallas.get(REPORTE_BASE.id)?.estado).toBe("en_revision");
  });

  it("rechaza una transición inválida (saltar estados)", async () => {
    const fallas = crearRepositorioFallasFalso();
    fallas.fallas.set(REPORTE_BASE.id, REPORTE_BASE);

    await expect(
      cambiarEstadoFalla({ fallas }, { id: REPORTE_BASE.id, siguiente: "atendido" }),
    ).rejects.toThrow(TransicionEstadoInvalida);
  });

  it("rechaza si el reporte no existe", async () => {
    const fallas = crearRepositorioFallasFalso();

    await expect(
      cambiarEstadoFalla({ fallas }, { id: "no-existe", siguiente: "en_revision" }),
    ).rejects.toThrow(ReporteFallaNoEncontrado);
  });
});
