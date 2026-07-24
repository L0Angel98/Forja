import type { RegistroIntentos } from "./ports/repositorio-intentos-login";
import {
  RATE_LIMIT_BLOQUEO_BASE_MS,
  RATE_LIMIT_BLOQUEO_MAXIMO_MS,
  RATE_LIMIT_INTENTOS_MAXIMOS,
  RATE_LIMIT_VENTANA_MS,
} from "./config/sesion";

export function estaBloqueado(registro: RegistroIntentos | null, ahora: Date): boolean {
  return registro?.bloqueadoHasta != null && registro.bloqueadoHasta.getTime() > ahora.getTime();
}

export function registrarFallo(registro: RegistroIntentos | null, ahora: Date): RegistroIntentos {
  const dentroDeVentana =
    registro !== null && ahora.getTime() - registro.ultimoIntentoEn.getTime() <= RATE_LIMIT_VENTANA_MS;
  const intentosConsecutivos = dentroDeVentana ? registro.intentosConsecutivos + 1 : 1;
  const vecesBloqueado = registro?.vecesBloqueado ?? 0;

  if (intentosConsecutivos >= RATE_LIMIT_INTENTOS_MAXIMOS) {
    const duracionBloqueo = Math.min(
      RATE_LIMIT_BLOQUEO_BASE_MS * 2 ** vecesBloqueado,
      RATE_LIMIT_BLOQUEO_MAXIMO_MS,
    );
    return {
      intentosConsecutivos: 0,
      bloqueadoHasta: new Date(ahora.getTime() + duracionBloqueo),
      vecesBloqueado: vecesBloqueado + 1,
      ultimoIntentoEn: ahora,
    };
  }

  return {
    intentosConsecutivos,
    bloqueadoHasta: registro?.bloqueadoHasta ?? null,
    vecesBloqueado,
    ultimoIntentoEn: ahora,
  };
}
