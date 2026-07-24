/**
 * Diff de líneas simple y legible para auditoría (no es un algoritmo de
 * mínima distancia tipo Myers; basta con mostrar qué líneas cambiaron).
 */
export function calcularDiffLineas(anterior: string, nuevo: string): string {
  const lineasAnteriores = anterior.split("\n");
  const lineasNuevas = nuevo.split("\n");
  const maximo = Math.max(lineasAnteriores.length, lineasNuevas.length);
  const salida: string[] = [];

  for (let i = 0; i < maximo; i++) {
    const antes = lineasAnteriores[i];
    const despues = lineasNuevas[i];

    if (antes === despues) continue;
    if (antes !== undefined) salida.push(`-${antes}`);
    if (despues !== undefined) salida.push(`+${despues}`);
  }

  return salida.join("\n");
}
