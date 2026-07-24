import type { FeedbackRespuesta } from "../entities/feedback-respuesta";
import type { RepositorioFeedback } from "../ports/repositorio-feedback";

export interface DependenciasRegistrarFeedbackRespuesta {
  feedback: RepositorioFeedback;
  generarId: () => string;
}

export interface ParametrosRegistrarFeedbackRespuesta {
  traceId: string;
  util: boolean;
  ahora: Date;
}

export async function registrarFeedbackRespuesta(
  deps: DependenciasRegistrarFeedbackRespuesta,
  params: ParametrosRegistrarFeedbackRespuesta,
): Promise<FeedbackRespuesta> {
  const feedback: FeedbackRespuesta = {
    id: deps.generarId(),
    traceId: params.traceId,
    util: params.util,
    creadoEn: params.ahora,
  };

  await deps.feedback.crear(feedback);

  return feedback;
}
