import type { GeneradorEmbeddings } from "@forja/core";
import { embedMany, type EmbeddingModel } from "ai";

/**
 * Adapter (patrón Adapter) del puerto GeneradorEmbeddings sobre el Vercel AI
 * SDK. El modelo de embeddings es inyectado por el composition root
 * (apps/server), igual que VercelAiProveedorLLM. `dimensiones` describe la
 * dimensión del vector que produce ese modelo — es una decisión de
 * instalación, no algo que se pueda inferir del propio modelo.
 */
export class VercelAiGeneradorEmbeddings implements GeneradorEmbeddings {
  constructor(
    private readonly modelo: EmbeddingModel<string>,
    readonly dimensiones: number,
  ) {}

  async generar(textos: readonly string[]): Promise<number[][]> {
    if (textos.length === 0) return [];
    const { embeddings } = await embedMany({ model: this.modelo, values: [...textos] });
    return embeddings;
  }
}
