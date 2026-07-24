import { and, eq } from "drizzle-orm";
import type { RegistroIntentos, RepositorioIntentosLogin } from "@forja/core";
import type { ForjaDb } from "../client";
import { loginAttempt } from "../schema/login-attempt";

export class RepositorioIntentosLoginDrizzle implements RepositorioIntentosLogin {
  constructor(private readonly db: ForjaDb) {}

  async obtener(ip: string, email: string): Promise<RegistroIntentos | null> {
    const [fila] = await this.db
      .select()
      .from(loginAttempt)
      .where(and(eq(loginAttempt.ip, ip), eq(loginAttempt.email, email)))
      .limit(1);

    if (!fila) return null;

    return {
      intentosConsecutivos: fila.intentosConsecutivos,
      bloqueadoHasta: fila.bloqueadoHasta,
      vecesBloqueado: fila.vecesBloqueado,
      ultimoIntentoEn: fila.ultimoIntentoEn,
    };
  }

  async guardar(ip: string, email: string, registro: RegistroIntentos): Promise<void> {
    await this.db
      .insert(loginAttempt)
      .values({
        ip,
        email,
        intentosConsecutivos: registro.intentosConsecutivos,
        bloqueadoHasta: registro.bloqueadoHasta,
        vecesBloqueado: registro.vecesBloqueado,
        ultimoIntentoEn: registro.ultimoIntentoEn,
      })
      .onConflictDoUpdate({
        target: [loginAttempt.ip, loginAttempt.email],
        set: {
          intentosConsecutivos: registro.intentosConsecutivos,
          bloqueadoHasta: registro.bloqueadoHasta,
          vecesBloqueado: registro.vecesBloqueado,
          ultimoIntentoEn: registro.ultimoIntentoEn,
        },
      });
  }

  async eliminar(ip: string, email: string): Promise<void> {
    await this.db.delete(loginAttempt).where(and(eq(loginAttempt.ip, ip), eq(loginAttempt.email, email)));
  }
}
