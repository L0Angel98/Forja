import { randomUUID } from "node:crypto";
import type {
  HasherContrasenas,
  RegistradorAuditoria,
  RepositorioIntentosLogin,
  RepositorioSesiones,
  RepositorioUsuarios,
} from "@forja/core";
import {
  Argon2Hasher,
  RegistradorAuditoriaDrizzle,
  RepositorioIntentosLoginDrizzle,
  RepositorioSesionesDrizzle,
  RepositorioUsuariosDrizzle,
  type ForjaDb,
} from "@forja/db";

export interface ComposicionAuth {
  usuarios: RepositorioUsuarios;
  sesiones: RepositorioSesiones;
  hasher: HasherContrasenas;
  intentosLogin: RepositorioIntentosLogin;
  auditoria: RegistradorAuditoria;
  generarIdSesion: () => string;
}

export function construirComposicionAuth(db: ForjaDb): ComposicionAuth {
  return {
    usuarios: new RepositorioUsuariosDrizzle(db),
    sesiones: new RepositorioSesionesDrizzle(db),
    hasher: new Argon2Hasher(),
    intentosLogin: new RepositorioIntentosLoginDrizzle(db),
    auditoria: new RegistradorAuditoriaDrizzle(db),
    generarIdSesion: randomUUID,
  };
}
