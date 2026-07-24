import { describe, expect, it } from "vitest";
import { registrarFeedbackRespuesta } from "../registrar-feedback-respuesta";
import { crearRepositorioFeedbackFalso } from "../../testing/fakes";

describe("registrarFeedbackRespuesta", () => {
  it("persiste el feedback del usuario sobre una respuesta", async () => {
    const feedback = crearRepositorioFeedbackFalso();
    const ahora = new Date("2026-01-01T00:00:00.000Z");

    const resultado = await registrarFeedbackRespuesta(
      { feedback, generarId: () => "feedback-1" },
      { traceId: "trace-1", util: true, ahora },
    );

    expect(resultado).toEqual({ id: "feedback-1", traceId: "trace-1", util: true, creadoEn: ahora });
    expect(feedback.feedbacks).toContainEqual(resultado);
  });
});
