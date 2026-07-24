import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EstadoVacio } from "../EstadoVacio";

describe("EstadoVacio", () => {
  it("muestra el título y expone role=status", () => {
    render(<EstadoVacio titulo="Sin reportes esta semana" />);
    expect(screen.getByRole("status")).toHaveTextContent("Sin reportes esta semana");
  });

  it("muestra la descripción cuando se provee", () => {
    render(<EstadoVacio titulo="Sin reportes" descripcion="Aquí verás las fallas reportadas." />);
    expect(screen.getByText("Aquí verás las fallas reportadas.")).toBeInTheDocument();
  });

  it("sin descripción, no renderiza el párrafo de descripción", () => {
    const { container } = render(<EstadoVacio titulo="Sin reportes" />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("sin acción, no renderiza ningún botón", () => {
    render(<EstadoVacio titulo="Sin reportes" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("con acción, renderiza el botón con su etiqueta y dispara onClick al hacer clic", async () => {
    const alHacerClick = vi.fn();
    const usuario = userEvent.setup();
    render(<EstadoVacio titulo="Sin reportes" accion={{ etiqueta: "Reportar una falla", onClick: alHacerClick }} />);

    const boton = screen.getByRole("button", { name: "Reportar una falla" });
    await usuario.click(boton);

    expect(alHacerClick).toHaveBeenCalledTimes(1);
  });
});
