import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EtiquetaEstado } from "../EtiquetaEstado";

describe("EtiquetaEstado", () => {
  it("renderiza el texto pasado como children", () => {
    render(<EtiquetaEstado tono="verde">Operativa</EtiquetaEstado>);
    expect(screen.getByText("Operativa")).toBeInTheDocument();
  });

  it("el punto de color es decorativo (aria-hidden)", () => {
    const { container } = render(<EtiquetaEstado tono="rojo">En falla</EtiquetaEstado>);
    const punto = container.querySelector("[aria-hidden='true']");
    expect(punto).toBeInTheDocument();
  });
});
