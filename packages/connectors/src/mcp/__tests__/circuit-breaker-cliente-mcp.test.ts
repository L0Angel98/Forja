import { ConectorNoDisponible } from "@forja/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitBreakerClienteMcp } from "../circuit-breaker-cliente-mcp";

function clienteFalso(overrides: { invocar?: ReturnType<typeof vi.fn> } = {}) {
  return {
    listarHerramientas: vi.fn().mockResolvedValue([]),
    invocar: overrides.invocar ?? vi.fn().mockResolvedValue("ok"),
    cerrar: vi.fn().mockResolvedValue(undefined),
  };
}

describe("CircuitBreakerClienteMcp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delega directamente mientras no haya fallos", async () => {
    const interno = clienteFalso();
    const breaker = new CircuitBreakerClienteMcp("google-calendar", interno);

    const resultado = await breaker.invocar("crear_evento", {});

    expect(resultado).toBe("ok");
    expect(interno.invocar).toHaveBeenCalledTimes(1);
  });

  it("tras 4 fallos seguidos sigue delegando (aún no abre el circuito)", async () => {
    const invocar = vi.fn().mockRejectedValue(new Error("boom"));
    const interno = clienteFalso({ invocar });
    const breaker = new CircuitBreakerClienteMcp("google-calendar", interno);

    for (let i = 0; i < 4; i++) {
      await expect(breaker.invocar("crear_evento", {})).rejects.toThrow("boom");
    }

    expect(invocar).toHaveBeenCalledTimes(4);
  });

  it("al quinto fallo seguido abre el circuito: la siguiente llamada falla rápido sin tocar el cliente interno", async () => {
    const invocar = vi.fn().mockRejectedValue(new Error("boom"));
    const interno = clienteFalso({ invocar });
    const breaker = new CircuitBreakerClienteMcp("google-calendar", interno);

    for (let i = 0; i < 5; i++) {
      await expect(breaker.invocar("crear_evento", {})).rejects.toThrow();
    }
    expect(invocar).toHaveBeenCalledTimes(5);

    await expect(breaker.invocar("crear_evento", {})).rejects.toThrow(ConectorNoDisponible);
    expect(invocar).toHaveBeenCalledTimes(5);
  });

  it("un éxito resetea el contador de fallos consecutivos", async () => {
    const invocar = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok")
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"));
    const interno = clienteFalso({ invocar });
    const breaker = new CircuitBreakerClienteMcp("google-calendar", interno);

    await expect(breaker.invocar("x", {})).rejects.toThrow();
    await expect(breaker.invocar("x", {})).rejects.toThrow();
    await expect(breaker.invocar("x", {})).resolves.toBe("ok");
    await expect(breaker.invocar("x", {})).rejects.toThrow();
    await expect(breaker.invocar("x", {})).rejects.toThrow();
    await expect(breaker.invocar("x", {})).rejects.toThrow();

    // 6 llamadas reales: el éxito de en medio cortó la racha, así que el circuito sigue cerrado.
    expect(invocar).toHaveBeenCalledTimes(6);
  });

  it("tras 5 minutos con el circuito abierto, permite un intento (medio-abierto) y lo cierra si tiene éxito", async () => {
    const invocar = vi.fn().mockRejectedValue(new Error("boom"));
    const interno = clienteFalso({ invocar });
    const breaker = new CircuitBreakerClienteMcp("google-calendar", interno);

    for (let i = 0; i < 5; i++) await expect(breaker.invocar("x", {})).rejects.toThrow();
    await expect(breaker.invocar("x", {})).rejects.toThrow(ConectorNoDisponible);

    invocar.mockResolvedValueOnce("recuperado");
    vi.setSystemTime(new Date("2026-01-01T00:05:00.001Z"));
    await expect(breaker.invocar("x", {})).resolves.toBe("recuperado");
    expect(invocar).toHaveBeenCalledTimes(6);

    // el circuito quedó cerrado y el contador reseteado: un solo fallo nuevo no lo reabre
    // (si estuviera abierto, esta llamada fallaría con ConectorNoDisponible sin tocar el cliente interno).
    invocar.mockRejectedValueOnce(new Error("boom-otra-vez"));
    await expect(breaker.invocar("x", {})).rejects.toThrow("boom-otra-vez");
    expect(invocar).toHaveBeenCalledTimes(7);
  });

  it("si el intento medio-abierto falla, el circuito se reabre de inmediato", async () => {
    const invocar = vi.fn().mockRejectedValue(new Error("boom"));
    const interno = clienteFalso({ invocar });
    const breaker = new CircuitBreakerClienteMcp("google-calendar", interno);

    for (let i = 0; i < 5; i++) await expect(breaker.invocar("x", {})).rejects.toThrow();
    await expect(breaker.invocar("x", {})).rejects.toThrow(ConectorNoDisponible);

    vi.setSystemTime(new Date("2026-01-01T00:05:00.001Z"));
    await expect(breaker.invocar("x", {})).rejects.toThrow("boom");
    expect(invocar).toHaveBeenCalledTimes(6);

    // el intento medio-abierto falló: el circuito se reabre sin esperar 5 fallos más.
    await expect(breaker.invocar("x", {})).rejects.toThrow(ConectorNoDisponible);
    expect(invocar).toHaveBeenCalledTimes(6);
  });

  it("una operación que no responde en 10s se cuenta como fallo (timeout)", async () => {
    const invocar = vi.fn().mockReturnValue(new Promise(() => {}));
    const interno = clienteFalso({ invocar });
    const breaker = new CircuitBreakerClienteMcp("google-calendar", interno);

    const promesa = breaker.invocar("x", {});
    const expectativa = expect(promesa).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(10_000);
    await expectativa;
  });

  it("cerrar() delega en el cliente interno", async () => {
    const interno = clienteFalso();
    const breaker = new CircuitBreakerClienteMcp("google-calendar", interno);

    await breaker.cerrar();

    expect(interno.cerrar).toHaveBeenCalledTimes(1);
  });
});
