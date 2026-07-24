import type {
  ClienteGoogleCalendarApi,
  ParametrosConsultarDisponibilidad,
  ParametrosCrearEventoCalendario,
} from "./cliente-google-calendar";

const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_EVENTOS = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const URL_FREEBUSY = "https://www.googleapis.com/calendar/v3/freeBusy";

export interface CredencialesGoogleCalendar {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
}

/**
 * Cliente real de la Google Calendar API v3 vía fetch (sin SDK de Google:
 * solo dos endpoints REST + refresh de OAuth2). Pide un access token nuevo
 * en cada llamada en vez de cachearlo — más simple y suficiente para el
 * volumen de uso de estas herramientas (una escritura confirmada por un
 * humano no es una ruta de alta frecuencia).
 */
export class ClienteGoogleCalendarOAuth implements ClienteGoogleCalendarApi {
  constructor(private readonly credenciales: CredencialesGoogleCalendar) {}

  async crearEvento(params: ParametrosCrearEventoCalendario): Promise<string> {
    const accessToken = await this.obtenerAccessToken();
    const respuesta = await fetch(URL_EVENTOS, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: params.titulo,
        description: params.descripcion,
        start: { dateTime: params.inicio },
        end: { dateTime: params.fin },
        attendees: params.invitados.map((email) => ({ email })),
      }),
    });
    if (!respuesta.ok) {
      throw new Error(`Google Calendar respondió ${respuesta.status} al crear el evento: ${await respuesta.text()}`);
    }
    const datos = (await respuesta.json()) as { id: string };
    return `Evento creado: ${datos.id}`;
  }

  async consultarDisponibilidad(params: ParametrosConsultarDisponibilidad): Promise<string> {
    const accessToken = await this.obtenerAccessToken();
    const respuesta = await fetch(URL_FREEBUSY, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ timeMin: params.desde, timeMax: params.hasta, items: [{ id: "primary" }] }),
    });
    if (!respuesta.ok) {
      throw new Error(
        `Google Calendar respondió ${respuesta.status} al consultar disponibilidad: ${await respuesta.text()}`,
      );
    }
    const datos = (await respuesta.json()) as {
      calendars: Record<string, { busy: readonly { start: string; end: string }[] }>;
    };
    const ocupados = datos.calendars["primary"]?.busy ?? [];
    if (ocupados.length === 0) return `Sin conflictos entre ${params.desde} y ${params.hasta}.`;
    return `Ocupado: ${ocupados.map((b) => `${b.start} a ${b.end}`).join(", ")}`;
  }

  private async obtenerAccessToken(): Promise<string> {
    const respuesta = await fetch(URL_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.credenciales.clientId,
        client_secret: this.credenciales.clientSecret,
        refresh_token: this.credenciales.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!respuesta.ok) {
      throw new Error(`No se pudo refrescar el token de Google Calendar (${respuesta.status}).`);
    }
    const datos = (await respuesta.json()) as { access_token: string };
    return datos.access_token;
  }
}
