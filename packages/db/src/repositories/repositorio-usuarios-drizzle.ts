import { eq } from "drizzle-orm";
import type { RepositorioUsuarios, Usuario, Rol } from "@forja/core";
import type { ForjaDb } from "../client";
import { appUser } from "../schema/app-user";

export class RepositorioUsuariosDrizzle implements RepositorioUsuarios {
  constructor(private readonly db: ForjaDb) {}

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const [fila] = await this.db.select().from(appUser).where(eq(appUser.email, email)).limit(1);
    return fila ? mapearUsuario(fila) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const [fila] = await this.db.select().from(appUser).where(eq(appUser.id, id)).limit(1);
    return fila ? mapearUsuario(fila) : null;
  }
}

function mapearUsuario(fila: typeof appUser.$inferSelect): Usuario {
  return {
    id: fila.id,
    email: fila.email,
    passwordHash: fila.passwordHash,
    nombre: fila.nombre,
    rol: fila.roleId as Rol,
    activo: fila.activo,
  };
}
