import { ErrorDominio } from "@forja/shared";

export class UsuarioDesactivado extends ErrorDominio {
  readonly codigo = "USUARIO_DESACTIVADO";

  constructor() {
    super("Esta cuenta fue desactivada. Contacta a tu administrador.");
  }
}
