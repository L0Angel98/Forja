export class ErrorApi extends Error {
  constructor(
    public readonly codigo: string,
    public readonly status: number,
  ) {
    super(codigo);
  }
}

export async function solicitarApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(ruta, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opciones.headers },
    ...opciones,
  });

  if (!respuesta.ok) {
    let codigo = "error_desconocido";
    try {
      const cuerpo = (await respuesta.json()) as { error?: string };
      if (cuerpo.error) codigo = cuerpo.error;
    } catch {
      // El cuerpo no era JSON — se conserva el código genérico.
    }
    throw new ErrorApi(codigo, respuesta.status);
  }

  return (await respuesta.json()) as T;
}
