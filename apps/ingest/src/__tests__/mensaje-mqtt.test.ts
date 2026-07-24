import { describe, expect, it } from "vitest";
import { analizarPayload, analizarTopico } from "../mensaje-mqtt";

describe("analizarTopico", () => {
  it("extrae plantId y sensorExternalId de forja/{plantId}/{sensorExternalId}", () => {
    expect(analizarTopico("forja/planta-1/prensa-temp-1")).toEqual({
      plantId: "planta-1",
      sensorExternalId: "prensa-temp-1",
    });
  });

  it("devuelve null si el tópico no tiene el formato esperado", () => {
    expect(analizarTopico("otro/formato")).toBeNull();
    expect(analizarTopico("forja/solo-una-parte")).toBeNull();
    expect(analizarTopico("forja/a/b/c")).toBeNull();
    expect(analizarTopico("$SYS/broker/heartbeat")).toBeNull();
  });
});

describe("analizarPayload", () => {
  it("parsea { ts, value } válido", () => {
    const resultado = analizarPayload('{"ts":"2026-01-01T10:00:00.000Z","value":60}');
    expect(resultado).toEqual({ ts: new Date("2026-01-01T10:00:00.000Z"), value: 60 });
  });

  it("acepta ts numérico (epoch ms)", () => {
    const epoch = Date.parse("2026-01-01T10:00:00.000Z");
    const resultado = analizarPayload(`{"ts":${epoch},"value":60}`);
    expect(resultado?.ts).toEqual(new Date(epoch));
  });

  it("devuelve null ante JSON inválido", () => {
    expect(analizarPayload("no es json")).toBeNull();
  });

  it("devuelve null si falta ts o no es parseable", () => {
    expect(analizarPayload('{"value":60}')).toBeNull();
    expect(analizarPayload('{"ts":"no-es-fecha","value":60}')).toBeNull();
  });

  it("conserva value tal cual (incluyendo valores no numéricos, que se clasifican después)", () => {
    const resultado = analizarPayload('{"ts":"2026-01-01T10:00:00.000Z","value":"abc"}');
    expect(resultado?.value).toBe("abc");
  });
});
