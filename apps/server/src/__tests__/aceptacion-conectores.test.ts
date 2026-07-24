import type { BorradorAccionConector, ConectorConfigurado, Herramienta, Usuario } from "@forja/core";
import { confirmarAccionConector, crearRegistradorTraceFalso, parsearConectoresYaml } from "@forja/core";
import {
  CONSTRUCTORES_CONECTORES_INTEGRADOS,
  crearConectores,
  crearServidorGoogleCalendar,
  NOMBRE_CONECTOR_GOOGLE_CALENDAR,
  type ClienteGoogleCalendarApi,
} from "@forja/connectors";
import { RegistroHerramientas } from "@forja/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const supervisor: Usuario = {
  id: "usuario-sup",
  email: "sup@planta.mx",
  passwordHash: "x",
  nombre: "Supervisor",
  rol: "supervisor",
  activo: true,
};

const YAML_GOOGLE_CALENDAR = `
conectores:
  - nombre: google-calendar
    activo: true
    permisos:
      crear_evento: [supervisor, admin]
      consultar_disponibilidad: [operador, supervisor, admin]
`;

/**
 * Tests de aceptación de spec 17 que necesitan tanto @forja/runtime
 * (RegistroHerramientas real) como @forja/connectors (Factory + servidores
 * MCP reales) a la vez — solo apps/server puede importar ambos, así que
 * viven aquí en vez de en cualquiera de los dos paquetes.
 *
 * El cuarto criterio de aceptación de la spec ("manifiesto inválido y
 * secreto inline en yaml rechazados con error visible") ya quedó cubierto
 * a nivel unitario por validar-manifiesto-conector.test.ts y
 * parsear-conectores-yaml.test.ts (@forja/core) — no se duplica aquí.
 */
describe("aceptación spec 17", () => {
  let cerrarConectores: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await cerrarConectores?.();
    cerrarConectores = undefined;
  });

  it("flujo proponer -> confirmar -> evento creado, con Calendar mockeado (servidor MCP de prueba)", async () => {
    // "Aprobar" un borrador de mantenimiento es un flujo de spec 13 (reporte de fallas),
    // fuera de alcance de spec 17: este test arranca en "el agente propone el evento".
    const clienteCalendarioFalso: ClienteGoogleCalendarApi = {
      crearEvento: vi.fn().mockResolvedValue("Evento creado: evt-789"),
      consultarDisponibilidad: vi.fn(),
    };
    // Servidor MCP real de google-calendar (protocolo real, spec 17); solo se mockea
    // el adaptador terminal hacia la Google Calendar API real, que no es alcanzable aquí.
    const constructores = {
      ...CONSTRUCTORES_CONECTORES_INTEGRADOS,
      [NOMBRE_CONECTOR_GOOGLE_CALENDAR]: () => crearServidorGoogleCalendar(clienteCalendarioFalso),
    };

    const configuraciones = parsearConectoresYaml(YAML_GOOGLE_CALENDAR);
    const resultado = await crearConectores(configuraciones, constructores);
    cerrarConectores = () => resultado.cerrarTodos();

    const registro = new RegistroHerramientas();
    for (const herramienta of resultado.herramientas) registro.registrar(herramienta);

    // El agente propone: obtiene un borrador de la acción, sin llamar a Calendar todavía.
    const herramientaCrearEvento = registro.buscarDisponiblePara("crear_evento", "supervisor");
    expect(herramientaCrearEvento).toBeDefined();
    const borrador = (await herramientaCrearEvento!.execute(
      {
        titulo: "Mantenimiento torno 3",
        inicio: "2026-08-01T09:00:00.000Z",
        fin: "2026-08-01T10:00:00.000Z",
        invitados: ["tecnico@planta.mx"],
      },
      { usuario: supervisor, plantId: "planta-1", traceId: "t1" },
    )) as BorradorAccionConector;

    expect(clienteCalendarioFalso.crearEvento).not.toHaveBeenCalled();
    expect(borrador).toEqual({
      conector: "google-calendar",
      herramienta: "crear_evento",
      parametros: expect.objectContaining({ titulo: "Mantenimiento torno 3" }),
    });

    // El supervisor confirma con un click real: recién ahí se invoca el conector de verdad.
    const trace = crearRegistradorTraceFalso();
    const respuesta = await confirmarAccionConector(
      { registro: resultado.registro, trace },
      {
        usuario: supervisor,
        plantId: "planta-1",
        conector: borrador.conector,
        herramienta: borrador.herramienta,
        parametros: borrador.parametros,
      },
    );

    expect(respuesta).toBe("Evento creado: evt-789");
    expect(clienteCalendarioFalso.crearEvento).toHaveBeenCalledTimes(1);
    expect(trace.turnos[0]).toMatchObject({ origen: "conector-confirmacion/google-calendar", exitoso: true });
  });

  it("un operador nunca ve las herramientas de escritura de conectores (contrato del registry)", async () => {
    const clienteCalendarioFalso: ClienteGoogleCalendarApi = {
      crearEvento: vi.fn(),
      consultarDisponibilidad: vi.fn().mockResolvedValue("Sin conflictos."),
    };
    const constructores = {
      ...CONSTRUCTORES_CONECTORES_INTEGRADOS,
      [NOMBRE_CONECTOR_GOOGLE_CALENDAR]: () => crearServidorGoogleCalendar(clienteCalendarioFalso),
    };

    const configuraciones = parsearConectoresYaml(YAML_GOOGLE_CALENDAR);
    const resultado = await crearConectores(configuraciones, constructores);
    cerrarConectores = () => resultado.cerrarTodos();

    const registro = new RegistroHerramientas();
    for (const herramienta of resultado.herramientas) registro.registrar(herramienta);

    const nombresOperador = registro.disponiblesPara("operador").map((h) => h.nombre);

    expect(nombresOperador).toContain("consultar_disponibilidad");
    expect(nombresOperador).not.toContain("crear_evento");
  });

  it("un conector caído no afecta las herramientas de chat/fallas/rutinas ya registradas", async () => {
    const registro = new RegistroHerramientas();
    const herramientaChat: Herramienta = {
      nombre: "consultar_fallas",
      descripcion: "Consulta fallas reportadas.",
      rolesPermitidos: ["operador", "supervisor", "admin"],
      soloLectura: true,
      schema: z.object({}),
      async execute() {
        return "sin fallas abiertas";
      },
    };
    registro.registrar(herramientaChat);

    const constructoresConUnoRoto = {
      roto: () => {
        throw new Error("conector roto");
      },
    };
    const configuraciones: ConectorConfigurado[] = [
      { nombre: "roto", activo: true, permisos: { algo: ["admin"] }, credenciales: {}, listaBlancaUrls: [] },
    ];

    const resultado = await crearConectores(configuraciones, constructoresConUnoRoto);
    cerrarConectores = () => resultado.cerrarTodos();

    expect(resultado.estados).toEqual([{ nombre: "roto", estado: "no_disponible", error: "conector roto" }]);
    expect(resultado.herramientas).toEqual([]);
    // chat/fallas/rutinas: la herramienta ya registrada antes de cargar conectores sigue intacta.
    expect(registro.buscarDisponiblePara("consultar_fallas", "operador")?.nombre).toBe("consultar_fallas");
    expect(registro.disponiblesParaRutina(["consultar_fallas"]).map((h) => h.nombre)).toEqual(["consultar_fallas"]);
  });
});
