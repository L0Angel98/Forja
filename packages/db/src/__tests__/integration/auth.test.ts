import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cerrarSesion,
  iniciarSesion,
  obtenerSesionActual,
  SesionInvalida,
  UsuarioDesactivado,
} from "@forja/core";
import { Argon2Hasher } from "../../auth/argon2-hasher";
import { crearCliente, type ForjaDb } from "../../client";
import { ejecutarMigraciones } from "../../migrate";
import { RepositorioIntentosLoginDrizzle } from "../../repositories/repositorio-intentos-login-drizzle";
import { RepositorioSesionesDrizzle } from "../../repositories/repositorio-sesiones-drizzle";
import { RepositorioUsuariosDrizzle } from "../../repositories/repositorio-usuarios-drizzle";
import { RegistradorAuditoriaDrizzle } from "../../repositories/registrador-auditoria-drizzle";
import { appUser, auditLog, role, session } from "../../schema/index";
import { pruebasDeContratoRepositorioSesiones } from "../contracts/repositorio-sesiones.contract";

describe("autenticación (Postgres real)", () => {
  let contenedor: StartedPostgreSqlContainer | undefined;
  let db: ForjaDb;
  let cerrarConexion: (() => Promise<void>) | undefined;
  const hasher = new Argon2Hasher();
  let usuarioActivoId: string;
  let usuarioDesactivadoId: string;

  beforeAll(async () => {
    contenedor = await new PostgreSqlContainer("timescale/timescaledb-ha:pg16")
      .withDatabase("forja")
      .withUsername("forja")
      .withPassword("forja")
      .start();

    const cliente = crearCliente(contenedor.getConnectionUri());
    db = cliente.db;
    cerrarConexion = cliente.cerrar;

    await ejecutarMigraciones(contenedor.getConnectionUri());

    await db.insert(role).values([{ id: "operador" }, { id: "supervisor" }, { id: "admin" }]);

    const passwordHash = await hasher.hash("correcta");
    const [activo] = await db
      .insert(appUser)
      .values({
        email: "activo@planta.mx",
        nombre: "Usuario Activo",
        roleId: "operador",
        passwordHash,
        activo: true,
      })
      .returning();
    const [desactivado] = await db
      .insert(appUser)
      .values({
        email: "desactivado@planta.mx",
        nombre: "Usuario Desactivado",
        roleId: "operador",
        passwordHash,
        activo: false,
      })
      .returning();

    usuarioActivoId = activo!.id;
    usuarioDesactivadoId = desactivado!.id;
  }, 120_000);

  afterAll(async () => {
    await cerrarConexion?.();
    await contenedor?.stop();
  });

  pruebasDeContratoRepositorioSesiones(
    "drizzle",
    () => new RepositorioSesionesDrizzle(db),
    () => usuarioActivoId,
  );

  it("flujo completo: login → sesión persistida → obtener sesión → logout", async () => {
    const usuarios = new RepositorioUsuariosDrizzle(db);
    const sesiones = new RepositorioSesionesDrizzle(db);
    const intentosLogin = new RepositorioIntentosLoginDrizzle(db);
    const auditoria = new RegistradorAuditoriaDrizzle(db);
    const ahora = new Date();

    const { sesion } = await iniciarSesion(
      { usuarios, sesiones, hasher, intentosLogin, auditoria, generarIdSesion: randomUUID },
      { email: "activo@planta.mx", contrasena: "correcta", ip: "10.0.0.5", dispositivoCompartido: false, ahora },
    );

    const [filaSesion] = await db.select().from(session).where(eq(session.id, sesion.id));
    expect(filaSesion).toBeDefined();

    const { usuario } = await obtenerSesionActual({ sesiones, usuarios }, { sesionId: sesion.id, ahora });
    expect(usuario.email).toBe("activo@planta.mx");

    const eventosLogin = await db.select().from(auditLog).where(eq(auditLog.tipo, "login_exitoso"));
    expect(eventosLogin.length).toBeGreaterThan(0);

    await cerrarSesion({ sesiones, auditoria }, { sesionId: sesion.id, ip: "10.0.0.5", ahora });

    expect(await sesiones.buscarPorId(sesion.id)).toBeNull();
    const eventosLogout = await db.select().from(auditLog).where(eq(auditLog.tipo, "logout"));
    expect(eventosLogout.length).toBeGreaterThan(0);
  });

  it("login de un usuario desactivado se rechaza", async () => {
    const usuarios = new RepositorioUsuariosDrizzle(db);
    const sesiones = new RepositorioSesionesDrizzle(db);
    const intentosLogin = new RepositorioIntentosLoginDrizzle(db);
    const auditoria = new RegistradorAuditoriaDrizzle(db);

    await expect(
      iniciarSesion(
        { usuarios, sesiones, hasher, intentosLogin, auditoria, generarIdSesion: randomUUID },
        {
          email: "desactivado@planta.mx",
          contrasena: "correcta",
          ip: "10.0.0.6",
          dispositivoCompartido: false,
          ahora: new Date(),
        },
      ),
    ).rejects.toThrow(UsuarioDesactivado);
  });

  it("una sesión abierta de un usuario que luego se desactiva recibe SesionInvalida en la siguiente petición", async () => {
    const usuarios = new RepositorioUsuariosDrizzle(db);
    const sesiones = new RepositorioSesionesDrizzle(db);
    const ahora = new Date();

    const sesionActiva = {
      id: randomUUID(),
      usuarioId: usuarioDesactivadoId,
      dispositivoCompartido: false,
      creadaEn: ahora,
      ultimaActividadEn: ahora,
    };
    await sesiones.crear(sesionActiva);

    await expect(
      obtenerSesionActual({ sesiones, usuarios }, { sesionId: sesionActiva.id, ahora }),
    ).rejects.toThrow(SesionInvalida);
  });
});
