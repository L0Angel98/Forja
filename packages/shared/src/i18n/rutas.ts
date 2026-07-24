/** Deriva, en tiempo de compilación, todas las rutas "seccion.clave" válidas de un diccionario anidado. */
export type RutaDiccionario<T, Prefijo extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefijo}${K}`
    : RutaDiccionario<T[K], `${Prefijo}${K}.`>;
}[keyof T & string];

function resolverRuta(diccionario: unknown, ruta: string): string {
  let actual: unknown = diccionario;
  for (const parte of ruta.split(".")) {
    if (typeof actual !== "object" || actual === null) return ruta;
    actual = (actual as Record<string, unknown>)[parte];
  }
  return typeof actual === "string" ? actual : ruta;
}

/**
 * Crea la función `t` de un diccionario: sin librería de i18n pesada, solo
 * un lookup de ruta punteada con autocompletado type-safe de claves.
 */
export function crearT<T extends Record<string, unknown>>(diccionario: T) {
  return function t(clave: RutaDiccionario<T>): string {
    return resolverRuta(diccionario, clave);
  };
}
