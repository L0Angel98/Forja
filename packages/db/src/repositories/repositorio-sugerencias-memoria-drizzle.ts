import { eq } from "drizzle-orm";
import type { EstadoSugerenciaMemoria, RepositorioSugerenciasMemoria, SugerenciaMemoria } from "@forja/core";
import type { ForjaDb } from "../client";
import { memorySuggestion } from "../schema/memory-suggestion";

export class RepositorioSugerenciasMemoriaDrizzle implements RepositorioSugerenciasMemoria {
  constructor(private readonly db: ForjaDb) {}

  async crear(sugerencia: SugerenciaMemoria): Promise<void> {
    await this.db.insert(memorySuggestion).values({
      id: sugerencia.id,
      contenido: sugerencia.contenido,
      estado: sugerencia.estado,
      propuestaEn: sugerencia.propuestaEn,
    });
  }

  async buscarPorId(id: string): Promise<SugerenciaMemoria | null> {
    const [fila] = await this.db.select().from(memorySuggestion).where(eq(memorySuggestion.id, id)).limit(1);
    return fila ? mapear(fila) : null;
  }

  async listarPendientes(): Promise<SugerenciaMemoria[]> {
    const filas = await this.db
      .select()
      .from(memorySuggestion)
      .where(eq(memorySuggestion.estado, "pendiente"));
    return filas.map(mapear);
  }

  async actualizarEstado(id: string, estado: EstadoSugerenciaMemoria): Promise<void> {
    await this.db.update(memorySuggestion).set({ estado }).where(eq(memorySuggestion.id, id));
  }
}

function mapear(fila: typeof memorySuggestion.$inferSelect): SugerenciaMemoria {
  return {
    id: fila.id,
    contenido: fila.contenido,
    estado: fila.estado as EstadoSugerenciaMemoria,
    propuestaEn: fila.propuestaEn,
  };
}
