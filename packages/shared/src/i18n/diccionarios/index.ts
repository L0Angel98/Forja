import { esMX } from "./es-mx";

export const diccionarios = { "es-MX": esMX } as const;
export type Idioma = keyof typeof diccionarios;
export const IDIOMA_POR_DEFECTO: Idioma = "es-MX";

export { esMX };
export type { DiccionarioEsMX } from "./es-mx";
