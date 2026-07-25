import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usarColaOffline } from "../usar-cola-offline";

function definirEnLinea(enLinea: boolean): void {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: enLinea });
}

function borrarBaseDeDatos(): Promise<void> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.deleteDatabase("forja-cola-offline");
    solicitud.onsuccess = () => resolve();
    solicitud.onerror = () => reject(solicitud.error as Error);
  });
}

beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn());
  definirEnLinea(true);
  await borrarBaseDeDatos();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usarColaOffline (spec 02-interfaz: reconexión sincroniza sin duplicar, con backoff)", () => {
  it("encolar agrega el reporte a pendientes de inmediato", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ fallas: [] }), { status: 200 }));

    const { result } = renderHook(() => usarColaOffline());

    await act(async () => {
      await result.current.encolar({ machineId: "PRE-03" });
    });

    expect(result.current.pendientes).toHaveLength(1);
  });

  it("al reconectar, envía el pendiente una sola vez y lo quita de la cola", async () => {
    definirEnLinea(false);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ reporte: {} }), { status: 201 }));

    const { result } = renderHook(() => usarColaOffline());

    await act(async () => {
      await result.current.encolar({ machineId: "PRE-03" });
    });
    expect(result.current.pendientes).toHaveLength(1);

    definirEnLinea(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.pendientes).toHaveLength(0));

    const llamadasAFallas = vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/fallas");
    expect(llamadasAFallas).toHaveLength(1);
  });

  it(
    "si el reenvío falla, reintenta con backoff en vez de quedarse atorado",
    async () => {
      definirEnLinea(false);
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response("error", { status: 503 }))
        .mockResolvedValue(new Response(JSON.stringify({ reporte: {} }), { status: 201 }));

      const { result } = renderHook(() => usarColaOffline());

      await act(async () => {
        await result.current.encolar({ machineId: "PRE-03" });
      });

      definirEnLinea(true);
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });

      // El primer intento falla (503); el reintento con backoff (≥2s) debe
      // eventualmente vaciar la cola sin que nadie tenga que recargar la página.
      await waitFor(() => expect(result.current.pendientes).toHaveLength(0), { timeout: 8_000 });
    },
    10_000,
  );
});
