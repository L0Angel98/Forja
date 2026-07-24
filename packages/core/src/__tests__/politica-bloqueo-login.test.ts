import { describe, expect, it } from "vitest";
import { estaBloqueado, registrarFallo } from "../politica-bloqueo-login";

const T0 = new Date("2026-01-01T00:00:00.000Z");
const segundos = (s: number) => new Date(T0.getTime() + s * 1000);

describe("política de bloqueo de login", () => {
  it("no bloquea antes de alcanzar el umbral de intentos", () => {
    let registro = registrarFallo(null, T0);
    for (let i = 0; i < 3; i++) {
      registro = registrarFallo(registro, segundos(i));
    }
    expect(estaBloqueado(registro, segundos(3))).toBe(false);
  });

  it("bloquea al alcanzar 5 intentos dentro de la ventana de 1 minuto", () => {
    let registro: ReturnType<typeof registrarFallo> | null = null;
    for (let i = 0; i < 5; i++) {
      registro = registrarFallo(registro, segundos(i * 5));
    }
    expect(estaBloqueado(registro, segundos(21))).toBe(true);
  });

  it("no cuenta intentos fuera de la ventana de 1 minuto (resetea el contador)", () => {
    let registro = registrarFallo(null, T0);
    registro = registrarFallo(registro, segundos(120)); // 2 min después: fuera de ventana
    expect(registro.intentosConsecutivos).toBe(1);
    expect(estaBloqueado(registro, segundos(121))).toBe(false);
  });

  it("el bloqueo crece exponencialmente en bloqueos sucesivos", () => {
    let registro: ReturnType<typeof registrarFallo> | null = null;
    // Primer bloqueo: 5 fallos rápidos
    for (let i = 0; i < 5; i++) registro = registrarFallo(registro, segundos(i));
    const finPrimerBloqueo = registro!.bloqueadoHasta!;
    const duracionPrimerBloqueo = finPrimerBloqueo.getTime() - segundos(4).getTime();

    // Tras expirar el primer bloqueo, un segundo grupo de 5 fallos dispara un bloqueo más largo
    const inicioSegundoGrupo = finPrimerBloqueo.getTime() / 1000 + 1;
    for (let i = 0; i < 5; i++) {
      registro = registrarFallo(registro, segundos(inicioSegundoGrupo + i));
    }
    const duracionSegundoBloqueo = registro!.bloqueadoHasta!.getTime() - segundos(inicioSegundoGrupo + 4).getTime();

    expect(duracionSegundoBloqueo).toBeGreaterThan(duracionPrimerBloqueo);
  });

  it("un registro nulo nunca está bloqueado", () => {
    expect(estaBloqueado(null, T0)).toBe(false);
  });
});
