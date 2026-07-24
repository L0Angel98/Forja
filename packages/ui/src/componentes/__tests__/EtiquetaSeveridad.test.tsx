import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProveedorI18n } from "../../i18n/contexto";
import { EtiquetaSeveridad } from "../EtiquetaSeveridad";

function envolver(hijos: ReactNode) {
  return render(<ProveedorI18n>{hijos}</ProveedorI18n>);
}

describe("EtiquetaSeveridad", () => {
  it.each([
    [1, "Baja"],
    [2, "Media"],
    [3, "Alta"],
    [4, "Crítica"],
  ] as const)("severidad %i muestra el texto '%s'", (severidad, texto) => {
    envolver(<EtiquetaSeveridad severidad={severidad} />);
    expect(screen.getByText(texto)).toBeInTheDocument();
  });

  it("cada nivel tiene un ícono con una forma SVG distinta (no solo color)", () => {
    const formas: string[] = [];
    for (const severidad of [1, 2, 3, 4] as const) {
      const { container, unmount } = envolver(<EtiquetaSeveridad severidad={severidad} />);
      const svg = container.querySelector("svg");
      formas.push(svg?.innerHTML ?? "");
      unmount();
    }
    expect(new Set(formas).size).toBe(4);
  });

  it("el ícono es aria-hidden (el texto es la fuente accesible, no el ícono)", () => {
    const { container } = envolver(<EtiquetaSeveridad severidad={2} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
