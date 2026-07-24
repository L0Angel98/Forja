import { describe, expect, it } from "vitest";
import { mapearMensajes } from "../mapear-mensajes";

describe("mapearMensajes", () => {
  it("mapea usuario/agente a user/assistant", () => {
    const resultado = mapearMensajes([
      { rol: "usuario", contenido: "hola" },
      { rol: "agente", contenido: "hola, ¿en qué ayudo?" },
    ]);

    expect(resultado).toEqual([
      { role: "user", content: "hola" },
      { role: "assistant", content: "hola, ¿en qué ayudo?" },
    ]);
  });

  it("pliega un mensaje de herramienta como nota de texto del asistente", () => {
    const resultado = mapearMensajes([
      { rol: "herramienta", contenido: "eco: hola", nombreHerramienta: "eco" },
    ]);

    expect(resultado).toEqual([{ role: "assistant", content: '[resultado de "eco"]: eco: hola' }]);
  });
});
