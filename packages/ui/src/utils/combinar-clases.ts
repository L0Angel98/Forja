/** Concatena nombres de clase, ignorando valores falsy. Evita traer una librería solo para esto. */
export function combinarClases(...clases: ReadonlyArray<string | false | null | undefined>): string {
  return clases.filter((clase): clase is string => Boolean(clase)).join(" ");
}
