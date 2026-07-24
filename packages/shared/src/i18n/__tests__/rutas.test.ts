import { describe, expect, it } from "vitest";
import { crearT } from "../rutas";

const diccionario = {
  comun: { cargando: "Cargando…", confirmar: "Confirmar" },
  severidad: { nivel1: "Baja" },
} as const;

describe("crearT", () => {
  it("resuelve una ruta anidada válida", () => {
    const t = crearT(diccionario);
    expect(t("comun.cargando")).toBe("Cargando…");
    expect(t("severidad.nivel1")).toBe("Baja");
  });

  it("resuelve distintas claves de la misma sección de forma independiente", () => {
    const t = crearT(diccionario);
    expect(t("comun.confirmar")).toBe("Confirmar");
  });
});
