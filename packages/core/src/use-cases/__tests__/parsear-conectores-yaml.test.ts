import { describe, expect, it } from "vitest";
import { ConectoresYamlInvalido } from "../../errors/conectores-yaml-invalido";
import { ConectoresYamlSecretoInline } from "../../errors/conectores-yaml-secreto-inline";
import { parsearConectoresYaml } from "../parsear-conectores-yaml";

const YAML_VALIDO = `
conectores:
  - nombre: google-calendar
    activo: true
    permisos:
      crear_evento: [supervisor, admin]
      consultar_disponibilidad: [operador, supervisor, admin]
    credenciales:
      client_secret: GOOGLE_CALENDAR_CLIENT_SECRET
      refresh_token: GOOGLE_CALENDAR_REFRESH_TOKEN
  - nombre: webhook
    activo: false
    permisos:
      llamar_webhook: [admin]
    lista_blanca_urls:
      - https://ejemplo.com/hook
`;

describe("parsearConectoresYaml", () => {
  it("parsea un yaml válido con credenciales y lista blanca", () => {
    const conectores = parsearConectoresYaml(YAML_VALIDO);

    expect(conectores).toEqual([
      {
        nombre: "google-calendar",
        activo: true,
        permisos: {
          crear_evento: ["supervisor", "admin"],
          consultar_disponibilidad: ["operador", "supervisor", "admin"],
        },
        credenciales: {
          client_secret: "GOOGLE_CALENDAR_CLIENT_SECRET",
          refresh_token: "GOOGLE_CALENDAR_REFRESH_TOKEN",
        },
        listaBlancaUrls: [],
      },
      {
        nombre: "webhook",
        activo: false,
        permisos: { llamar_webhook: ["admin"] },
        credenciales: {},
        listaBlancaUrls: ["https://ejemplo.com/hook"],
      },
    ]);
  });

  it("un yaml vacío (conectores: []) devuelve una lista vacía", () => {
    expect(parsearConectoresYaml("conectores: []\n")).toEqual([]);
  });

  it("un documento yaml vacío también devuelve una lista vacía", () => {
    expect(parsearConectoresYaml("")).toEqual([]);
  });

  it("rechaza un rol desconocido en permisos", () => {
    const yaml = `
conectores:
  - nombre: x
    activo: true
    permisos:
      alguna_herramienta: [gerente]
`;
    expect(() => parsearConectoresYaml(yaml)).toThrow(ConectoresYamlInvalido);
  });

  it("rechaza nombres de conector duplicados", () => {
    const yaml = `
conectores:
  - nombre: x
    activo: true
    permisos: {}
  - nombre: x
    activo: false
    permisos: {}
`;
    expect(() => parsearConectoresYaml(yaml)).toThrow(ConectoresYamlInvalido);
  });

  it("rechaza una URL inválida en lista_blanca_urls", () => {
    const yaml = `
conectores:
  - nombre: webhook
    activo: true
    permisos: {}
    lista_blanca_urls: ["no-es-una-url"]
`;
    expect(() => parsearConectoresYaml(yaml)).toThrow(ConectoresYamlInvalido);
  });

  it.each([
    ["minúsculas", "un-secreto-cualquiera"],
    ["parece un token real", "sk-proj-AbCdEf123456"],
    ["contiene espacios", "NOMBRE INVALIDO"],
  ])("rechaza una credencial que no parece nombre de variable de entorno: %s", (_caso, valor) => {
    const yaml = `
conectores:
  - nombre: x
    activo: true
    permisos: {}
    credenciales:
      client_secret: "${valor}"
`;
    expect(() => parsearConectoresYaml(yaml)).toThrow(ConectoresYamlSecretoInline);
  });

  it("acepta nombres de variable de entorno válidos como credenciales", () => {
    const yaml = `
conectores:
  - nombre: x
    activo: true
    permisos: {}
    credenciales:
      client_secret: MI_VARIABLE_DE_ENTORNO_123
`;
    expect(() => parsearConectoresYaml(yaml)).not.toThrow();
  });
});
