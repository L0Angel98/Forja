import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select } from "../Select";

const OPCIONES = [
  { valor: "1", etiqueta: "Baja" },
  { valor: "2", etiqueta: "Media" },
];

describe("Select", () => {
  it("asocia la etiqueta y lista las opciones", () => {
    render(<Select etiqueta="Severidad" name="severidad" opciones={OPCIONES} />);

    const select = screen.getByLabelText("Severidad");
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getByRole("option", { name: "Baja" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Media" })).toBeInTheDocument();
  });

  it("permite seleccionar una opción", async () => {
    const usuario = userEvent.setup();
    render(<Select etiqueta="Severidad" name="severidad" opciones={OPCIONES} />);

    await usuario.selectOptions(screen.getByLabelText("Severidad"), "2");

    expect(screen.getByLabelText("Severidad")).toHaveValue("2");
  });

  it("muestra un placeholder deshabilitado cuando se provee", () => {
    render(<Select etiqueta="Severidad" name="severidad" opciones={OPCIONES} placeholder="Elige una opción" />);

    const opcionPlaceholder = screen.getByRole("option", { name: "Elige una opción" });
    expect(opcionPlaceholder).toBeDisabled();
  });

  it("muestra el error y marca aria-invalid", () => {
    render(<Select etiqueta="Severidad" name="severidad" opciones={OPCIONES} error="Selecciona una severidad" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona una severidad");
    expect(screen.getByLabelText("Severidad")).toHaveAttribute("aria-invalid", "true");
  });
});
