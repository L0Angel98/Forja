import type { Rol } from "@forja/shared";

export { ROLES, type Rol } from "@forja/shared";

export interface Usuario {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly nombre: string;
  readonly rol: Rol;
  readonly activo: boolean;
}
