import type { Rol } from "./entities/usuario";

export const PERMISOS = [
  "crear_reporte_falla",
  "consultar_documentos",
  "consultar_sensores",
  "aprobar_borrador",
  "ver_todas_las_areas",
  "gestionar_rutinas",
  "gestionar_usuarios",
  "gestionar_maquinas",
  "gestionar_workspace",
  "gestionar_conectores",
] as const;

export type Permiso = (typeof PERMISOS)[number];

const PERMISOS_OPERADOR: readonly Permiso[] = [
  "crear_reporte_falla",
  "consultar_documentos",
  "consultar_sensores",
];

const PERMISOS_SUPERVISOR: readonly Permiso[] = [
  ...PERMISOS_OPERADOR,
  "aprobar_borrador",
  "ver_todas_las_areas",
  "gestionar_rutinas",
];

const PERMISOS_ADMIN: readonly Permiso[] = [
  ...PERMISOS_SUPERVISOR,
  "gestionar_usuarios",
  "gestionar_maquinas",
  "gestionar_workspace",
  "gestionar_conectores",
];

const PERMISOS_POR_ROL: Readonly<Record<Rol, readonly Permiso[]>> = {
  operador: PERMISOS_OPERADOR,
  supervisor: PERMISOS_SUPERVISOR,
  admin: PERMISOS_ADMIN,
};

export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol].includes(permiso);
}

export function permisosDe(rol: Rol): readonly Permiso[] {
  return PERMISOS_POR_ROL[rol];
}
