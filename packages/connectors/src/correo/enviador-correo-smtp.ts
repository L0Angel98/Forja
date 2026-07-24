import nodemailer, { type Transporter } from "nodemailer";
import type { EnviadorCorreo, ParametrosEnviarCorreo } from "./enviador-correo";

export interface CredencialesSmtp {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
  readonly password: string;
  readonly from: string;
}

export class EnviadorCorreoSmtp implements EnviadorCorreo {
  private readonly transportador: Transporter;
  private readonly desde: string;

  constructor(credenciales: CredencialesSmtp) {
    this.transportador = nodemailer.createTransport({
      host: credenciales.host,
      port: credenciales.port,
      secure: credenciales.secure,
      auth: { user: credenciales.user, pass: credenciales.password },
    });
    this.desde = credenciales.from;
  }

  async enviar(params: ParametrosEnviarCorreo): Promise<void> {
    await this.transportador.sendMail({
      from: this.desde,
      to: params.destinatarios.join(", "),
      subject: params.asunto,
      text: params.cuerpo,
    });
  }
}
