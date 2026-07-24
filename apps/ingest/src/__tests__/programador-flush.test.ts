import { describe, expect, it, vi } from "vitest";
import { iniciarProgramadorFlush } from "../programador-flush";

describe("iniciarProgramadorFlush", () => {
  it("llama flush() cada intervaloMs mientras no falle", async () => {
    vi.useFakeTimers();
    try {
      const flush = vi.fn().mockResolvedValue(undefined);
      const detener = iniciarProgramadorFlush(
        { flush } as never,
        { intervaloMs: 1000, backoffInicialMs: 500, backoffMaximoMs: 8000 },
        { error: vi.fn() },
      );

      await vi.advanceTimersByTimeAsync(3500);
      expect(flush).toHaveBeenCalledTimes(3);

      detener();
      await vi.advanceTimersByTimeAsync(5000);
      expect(flush).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ante un fallo reintenta con backoff exponencial acotado a backoffMaximoMs", async () => {
    vi.useFakeTimers();
    try {
      const flush = vi.fn().mockRejectedValue(new Error("db caída"));
      const logger = { error: vi.fn() };
      const detener = iniciarProgramadorFlush(
        { flush } as never,
        { intervaloMs: 1000, backoffInicialMs: 1000, backoffMaximoMs: 4000 },
        logger,
      );

      await vi.advanceTimersByTimeAsync(1000);
      expect(flush).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(flush).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2000);
      expect(flush).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(4000);
      expect(flush).toHaveBeenCalledTimes(4);

      expect(logger.error).toHaveBeenCalledTimes(4);
      detener();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tras un fallo, un flush exitoso restablece el intervalo normal", async () => {
    vi.useFakeTimers();
    try {
      const flush = vi.fn().mockRejectedValueOnce(new Error("db caída")).mockResolvedValue(undefined);
      const detener = iniciarProgramadorFlush(
        { flush } as never,
        { intervaloMs: 1000, backoffInicialMs: 1000, backoffMaximoMs: 8000 },
        { error: vi.fn() },
      );

      await vi.advanceTimersByTimeAsync(1000);
      expect(flush).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(flush).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1000);
      expect(flush).toHaveBeenCalledTimes(3);

      detener();
    } finally {
      vi.useRealTimers();
    }
  });
});
