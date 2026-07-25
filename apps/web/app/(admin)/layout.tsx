import type { ReactNode } from "react";
import { GuardiaRol } from "../../components/guardia-rol";
import { NavLateral, type DestinoNavLateral } from "../../components/nav-lateral";

const DESTINOS: readonly DestinoNavLateral[] = [
  { href: "/documentos", claveEtiqueta: "nav.documentos" },
  { href: "/conectores", claveEtiqueta: "nav.conectores" },
  { href: "/rutinas", claveEtiqueta: "nav.rutinas" },
  { href: "/workspace", claveEtiqueta: "nav.workspace" },
];

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return (
    <GuardiaRol rol="admin">
      <div style={{ display: "flex", minHeight: "100dvh" }}>
        <NavLateral destinos={DESTINOS} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </GuardiaRol>
  );
}
