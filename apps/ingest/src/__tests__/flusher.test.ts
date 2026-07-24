import {
  crearRepositorioCuarentenaFalso,
  crearRepositorioEstadoIngestaFalso,
  crearRepositorioLecturasFalso,
  type LecturaCuarentena,
  type LecturaIngerida,
} from "@forja/core";
import { describe, expect, it } from "vitest";
import { BufferCircular } from "../buffer-circular";
import { Flusher } from "../flusher";

const lectura = (segundo: number, value: number): LecturaIngerida => ({
  sensorId: "sensor-1",
  ts: new Date(2026, 0, 1, 10, 0, segundo),
  value,
  fueraDeRango: false,
});

describe("Flusher", () => {
  it("vuelca lecturas y cuarentena, y actualiza el estado de ingesta con lag=0 tras un flush limpio", async () => {
    const lecturasRepo = crearRepositorioLecturasFalso();
    const cuarentenaRepo = crearRepositorioCuarentenaFalso();
    const estadoRepo = crearRepositorioEstadoIngestaFalso();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    bufferLecturas.agregar(lectura(0, 60));
    bufferLecturas.agregar(lectura(1, 61));

    const flusher = new Flusher(
      { lecturas: lecturasRepo, cuarentena: cuarentenaRepo, estadoIngesta: estadoRepo },
      { lecturas: bufferLecturas, cuarentena: bufferCuarentena },
      { flushMaxLecturas: 500 },
      () => new Date(2026, 0, 1, 10, 0, 1),
    );

    await flusher.flush();

    expect(lecturasRepo.lecturas).toHaveLength(2);
    expect(bufferLecturas.tamano).toBe(0);
    expect(estadoRepo.estado).toEqual({
      lagMs: 1000,
      bufferSize: 0,
      actualizadoEn: new Date(2026, 0, 1, 10, 0, 1),
    });
  });

  it("drena en lotes de flushMaxLecturas", async () => {
    const lecturasRepo = crearRepositorioLecturasFalso();
    const llamadas: number[] = [];
    const insertarLoteOriginal = lecturasRepo.insertarLote.bind(lecturasRepo);
    lecturasRepo.insertarLote = async (lote) => {
      llamadas.push(lote.length);
      await insertarLoteOriginal(lote);
    };
    const cuarentenaRepo = crearRepositorioCuarentenaFalso();
    const estadoRepo = crearRepositorioEstadoIngestaFalso();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    for (let i = 0; i < 5; i++) bufferLecturas.agregar(lectura(i, i));

    const flusher = new Flusher(
      { lecturas: lecturasRepo, cuarentena: cuarentenaRepo, estadoIngesta: estadoRepo },
      { lecturas: bufferLecturas, cuarentena: bufferCuarentena },
      { flushMaxLecturas: 2 },
    );

    await flusher.flush();

    expect(llamadas).toEqual([2, 2, 1]);
    expect(lecturasRepo.lecturas).toHaveLength(5);
  });

  it("si insertarLote falla, reinserta el lote al frente del buffer y propaga el error", async () => {
    const lecturasRepo = crearRepositorioLecturasFalso();
    lecturasRepo.insertarLote = () => Promise.reject(new Error("db caída"));
    const cuarentenaRepo = crearRepositorioCuarentenaFalso();
    const estadoRepo = crearRepositorioEstadoIngestaFalso();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    bufferLecturas.agregar(lectura(0, 60));
    bufferLecturas.agregar(lectura(1, 61));

    const flusher = new Flusher(
      { lecturas: lecturasRepo, cuarentena: cuarentenaRepo, estadoIngesta: estadoRepo },
      { lecturas: bufferLecturas, cuarentena: bufferCuarentena },
      { flushMaxLecturas: 500 },
    );

    await expect(flusher.flush()).rejects.toThrow("db caída");

    expect(bufferLecturas.tamano).toBe(2);
    expect(estadoRepo.estado).toBeNull();
  });

  it("una llamada a flush() en curso ignora invocaciones concurrentes (guard enVuelo)", async () => {
    const lecturasRepo = crearRepositorioLecturasFalso();
    let resolverInsercion!: () => void;
    lecturasRepo.insertarLote = async (lote) => {
      await new Promise<void>((resolve) => {
        resolverInsercion = resolve;
      });
      lecturasRepo.lecturas.push(...lote);
    };
    const cuarentenaRepo = crearRepositorioCuarentenaFalso();
    const estadoRepo = crearRepositorioEstadoIngestaFalso();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    bufferLecturas.agregar(lectura(0, 60));

    const flusher = new Flusher(
      { lecturas: lecturasRepo, cuarentena: cuarentenaRepo, estadoIngesta: estadoRepo },
      { lecturas: bufferLecturas, cuarentena: bufferCuarentena },
      { flushMaxLecturas: 500 },
    );

    const primeraLlamada = flusher.flush();
    const segundaLlamada = flusher.flush();

    resolverInsercion();
    await Promise.all([primeraLlamada, segundaLlamada]);

    expect(lecturasRepo.lecturas).toHaveLength(1);
  });
});
