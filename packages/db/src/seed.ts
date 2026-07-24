import { and, eq } from "drizzle-orm";
import { Argon2Hasher } from "./auth/argon2-hasher";
import { crearCliente } from "./client";
import { databaseUrl } from "./env";
import { appUser, area, machine, plant, role, ROLES, sensor, reading, userArea } from "./schema/index";
import type { ForjaDb } from "./client";

const NOMBRE_PLANTA = "Planta Demo";
const CONTRASENA_DEV = "Forja123!";
const USUARIOS_DEV: Array<{ email: string; nombre: string; rol: (typeof ROLES)[number] }> = [
  { email: "operador@forja.local", nombre: "Operador Demo", rol: "operador" },
  { email: "supervisor@forja.local", nombre: "Supervisor Demo", rol: "supervisor" },
  { email: "admin@forja.local", nombre: "Admin Demo", rol: "admin" },
];
const NOMBRES_AREAS = ["Ensamble", "Maquinado"] as const;
const MAQUINAS_POR_AREA: Record<(typeof NOMBRES_AREAS)[number], string[]> = {
  Ensamble: ["Línea 1", "Línea 2", "Robot soldador"],
  Maquinado: ["Torno CNC 1", "Fresadora 1"],
};
const DIAS_LECTURAS_SINTETICAS = 7;
const BUCKET_MINUTOS = 15;

export async function seed(db: ForjaDb): Promise<void> {
  await db
    .insert(role)
    .values(ROLES.map((id) => ({ id })))
    .onConflictDoNothing();

  await sembrarUsuariosDev(db);

  const [plantaExistente] = await db
    .select()
    .from(plant)
    .where(eq(plant.nombre, NOMBRE_PLANTA))
    .limit(1);

  const planta =
    plantaExistente ??
    (
      await db.insert(plant).values({ nombre: NOMBRE_PLANTA }).returning()
    )[0];

  if (!planta) {
    throw new Error("No se pudo crear/leer la planta semilla.");
  }

  let areaEnsambleId: string | undefined;

  for (const nombreArea of NOMBRES_AREAS) {
    const [areaExistente] = await db
      .select()
      .from(area)
      .where(and(eq(area.plantId, planta.id), eq(area.nombre, nombreArea)))
      .limit(1);

    const areaActual =
      areaExistente ??
      (
        await db.insert(area).values({ plantId: planta.id, nombre: nombreArea }).returning()
      )[0];

    if (!areaActual) {
      throw new Error(`No se pudo crear/leer el área semilla "${nombreArea}".`);
    }

    if (nombreArea === "Ensamble") {
      areaEnsambleId = areaActual.id;
    }

    for (const nombreMaquina of MAQUINAS_POR_AREA[nombreArea]) {
      const [maquinaExistente] = await db
        .select()
        .from(machine)
        .where(and(eq(machine.areaId, areaActual.id), eq(machine.nombre, nombreMaquina)))
        .limit(1);

      const maquinaActual =
        maquinaExistente ??
        (
          await db
            .insert(machine)
            .values({ areaId: areaActual.id, nombre: nombreMaquina })
            .returning()
        )[0];

      if (!maquinaActual) {
        throw new Error(`No se pudo crear/leer la máquina semilla "${nombreMaquina}".`);
      }

      const sensoresDeMaquina = await db
        .select()
        .from(sensor)
        .where(eq(sensor.machineId, maquinaActual.id));

      if (sensoresDeMaquina.length === 0) {
        const externalIdBase = maquinaActual.nombre.toLowerCase().replace(/\s+/g, "-");
        const nuevosSensores = await db
          .insert(sensor)
          .values([
            {
              machineId: maquinaActual.id,
              externalId: `${externalIdBase}-temp`,
              nombre: "Temperatura",
              unidad: "°C",
              rangoMin: 0,
              rangoMax: 120,
            },
            {
              machineId: maquinaActual.id,
              externalId: `${externalIdBase}-vib`,
              nombre: "Vibración",
              unidad: "mm/s",
              rangoMin: 0,
              rangoMax: 25,
            },
          ])
          .returning();

        await sembrarLecturasSinteticas(db, nuevosSensores);
      }
    }
  }

  if (areaEnsambleId) {
    const [operadorDemo] = await db
      .select()
      .from(appUser)
      .where(eq(appUser.email, "operador@forja.local"))
      .limit(1);

    if (operadorDemo) {
      await db
        .insert(userArea)
        .values({ userId: operadorDemo.id, areaId: areaEnsambleId })
        .onConflictDoNothing();
    }
  }
}

async function sembrarUsuariosDev(db: ForjaDb): Promise<void> {
  const hasher = new Argon2Hasher();
  const passwordHash = await hasher.hash(CONTRASENA_DEV);

  await db
    .insert(appUser)
    .values(
      USUARIOS_DEV.map((u) => ({
        email: u.email,
        nombre: u.nombre,
        roleId: u.rol,
        passwordHash,
      })),
    )
    .onConflictDoNothing({ target: appUser.email });
}

async function sembrarLecturasSinteticas(
  db: ForjaDb,
  sensores: Array<{ id: string; rangoMin: number; rangoMax: number }>,
): Promise<void> {
  const ahora = Date.now();
  const inicio = ahora - DIAS_LECTURAS_SINTETICAS * 24 * 60 * 60 * 1000;
  const pasoMs = BUCKET_MINUTOS * 60 * 1000;

  for (const s of sensores) {
    const rango = s.rangoMax - s.rangoMin;
    const centro = s.rangoMin + rango / 2;
    const amplitud = rango * 0.15;
    const lecturas: Array<{ sensorId: string; ts: Date; value: number }> = [];

    for (let ts = inicio; ts <= ahora; ts += pasoMs) {
      const fase = (ts - inicio) / pasoMs;
      const valor = centro + amplitud * Math.sin(fase / 20) + (Math.random() - 0.5) * amplitud * 0.2;
      lecturas.push({ sensorId: s.id, ts: new Date(ts), value: Number(valor.toFixed(2)) });
    }

    for (let i = 0; i < lecturas.length; i += 1000) {
      await db.insert(reading).values(lecturas.slice(i, i + 1000)).onConflictDoNothing();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { db, cerrar } = crearCliente(databaseUrl());
  seed(db)
    .then(() => {
      console.log(`Seed aplicado. Usuarios de desarrollo (contraseña: ${CONTRASENA_DEV}):`);
      for (const u of USUARIOS_DEV) console.log(`  - ${u.rol}: ${u.email}`);
      return cerrar();
    })
    .then(() => process.exit(0))
    .catch(async (error: unknown) => {
      console.error("Error al aplicar el seed:", error);
      await cerrar();
      process.exit(1);
    });
}
