import { describe, expect, it } from "vitest";
import { BusEventos } from "../bus-eventos";

describe("BusEventos", () => {
  it("entrega el evento a todos los manejadores suscritos, en orden", async () => {
    const bus = new BusEventos();
    const llamadas: string[] = [];
    bus.suscribir<{ valor: number }>("prueba", (e) => {
      llamadas.push(`primero:${e.valor}`);
    });
    bus.suscribir<{ valor: number }>("prueba", async (e) => {
      llamadas.push(`segundo:${e.valor}`);
    });

    await bus.publicar("prueba", { valor: 1 });

    expect(llamadas).toEqual(["primero:1", "segundo:1"]);
  });

  it("un tipo sin suscriptores no falla", async () => {
    const bus = new BusEventos();
    await expect(bus.publicar("nadie-escucha", {})).resolves.toBeUndefined();
  });

  it("no mezcla manejadores de distintos tipos de evento", async () => {
    const bus = new BusEventos();
    const llamadas: string[] = [];
    bus.suscribir("a", () => {
      llamadas.push("a");
    });
    bus.suscribir("b", () => {
      llamadas.push("b");
    });

    await bus.publicar("a", {});

    expect(llamadas).toEqual(["a"]);
  });
});
