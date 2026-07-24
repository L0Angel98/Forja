import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Campo } from "../Campo";

describe("Campo", () => {
  it("asocia la etiqueta con el input vía htmlFor/id", () => {
    render(<Campo etiqueta="Correo" name="correo" />);
    const entrada = screen.getByLabelText("Correo");
    expect(entrada).toBeInstanceOf(HTMLInputElement);
  });

  it("acepta texto escrito por el usuario", async () => {
    const usuario = userEvent.setup();
    render(<Campo etiqueta="Nombre" name="nombre" />);

    const entrada = screen.getByLabelText("Nombre");
    await usuario.type(entrada, "Juan");

    expect(entrada).toHaveValue("Juan");
  });

  it("muestra el texto de ayuda y lo asocia vía aria-describedby", () => {
    render(<Campo etiqueta="Tag de equipo" name="tag" ayuda="Ej. PRE-03" />);

    const entrada = screen.getByLabelText("Tag de equipo");
    expect(screen.getByText("Ej. PRE-03")).toBeInTheDocument();
    expect(entrada.getAttribute("aria-describedby")).toContain("tag-ayuda");
  });

  it("muestra el error, marca aria-invalid y lo asocia vía aria-describedby", () => {
    render(<Campo etiqueta="Correo" name="correo" error="Correo inválido" />);

    const entrada = screen.getByLabelText("Correo");
    expect(screen.getByRole("alert")).toHaveTextContent("Correo inválido");
    expect(entrada).toHaveAttribute("aria-invalid", "true");
    expect(entrada.getAttribute("aria-describedby")).toContain("correo-error");
  });

  it("deshabilitado: no acepta escritura", async () => {
    const usuario = userEvent.setup();
    render(<Campo etiqueta="Nombre" name="nombre" disabled />);

    const entrada = screen.getByLabelText("Nombre");
    expect(entrada).toBeDisabled();
    await usuario.type(entrada, "x");
    expect(entrada).toHaveValue("");
  });

  it("reenvía la ref al elemento <input>", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Campo etiqueta="x" name="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
