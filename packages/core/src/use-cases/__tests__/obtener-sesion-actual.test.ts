import { describe, expect, it } from "vitest";
import { obtenerSesionActual } from "../obtener-sesion-actual";
import { SesionInvalida } from "../../errors/sesion-invalida";
import type { Sesion } from "../../entities/sesion";
import type { Usuario } from "../../entities/usuario";
import {
  INACTIVIDAD_MAXIMA_DISPOSITIVO_COMPARTIDO_MS,
  INACTIVIDAD_MAXIMA_MS,
} from "../../config/sesion";
import { crearRepositorioSesionesMemoria, crearRepositorioUsuariosMemoria } from "../../testing/fakes";

const CREADA_EN = new Date("2026-01-01T00:00:00.000Z");

const usuario: Usuario = {
  id: "usuario-1",
  email: "operador@planta.mx",
  passwordHash: "hash:x",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

function construir(sesionParcial: Partial<Sesion> = {}, usuarioParcial: Partial<Usuario> = {}) {
  const sesiones = crearRepositorioSesionesMemoria();
  const usuarios = crearRepositorioUsuariosMemoria([{ ...usuario, ...usuarioParcial }]);
  const sesion: Sesion = {
    id: "sesion-1",
    usuarioId: usuario.id,
    dispositivoCompartido: false,
    creadaEn: CREADA_EN,
    ultimaActividadEn: CREADA_EN,
    ...sesionParcial,
  };
  sesiones.sesiones.set(sesion.id, sesion);
  return { sesiones, usuarios, sesion };
}

describe("obtenerSesionActual", () => {
  it("devuelve el usuario y actualiza la última actividad", async () => {
    const { sesiones, usuarios, sesion } = construir();
    const ahora = new Date(CREADA_EN.getTime() + 60_000);

    const resultado = await obtenerSesionActual({ sesiones, usuarios }, { sesionId: sesion.id, ahora });

    expect(resultado.usuario.id).toBe(usuario.id);
    expect(sesiones.sesiones.get(sesion.id)?.ultimaActividadEn).toEqual(ahora);
  });

  it("sesión inexistente lanza SesionInvalida", async () => {
    const { sesiones, usuarios } = construir();

    await expect(
      obtenerSesionActual({ sesiones, usuarios }, { sesionId: "no-existe", ahora: CREADA_EN }),
    ).rejects.toThrow(SesionInvalida);
  });

  it("sesión expirada por inactividad (12h default) lanza SesionInvalida y se elimina", async () => {
    const { sesiones, usuarios, sesion } = construir();
    const ahora = new Date(CREADA_EN.getTime() + INACTIVIDAD_MAXIMA_MS + 1);

    await expect(
      obtenerSesionActual({ sesiones, usuarios }, { sesionId: sesion.id, ahora }),
    ).rejects.toThrow(SesionInvalida);
    expect(await sesiones.buscarPorId(sesion.id)).toBeNull();
  });

  it("dispositivo compartido expira a los 15 minutos de inactividad", async () => {
    const { sesiones, usuarios, sesion } = construir({ dispositivoCompartido: true });
    const ahora = new Date(CREADA_EN.getTime() + INACTIVIDAD_MAXIMA_DISPOSITIVO_COMPARTIDO_MS + 1);

    await expect(
      obtenerSesionActual({ sesiones, usuarios }, { sesionId: sesion.id, ahora }),
    ).rejects.toThrow(SesionInvalida);
  });

  it("usuario desactivado con sesión abierta recibe SesionInvalida en la siguiente petición", async () => {
    const { sesiones, usuarios, sesion } = construir({}, { activo: false });

    await expect(
      obtenerSesionActual({ sesiones, usuarios }, { sesionId: sesion.id, ahora: CREADA_EN }),
    ).rejects.toThrow(SesionInvalida);
  });
});
