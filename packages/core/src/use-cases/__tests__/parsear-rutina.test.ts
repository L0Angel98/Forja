import { describe, expect, it } from "vitest";
import { parsearRutina } from "../parsear-rutina";
import { RutinaCanalInvalido } from "../../errors/rutina-canal-invalido";
import { RutinaCronInvalido } from "../../errors/rutina-cron-invalido";
import { RutinaFrecuenciaInvalida } from "../../errors/rutina-frecuencia-invalida";
import { RutinaFrontmatterInvalido } from "../../errors/rutina-frontmatter-invalido";
import { RutinaHerramientaDesconocida } from "../../errors/rutina-herramienta-desconocida";
import { RutinaHerramientaEscrituraNoPermitida } from "../../errors/rutina-herramienta-escritura-no-permitida";
import { RutinaPresupuestoExcedeMaximo } from "../../errors/rutina-presupuesto-excede-maximo";
import { crearCatalogoHerramientasFalso } from "../../testing/fakes";

const PROMPT = "Resume las fallas de las últimas 24 horas por área.";

function construirArchivo(overrides: Partial<Record<string, string>> = {}): string {
  const campos = {
    nombre: "resumen-diario",
    cron: '"0 6 * * *"',
    rol: "supervisor-lectura",
    herramientas: "[consultar_sensores, buscar_documentos]",
    salida: "correo:supervisores",
    presupuesto_tokens: "20000",
    activa: "true",
    ...overrides,
  };
  const frontmatter = Object.entries(campos)
    .map(([clave, valor]) => `${clave}: ${valor}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n${PROMPT}\n`;
}

function construirDeps(overrides: Partial<{ presupuestoMaximoGlobal: number }> = {}) {
  return {
    catalogoHerramientas: crearCatalogoHerramientasFalso({
      consultar_sensores: true,
      buscar_documentos: true,
      proponer_memoria: false,
    }),
    presupuestoMaximoGlobal: overrides.presupuestoMaximoGlobal ?? 50_000,
  };
}

describe("parsearRutina", () => {
  it("parsea una rutina válida", () => {
    const rutina = parsearRutina(construirDeps(), { contenidoArchivo: construirArchivo() });

    expect(rutina).toEqual({
      nombre: "resumen-diario",
      cron: "0 6 * * *",
      rol: "supervisor-lectura",
      herramientas: ["consultar_sensores", "buscar_documentos"],
      salida: { tipo: "correo", grupo: "supervisores" },
      presupuestoTokens: 20000,
      activa: true,
      prompt: PROMPT,
    });
  });

  it("rechaza un archivo sin bloque de frontmatter", () => {
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: "solo texto, sin frontmatter" })).toThrow(
      RutinaFrontmatterInvalido,
    );
  });

  it("rechaza YAML inválido dentro del frontmatter", () => {
    const archivo = "---\nesto: no: es: yaml: valido\n---\nprompt";
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: archivo })).toThrow(RutinaFrontmatterInvalido);
  });

  it("rechaza si falta un campo requerido", () => {
    const archivo = [
      "---",
      "nombre: resumen-diario",
      'cron: "0 6 * * *"',
      "herramientas: [consultar_sensores]",
      "salida: ui",
      "presupuesto_tokens: 20000",
      "activa: true",
      "---",
      PROMPT,
    ].join("\n");
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: archivo })).toThrow(RutinaFrontmatterInvalido);
  });

  it("rechaza un rol fuera del enum cerrado", () => {
    const archivo = construirArchivo({ rol: "supervisor" });
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: archivo })).toThrow(RutinaFrontmatterInvalido);
  });

  it("rechaza una expresión cron sintácticamente inválida", () => {
    const archivo = construirArchivo({ cron: '"no es un cron"' });
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: archivo })).toThrow(RutinaCronInvalido);
  });

  it("rechaza un cron que dispara más seguido que cada 5 minutos", () => {
    const archivo = construirArchivo({ cron: '"* * * * *"' });
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: archivo })).toThrow(RutinaFrecuenciaInvalida);
  });

  it("acepta un cron de exactamente cada 5 minutos (frontera permitida)", () => {
    const archivo = construirArchivo({ cron: '"*/5 * * * *"' });
    const rutina = parsearRutina(construirDeps(), { contenidoArchivo: archivo });
    expect(rutina.cron).toBe("*/5 * * * *");
  });

  it("rechaza una herramienta que no existe en el registry", () => {
    const archivo = construirArchivo({ herramientas: "[herramienta_inventada]" });
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: archivo })).toThrow(RutinaHerramientaDesconocida);
  });

  it("rechaza una herramienta que existe pero puede escribir", () => {
    const archivo = construirArchivo({ herramientas: "[proponer_memoria]" });
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: archivo })).toThrow(
      RutinaHerramientaEscrituraNoPermitida,
    );
  });

  it("rechaza un canal de salida desconocido", () => {
    const archivo = construirArchivo({ salida: "sms:123" });
    expect(() => parsearRutina(construirDeps(), { contenidoArchivo: archivo })).toThrow(RutinaCanalInvalido);
  });

  it("rechaza un presupuesto que excede el máximo global", () => {
    const archivo = construirArchivo({ presupuesto_tokens: "100000" });
    expect(() => parsearRutina(construirDeps({ presupuestoMaximoGlobal: 50_000 }), { contenidoArchivo: archivo })).toThrow(
      RutinaPresupuestoExcedeMaximo,
    );
  });

  it("parsea correctamente el canal webhook", () => {
    const archivo = construirArchivo({ salida: "webhook:https://ejemplo.com/hook" });
    const rutina = parsearRutina(construirDeps(), { contenidoArchivo: archivo });
    expect(rutina.salida).toEqual({ tipo: "webhook", url: "https://ejemplo.com/hook" });
  });

  it("parsea correctamente el canal ui", () => {
    const archivo = construirArchivo({ salida: "ui" });
    const rutina = parsearRutina(construirDeps(), { contenidoArchivo: archivo });
    expect(rutina.salida).toEqual({ tipo: "ui" });
  });

  it("respeta activa: false", () => {
    const archivo = construirArchivo({ activa: "false" });
    const rutina = parsearRutina(construirDeps(), { contenidoArchivo: archivo });
    expect(rutina.activa).toBe(false);
  });
});
