import { describe, expect, it } from "vitest";
import { proponerSugerenciaMemoria } from "../proponer-sugerencia-memoria";
import { aprobarSugerenciaMemoria } from "../aprobar-sugerencia-memoria";
import { rechazarSugerenciaMemoria } from "../rechazar-sugerencia-memoria";
import { SugerenciaMemoriaNoEncontrada } from "../../errors/sugerencia-memoria-no-encontrada";
import { SugerenciaMemoriaYaResuelta } from "../../errors/sugerencia-memoria-ya-resuelta";
import {
  crearEscritorMemoriaFalso,
  crearRegistradorAuditoriaMemoria,
  crearRepositorioSugerenciasMemoriaFalso,
} from "../../testing/fakes";

const AHORA = new Date("2026-01-01T00:00:00.000Z");
const IP = "10.0.0.1";
const ADMIN_ID = "admin-1";

function construir() {
  return {
    sugerencias: crearRepositorioSugerenciasMemoriaFalso(),
    escritorMemoria: crearEscritorMemoriaFalso(),
    auditoria: crearRegistradorAuditoriaMemoria(),
    generarId: () => "sugerencia-1",
  };
}

describe("proponerSugerenciaMemoria", () => {
  it("crea una sugerencia pendiente", async () => {
    const deps = construir();
    const sugerencia = await proponerSugerenciaMemoria(deps, { contenido: "El torno 3 vibra más los lunes", ahora: AHORA });

    expect(sugerencia.estado).toBe("pendiente");
    expect(deps.sugerencias.sugerencias.get(sugerencia.id)).toEqual(sugerencia);
  });
});

describe("aprobarSugerenciaMemoria", () => {
  it("escribe la entrada en memoria, marca aprobada y audita con detalle", async () => {
    const deps = construir();
    const sugerencia = await proponerSugerenciaMemoria(deps, { contenido: "Dato útil", ahora: AHORA });

    await aprobarSugerenciaMemoria(deps, { sugerenciaId: sugerencia.id, adminId: ADMIN_ID, ip: IP, ahora: AHORA });

    expect(deps.escritorMemoria.entradas).toContain("Dato útil");
    expect(deps.sugerencias.sugerencias.get(sugerencia.id)?.estado).toBe("aprobada");
    expect(deps.auditoria.eventos).toContainEqual(
      expect.objectContaining({ tipo: "memoria_aprobada", usuarioId: ADMIN_ID }),
    );
  });

  it("sugerencia inexistente lanza error", async () => {
    const deps = construir();
    await expect(
      aprobarSugerenciaMemoria(deps, { sugerenciaId: "no-existe", adminId: ADMIN_ID, ip: IP, ahora: AHORA }),
    ).rejects.toThrow(SugerenciaMemoriaNoEncontrada);
  });

  it("sugerencia ya resuelta no se puede volver a aprobar", async () => {
    const deps = construir();
    const sugerencia = await proponerSugerenciaMemoria(deps, { contenido: "Dato útil", ahora: AHORA });
    await aprobarSugerenciaMemoria(deps, { sugerenciaId: sugerencia.id, adminId: ADMIN_ID, ip: IP, ahora: AHORA });

    await expect(
      aprobarSugerenciaMemoria(deps, { sugerenciaId: sugerencia.id, adminId: ADMIN_ID, ip: IP, ahora: AHORA }),
    ).rejects.toThrow(SugerenciaMemoriaYaResuelta);
  });
});

describe("rechazarSugerenciaMemoria", () => {
  it("marca rechazada sin escribir en memoria", async () => {
    const deps = construir();
    const sugerencia = await proponerSugerenciaMemoria(deps, { contenido: "Dato dudoso", ahora: AHORA });

    await rechazarSugerenciaMemoria(deps, { sugerenciaId: sugerencia.id, adminId: ADMIN_ID, ip: IP, ahora: AHORA });

    expect(deps.escritorMemoria.entradas).toHaveLength(0);
    expect(deps.sugerencias.sugerencias.get(sugerencia.id)?.estado).toBe("rechazada");
    expect(deps.auditoria.eventos).toContainEqual(expect.objectContaining({ tipo: "memoria_rechazada" }));
  });
});
