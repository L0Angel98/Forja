import { crearRepositorioCatalogoSensoresFalso, type SensorCatalogo } from "@forja/core";
import { describe, expect, it, vi } from "vitest";
import { CacheCatalogoSensores } from "../catalogo-cache";

const sensorTemp: SensorCatalogo = {
  id: "sensor-1",
  externalId: "prensa-temp-1",
  machineId: "maquina-1",
  nombre: "Temperatura",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 200,
  mudoTrasMinutos: 60,
};

describe("CacheCatalogoSensores", () => {
  it("refrescar() indexa el catálogo por external_id", async () => {
    const repo = crearRepositorioCatalogoSensoresFalso([sensorTemp]);
    const cache = new CacheCatalogoSensores(repo);

    expect(cache.buscarPorExternalId("prensa-temp-1")).toBeNull();

    await cache.refrescar();

    expect(cache.buscarPorExternalId("prensa-temp-1")).toEqual(sensorTemp);
    expect(cache.buscarPorExternalId("desconocido")).toBeNull();
  });

  it("iniciarRefrescoPeriodico refresca en cada tick y detiene con el cleanup", async () => {
    vi.useFakeTimers();
    try {
      const repo = crearRepositorioCatalogoSensoresFalso([]);
      const cache = new CacheCatalogoSensores(repo);
      const detener = cache.iniciarRefrescoPeriodico(1000);

      repo.sensores.set(sensorTemp.id, sensorTemp);
      await vi.advanceTimersByTimeAsync(1000);
      expect(cache.buscarPorExternalId("prensa-temp-1")).toEqual(sensorTemp);

      detener();
      repo.sensores.clear();
      await vi.advanceTimersByTimeAsync(5000);
      expect(cache.buscarPorExternalId("prensa-temp-1")).toEqual(sensorTemp);
    } finally {
      vi.useRealTimers();
    }
  });

  it("iniciarRefrescoPeriodico registra el error si el refresco falla, sin detener el ciclo", async () => {
    vi.useFakeTimers();
    try {
      const repo = crearRepositorioCatalogoSensoresFalso([]);
      repo.listar = () => Promise.reject(new Error("db caída"));
      const cache = new CacheCatalogoSensores(repo);
      const logger = { error: vi.fn() };

      cache.iniciarRefrescoPeriodico(1000, logger);
      await vi.advanceTimersByTimeAsync(1000);

      expect(logger.error).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
