import { describe, expect, it } from "vitest";
import { PorTamanoFijo } from "../por-tamano-fijo";

describe("PorTamanoFijo", () => {
  it("no genera chunks para texto vacío", () => {
    const estrategia = new PorTamanoFijo();
    expect(estrategia.trocear({ texto: "   ", totalPaginas: null, paginas: null })).toEqual([]);
  });

  it("un texto corto produce un solo chunk", () => {
    const estrategia = new PorTamanoFijo();
    const chunks = estrategia.trocear({ texto: "Este es un texto corto.", totalPaginas: null, paginas: null });

    expect(chunks).toEqual([{ contenido: "Este es un texto corto.", seccion: null, pagina: null }]);
  });

  it("un texto largo se divide en varios chunks con solapamiento", () => {
    const estrategia = new PorTamanoFijo();
    const texto = "a".repeat(3200);

    const chunks = estrategia.trocear({ texto, totalPaginas: null, paginas: null });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.contenido.length).toBeGreaterThan(0);
      expect(chunk.pagina).toBeNull();
    }
  });

  it("cuando hay texto por página, trocea página por página y conserva el número de página", () => {
    const estrategia = new PorTamanoFijo();

    const chunks = estrategia.trocear({
      texto: "irrelevante",
      totalPaginas: 2,
      paginas: ["contenido de la página uno", "contenido de la página dos"],
    });

    expect(chunks).toEqual([
      { contenido: "contenido de la página uno", seccion: null, pagina: 1 },
      { contenido: "contenido de la página dos", seccion: null, pagina: 2 },
    ]);
  });

  it("ignora páginas vacías", () => {
    const estrategia = new PorTamanoFijo();

    const chunks = estrategia.trocear({ texto: "", totalPaginas: 2, paginas: ["contenido", "   "] });

    expect(chunks).toEqual([{ contenido: "contenido", seccion: null, pagina: 1 }]);
  });
});
