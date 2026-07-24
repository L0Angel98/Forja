import type { EmbeddingModelV1 } from "@ai-sdk/provider";
import { describe, expect, it } from "vitest";
import { VercelAiGeneradorEmbeddings } from "../vercel-ai-generador-embeddings";

function crearModeloFalso(embeddingPorTexto: (texto: string) => number[]): EmbeddingModelV1<string> {
  return {
    specificationVersion: "v1",
    provider: "falso",
    modelId: "modelo-falso",
    maxEmbeddingsPerCall: undefined,
    supportsParallelCalls: true,
    async doEmbed({ values }) {
      return { embeddings: values.map(embeddingPorTexto) };
    },
  };
}

describe("VercelAiGeneradorEmbeddings", () => {
  it("delega en el modelo inyectado y devuelve un vector por texto, en el mismo orden", async () => {
    const modelo = crearModeloFalso((texto) => [texto.length, 0, 0]);
    const generador = new VercelAiGeneradorEmbeddings(modelo, 3);

    const embeddings = await generador.generar(["hola", "hola mundo"]);

    expect(embeddings).toEqual([
      [4, 0, 0],
      [10, 0, 0],
    ]);
  });

  it("expone la dimensión configurada", () => {
    const generador = new VercelAiGeneradorEmbeddings(crearModeloFalso(() => []), 1536);
    expect(generador.dimensiones).toBe(1536);
  });

  it("no llama al modelo si no hay textos", async () => {
    let llamadas = 0;
    const modelo = crearModeloFalso(() => {
      llamadas += 1;
      return [];
    });
    const generador = new VercelAiGeneradorEmbeddings(modelo, 3);

    const embeddings = await generador.generar([]);

    expect(embeddings).toEqual([]);
    expect(llamadas).toBe(0);
  });
});
