import { describe, expect, it } from "vitest";
import { formatearCanalSalida, parsearCanalSalida, rolBaseDeRutina } from "../entities/rutina";

describe("rolBaseDeRutina", () => {
  it("traduce cada rol de rutina a su Rol base", () => {
    expect(rolBaseDeRutina("operador-lectura")).toBe("operador");
    expect(rolBaseDeRutina("supervisor-lectura")).toBe("supervisor");
    expect(rolBaseDeRutina("admin-lectura")).toBe("admin");
  });
});

describe("parsearCanalSalida", () => {
  it("parsea ui", () => {
    expect(parsearCanalSalida("ui")).toEqual({ tipo: "ui" });
  });

  it("parsea correo:{grupo}", () => {
    expect(parsearCanalSalida("correo:supervisores")).toEqual({ tipo: "correo", grupo: "supervisores" });
  });

  it("parsea webhook:{url}", () => {
    expect(parsearCanalSalida("webhook:https://ejemplo.com/hook")).toEqual({
      tipo: "webhook",
      url: "https://ejemplo.com/hook",
    });
  });

  it("devuelve null para correo sin grupo", () => {
    expect(parsearCanalSalida("correo:")).toBeNull();
  });

  it("devuelve null para webhook con URL mal formada", () => {
    expect(parsearCanalSalida("webhook:no-es-una-url")).toBeNull();
  });

  it("devuelve null para un canal desconocido", () => {
    expect(parsearCanalSalida("sms:123")).toBeNull();
    expect(parsearCanalSalida("")).toBeNull();
  });
});

describe("formatearCanalSalida", () => {
  it("es el inverso de parsearCanalSalida", () => {
    for (const valor of ["ui", "correo:supervisores", "webhook:https://ejemplo.com/hook"]) {
      const canal = parsearCanalSalida(valor);
      expect(canal).not.toBeNull();
      expect(formatearCanalSalida(canal!)).toBe(valor);
    }
  });
});
