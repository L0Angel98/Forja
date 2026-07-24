import { ErrorDominio } from "@forja/shared";

export class WebhookUrlNoPermitida extends ErrorDominio {
  readonly codigo = "WEBHOOK_URL_NO_PERMITIDA";

  constructor(readonly url: string) {
    super(`La URL "${url}" no está en la lista blanca del conector webhook.`);
  }
}
