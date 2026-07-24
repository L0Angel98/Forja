import type { FeedbackRespuesta } from "../entities/feedback-respuesta";

export interface RepositorioFeedback {
  crear(feedback: FeedbackRespuesta): Promise<void>;
}
