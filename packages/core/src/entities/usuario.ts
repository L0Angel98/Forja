export const ROLES = ["operador", "supervisor", "admin"] as const;
export type Rol = (typeof ROLES)[number];

export interface Usuario {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly nombre: string;
  readonly rol: Rol;
  readonly activo: boolean;
}
