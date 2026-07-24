import { describe, expect, it } from "vitest";
import { BufferCircular } from "../buffer-circular";

describe("BufferCircular", () => {
  it("agrega y extrae en orden FIFO", () => {
    const buffer = new BufferCircular<number>(10);
    buffer.agregar(1);
    buffer.agregar(2);
    buffer.agregar(3);

    expect(buffer.tamano).toBe(3);
    expect(buffer.primero()).toBe(1);
    expect(buffer.extraerHasta(2)).toEqual([1, 2]);
    expect(buffer.tamano).toBe(1);
  });

  it("descarta lo más antiguo al superar la capacidad (drop-oldest)", () => {
    const buffer = new BufferCircular<number>(3);
    buffer.agregar(1);
    buffer.agregar(2);
    buffer.agregar(3);
    buffer.agregar(4);

    expect(buffer.tamano).toBe(3);
    expect(buffer.extraerHasta(10)).toEqual([2, 3, 4]);
  });

  it("devolverAlFrente reinserta un lote no persistido antes de lo que ya estaba", () => {
    const buffer = new BufferCircular<number>(10);
    buffer.agregar(3);
    buffer.agregar(4);
    buffer.devolverAlFrente([1, 2]);

    expect(buffer.extraerHasta(10)).toEqual([1, 2, 3, 4]);
  });

  it("primero() devuelve undefined si está vacío", () => {
    const buffer = new BufferCircular<number>(10);
    expect(buffer.primero()).toBeUndefined();
  });
});
