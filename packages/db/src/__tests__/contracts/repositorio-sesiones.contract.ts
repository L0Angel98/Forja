import { describe, expect, it } from "vitest";
import type { RepositorioSesiones, Sesion } from "@forja/core";

/**
 * Suite de contrato (principio L de SOLID, ver 01-estandares.md): cualquier
 * implementación de RepositorioSesiones debe pasar estas mismas pruebas,
 * sea la versión en memoria o la de Drizzle.
 */
export function pruebasDeContratoRepositorioSesiones(
  nombre: string,
  crearRepositorio: () => RepositorioSesiones | Promise<RepositorioSesiones>,
  usuarioIdValido: () => string | Promise<string>,
): void {
  describe(`RepositorioSesiones — contrato (${nombre})`, () => {
    it("crea una sesión y la puede volver a buscar por id", async () => {
      const repo = await crearRepositorio();
      const usuarioId = await usuarioIdValido();
      const sesion: Sesion = {
        id: `sesion-${nombre}-1`,
        usuarioId,
        dispositivoCompartido: false,
        creadaEn: new Date("2026-01-01T00:00:00.000Z"),
        ultimaActividadEn: new Date("2026-01-01T00:00:00.000Z"),
      };

      await repo.crear(sesion);
      const encontrada = await repo.buscarPorId(sesion.id);

      expect(encontrada).toEqual(sesion);
    });

    it("buscar una sesión inexistente devuelve null", async () => {
      const repo = await crearRepositorio();
      expect(await repo.buscarPorId("no-existe")).toBeNull();
    });

    it("actualiza la última actividad", async () => {
      const repo = await crearRepositorio();
      const usuarioId = await usuarioIdValido();
      const sesion: Sesion = {
        id: `sesion-${nombre}-2`,
        usuarioId,
        dispositivoCompartido: false,
        creadaEn: new Date("2026-01-01T00:00:00.000Z"),
        ultimaActividadEn: new Date("2026-01-01T00:00:00.000Z"),
      };
      await repo.crear(sesion);

      const nuevaFecha = new Date("2026-01-01T01:00:00.000Z");
      await repo.actualizarUltimaActividad(sesion.id, nuevaFecha);

      expect((await repo.buscarPorId(sesion.id))?.ultimaActividadEn).toEqual(nuevaFecha);
    });

    it("elimina una sesión", async () => {
      const repo = await crearRepositorio();
      const usuarioId = await usuarioIdValido();
      const sesion: Sesion = {
        id: `sesion-${nombre}-3`,
        usuarioId,
        dispositivoCompartido: true,
        creadaEn: new Date("2026-01-01T00:00:00.000Z"),
        ultimaActividadEn: new Date("2026-01-01T00:00:00.000Z"),
      };
      await repo.crear(sesion);

      await repo.eliminar(sesion.id);

      expect(await repo.buscarPorId(sesion.id)).toBeNull();
    });
  });
}
