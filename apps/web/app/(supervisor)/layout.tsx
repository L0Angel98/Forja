import type { ReactNode } from "react";
import { GuardiaRol } from "../../components/guardia-rol";
import { NavLateral, type DestinoNavLateral } from "../../components/nav-lateral";

const DESTINOS: readonly DestinoNavLateral[] = [
  { href: "/bandeja", claveEtiqueta: "nav.bandeja" },
  { href: "/maquinas", claveEtiqueta: "nav.maquinas" },
];

export default function LayoutSupervisor({ children }: { children: ReactNode }) {
  return (
    <GuardiaRol rol="supervisor">
      <div style={{ display: "flex", minHeight: "100dvh" }}>
        <NavLateral destinos={DESTINOS} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </GuardiaRol>
  );
}
