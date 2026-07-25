import type { ReactNode } from "react";
import { GuardiaRol } from "../../components/guardia-rol";
import { NavInferior } from "../../components/nav-inferior";

export default function LayoutOperador({ children }: { children: ReactNode }) {
  return (
    <GuardiaRol rol="operador">
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
        <NavInferior />
      </div>
    </GuardiaRol>
  );
}
