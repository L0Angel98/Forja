import { describe, expect, it } from "vitest";
import { PorEncabezados } from "../por-encabezados";

describe("PorEncabezados", () => {
  it("agrupa el contenido bajo cada encabezado", () => {
    const estrategia = new PorEncabezados();
    const texto = [
      "# Introducción",
      "Este manual describe el mantenimiento del torno.",
      "",
      "## Mantenimiento diario",
      "Revisar el nivel de aceite.",
      "",
      "## Mantenimiento semanal",
      "Limpiar los filtros.",
    ].join("\n");

    const chunks = estrategia.trocear({ texto, totalPaginas: null, paginas: null });

    expect(chunks).toEqual([
      { contenido: "Este manual describe el mantenimiento del torno.", seccion: "Introducción", pagina: null },
      { contenido: "Revisar el nivel de aceite.", seccion: "Mantenimiento diario", pagina: null },
      { contenido: "Limpiar los filtros.", seccion: "Mantenimiento semanal", pagina: null },
    ]);
  });

  it("el contenido antes del primer encabezado no tiene sección", () => {
    const estrategia = new PorEncabezados();
    const texto = "Preámbulo sin título.\n\n# Primer encabezado\nContenido.";

    const chunks = estrategia.trocear({ texto, totalPaginas: null, paginas: null });

    expect(chunks[0]).toEqual({ contenido: "Preámbulo sin título.", seccion: null, pagina: null });
    expect(chunks[1]).toEqual({ contenido: "Contenido.", seccion: "Primer encabezado", pagina: null });
  });

  it("sin ningún encabezado, produce un único chunk con sección nula", () => {
    const estrategia = new PorEncabezados();

    const chunks = estrategia.trocear({ texto: "Texto plano sin estructura.", totalPaginas: null, paginas: null });

    expect(chunks).toEqual([{ contenido: "Texto plano sin estructura.", seccion: null, pagina: null }]);
  });

  it("subdivide una sección que supera el máximo de caracteres, conservando el título", () => {
    const estrategia = new PorEncabezados();
    const texto = `# Sección larga\n${"a".repeat(3000)}`;

    const chunks = estrategia.trocear({ texto, totalPaginas: null, paginas: null });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.seccion).toBe("Sección larga");
    }
  });

  it("no genera chunks para texto vacío", () => {
    const estrategia = new PorEncabezados();
    expect(estrategia.trocear({ texto: "   ", totalPaginas: null, paginas: null })).toEqual([]);
  });
});
