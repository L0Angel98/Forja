import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Boton } from "../Boton";

describe("Boton", () => {
  it("renderiza el texto y responde al click", async () => {
    const alHacerClick = vi.fn();
    const usuario = userEvent.setup();
    render(<Boton onClick={alHacerClick}>Reportar falla</Boton>);

    const boton = screen.getByRole("button", { name: "Reportar falla" });
    await usuario.click(boton);

    expect(alHacerClick).toHaveBeenCalledTimes(1);
  });

  it("cargando: deshabilita el botón, marca aria-busy y no dispara click", async () => {
    const alHacerClick = vi.fn();
    const usuario = userEvent.setup();
    render(
      <Boton onClick={alHacerClick} cargando>
        Guardar
      </Boton>,
    );

    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");

    await usuario.click(boton);
    expect(alHacerClick).not.toHaveBeenCalled();
  });

  it("deshabilitado: no dispara click", async () => {
    const alHacerClick = vi.fn();
    const usuario = userEvent.setup();
    render(
      <Boton onClick={alHacerClick} disabled>
        Confirmar
      </Boton>,
    );

    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(alHacerClick).not.toHaveBeenCalled();
  });

  it("es enfocable por teclado (foco visible vía CSS, no oculto)", async () => {
    const usuario = userEvent.setup();
    render(<Boton>Enviar</Boton>);

    await usuario.tab();
    expect(screen.getByRole("button", { name: "Enviar" })).toHaveFocus();
  });

  it("reenvía la ref al elemento <button>", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Boton ref={ref}>x</Boton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("type por defecto es 'button' (no envía formularios por accidente)", () => {
    render(<Boton>x</Boton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
