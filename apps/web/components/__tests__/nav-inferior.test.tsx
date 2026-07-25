import { render, screen } from "@testing-library/react";
import { ProveedorI18n } from "@forja/ui";
import { describe, expect, it, vi } from "vitest";
import { NavInferior } from "../nav-inferior";

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat",
}));

describe("NavInferior", () => {
  it("expone como máximo 3 destinos (spec 02-interfaz: navegación inferior de operador)", () => {
    render(
      <ProveedorI18n>
        <NavInferior />
      </ProveedorI18n>,
    );

    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("no incluye ningún destino de navegación de admin (spec 02-interfaz: operador no ve navegación de admin)", () => {
    render(
      <ProveedorI18n>
        <NavInferior />
      </ProveedorI18n>,
    );

    for (const etiquetaAdmin of ["Documentos", "Conectores", "Rutinas", "Workspace"]) {
      expect(screen.queryByText(etiquetaAdmin)).not.toBeInTheDocument();
    }
  });

  it("marca el destino actual con aria-current=page", () => {
    render(
      <ProveedorI18n>
        <NavInferior />
      </ProveedorI18n>,
    );

    expect(screen.getByRole("link", { name: "Chat" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Reportar" })).not.toHaveAttribute("aria-current");
  });
});
