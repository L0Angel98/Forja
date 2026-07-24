import { describe, expect, it } from "vitest";
import { cerrarSesion } from "../cerrar-sesion";
import type { Sesion } from "../../entities/sesion";
import { crearRegistradorAuditoriaMemoria, crearRepositorioSesionesMemoria } from "../../testing/fakes";

const AHORA = new Date("2026-01-01T00:00:00.000Z");
const IP = "10.0.0.1";

const sesion: Sesion = {
  id: "sesion-1",
  usuarioId: "usuario-1",
  dispositivoCompartido: false,
  creadaEn: AHORA,
  ultimaActividadEn: AHORA,
};

describe("cerrarSesion", () => {
  it("revoca la sesión en el repositorio y audita el logout", async () => {
    const sesiones = crearRepositorioSesionesMemoria();
    await sesiones.crear(sesion);
    const auditoria = crearRegistradorAuditoriaMemoria();

    await cerrarSesion({ sesiones, auditoria }, { sesionId: sesion.id, ip: IP, ahora: AHORA });

    expect(await sesiones.buscarPorId(sesion.id)).toBeNull();
    expect(auditoria.eventos).toContainEqual(
      expect.objectContaining({ tipo: "logout", usuarioId: sesion.usuarioId }),
    );
  });

  it("cerrar una sesión que ya no existe no falla (idempotente)", async () => {
    const sesiones = crearRepositorioSesionesMemoria();
    const auditoria = crearRegistradorAuditoriaMemoria();

    await expect(
      cerrarSesion({ sesiones, auditoria }, { sesionId: "no-existe", ip: IP, ahora: AHORA }),
    ).resolves.toBeUndefined();
  });
});
