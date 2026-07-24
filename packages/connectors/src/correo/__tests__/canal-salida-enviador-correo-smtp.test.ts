import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanalSalidaEnviadorCorreoSmtp } from "../canal-salida-enviador-correo-smtp";

const ORIGINAL_ENV = { ...process.env };

describe("CanalSalidaEnviadorCorreoSmtp", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("resuelve el grupo a direcciones vía CORREO_GRUPO_<NOMBRE> y envía", async () => {
    process.env["CORREO_GRUPO_SUPERVISORES"] = "sup1@planta.mx, sup2@planta.mx";
    const enviador = { enviar: vi.fn().mockResolvedValue(undefined) };
    const canal = new CanalSalidaEnviadorCorreoSmtp(enviador);

    await canal.enviar({
      canal: { tipo: "correo", grupo: "supervisores" },
      rutinaNombre: "resumen-diario",
      ejecucionId: "e1",
      resultado: "todo bien",
    });

    expect(enviador.enviar).toHaveBeenCalledWith({
      destinatarios: ["sup1@planta.mx", "sup2@planta.mx"],
      asunto: "Forja · rutina resumen-diario",
      cuerpo: "todo bien",
    });
  });

  it("lanza si no hay variable de entorno configurada para el grupo", async () => {
    const enviador = { enviar: vi.fn() };
    const canal = new CanalSalidaEnviadorCorreoSmtp(enviador);

    await expect(
      canal.enviar({
        canal: { tipo: "correo", grupo: "inexistente" },
        rutinaNombre: "x",
        ejecucionId: "e1",
        resultado: "y",
      }),
    ).rejects.toThrow(/CORREO_GRUPO_INEXISTENTE/);
    expect(enviador.enviar).not.toHaveBeenCalled();
  });

  it("ignora canales que no son de tipo correo", async () => {
    const enviador = { enviar: vi.fn() };
    const canal = new CanalSalidaEnviadorCorreoSmtp(enviador);

    await canal.enviar({ canal: { tipo: "ui" }, rutinaNombre: "x", ejecucionId: "e1", resultado: "y" });

    expect(enviador.enviar).not.toHaveBeenCalled();
  });
});
