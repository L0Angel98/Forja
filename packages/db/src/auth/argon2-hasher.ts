import type { HasherContrasenas } from "@forja/core";
import * as argon2 from "argon2";

export class Argon2Hasher implements HasherContrasenas {
  async hash(contrasenaPlana: string): Promise<string> {
    return argon2.hash(contrasenaPlana, { type: argon2.argon2id });
  }

  async verificar(hash: string, contrasenaPlana: string): Promise<boolean> {
    return argon2.verify(hash, contrasenaPlana);
  }
}
