/**
 * Vive en shared (no en core) porque apps/web necesita los valores de rol
 * para enrutar por rol y core no es importable desde app-web (ver
 * eslint.config.js boundaries: app-web solo puede importar shared y ui).
 */
export const ROLES = ["operador", "supervisor", "admin"] as const;
export type Rol = (typeof ROLES)[number];
