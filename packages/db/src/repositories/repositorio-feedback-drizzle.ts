import type { FeedbackRespuesta, RepositorioFeedback } from "@forja/core";
import type { ForjaDb } from "../client";
import { responseFeedback } from "../schema/response-feedback";

export class RepositorioFeedbackDrizzle implements RepositorioFeedback {
  constructor(private readonly db: ForjaDb) {}

  async crear(feedback: FeedbackRespuesta): Promise<void> {
    await this.db.insert(responseFeedback).values({
      id: feedback.id,
      traceId: feedback.traceId,
      util: feedback.util,
      createdAt: feedback.creadoEn,
    });
  }
}
