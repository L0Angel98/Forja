import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Textarea } from "../Textarea";

describe("Textarea", () => {
  it("asocia la etiqueta y acepta texto multilínea", async () => {
    const usuario = userEvent.setup();
    render(<Textarea etiqueta="Descripción" name="descripcion" />);

    const entrada = screen.getByLabelText("Descripción");
    expect(entrada).toBeInstanceOf(HTMLTextAreaElement);

    await usuario.type(entrada, "Línea uno{enter}Línea dos");
    expect(entrada).toHaveValue("Línea uno\nLínea dos");
  });

  it("usa 4 filas por defecto y permite sobreescribirlas", () => {
    const { rerender } = render(<Textarea etiqueta="x" name="x" />);
    expect(screen.getByLabelText("x")).toHaveAttribute("rows", "4");

    rerender(<Textarea etiqueta="x" name="x" rows={8} />);
    expect(screen.getByLabelText("x")).toHaveAttribute("rows", "8");
  });

  it("muestra el error y marca aria-invalid", () => {
    render(<Textarea etiqueta="Descripción" name="descripcion" error="Describe la falla" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Describe la falla");
    expect(screen.getByLabelText("Descripción")).toHaveAttribute("aria-invalid", "true");
  });

  it("deshabilitado: no acepta escritura", async () => {
    const usuario = userEvent.setup();
    render(<Textarea etiqueta="Descripción" name="descripcion" disabled />);

    const entrada = screen.getByLabelText("Descripción");
    await usuario.type(entrada, "x");
    expect(entrada).toHaveValue("");
  });
});
