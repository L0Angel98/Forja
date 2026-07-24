import type { ClienteGoogleCalendarApi } from "./cliente-google-calendar";

/** Igual patrón que ProveedorLLMNoConfigurado (spec 12): sin credenciales en env, la escritura/lectura real falla explícito. */
export class ClienteGoogleCalendarNoConfigurado implements ClienteGoogleCalendarApi {
  async crearEvento(): Promise<string> {
    throw new Error(
      "Google Calendar no está configurado: faltan GOOGLE_CALENDAR_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN.",
    );
  }

  async consultarDisponibilidad(): Promise<string> {
    throw new Error(
      "Google Calendar no está configurado: faltan GOOGLE_CALENDAR_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN.",
    );
  }
}
