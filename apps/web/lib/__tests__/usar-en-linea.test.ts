import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usarEnLinea } from "../usar-en-linea";

function definirEnLinea(enLinea: boolean): void {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: enLinea });
}

afterEach(() => {
  definirEnLinea(true);
});

describe("usarEnLinea", () => {
  it("refleja navigator.onLine al montar", () => {
    definirEnLinea(false);
    const { result } = renderHook(() => usarEnLinea());
    expect(result.current).toBe(false);
  });

  it("se actualiza con los eventos online/offline", () => {
    definirEnLinea(true);
    const { result } = renderHook(() => usarEnLinea());
    expect(result.current).toBe(true);

    act(() => {
      definirEnLinea(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      definirEnLinea(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
