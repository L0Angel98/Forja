import { describe, expect, it } from "vitest";
import { permisosDe, tienePermiso } from "../permisos";

describe("permisos", () => {
  it("un operador solo tiene permisos de su rol", () => {
    expect(tienePermiso("operador", "crear_reporte_falla")).toBe(true);
    expect(tienePermiso("operador", "aprobar_borrador")).toBe(false);
    expect(tienePermiso("operador", "gestionar_usuarios")).toBe(false);
  });

  it("un supervisor hereda los permisos de operador y suma los propios", () => {
    expect(tienePermiso("supervisor", "crear_reporte_falla")).toBe(true);
    expect(tienePermiso("supervisor", "aprobar_borrador")).toBe(true);
    expect(tienePermiso("supervisor", "gestionar_rutinas")).toBe(true);
    expect(tienePermiso("supervisor", "gestionar_usuarios")).toBe(false);
  });

  it("un admin tiene todos los permisos", () => {
    const permisosAdmin = permisosDe("admin");
    expect(permisosDe("operador").every((p) => permisosAdmin.includes(p))).toBe(true);
    expect(permisosDe("supervisor").every((p) => permisosAdmin.includes(p))).toBe(true);
    expect(tienePermiso("admin", "gestionar_conectores")).toBe(true);
  });
});
