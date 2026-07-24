import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProveedorI18n } from "../../i18n/contexto";
import { TarjetaMaquina } from "../TarjetaMaquina";

describe("TarjetaMaquina", () => {
  it("muestra el tag (mono), el nombre y la etiqueta de estado", () => {
    render(
      <ProveedorI18n>
        <TarjetaMaquina tag="PRE-03" nombre="Prensa 3" estado="operativa" />
      </ProveedorI18n>,
    );

    expect(screen.getByText("PRE-03")).toBeInTheDocument();
    expect(screen.getByText("Prensa 3")).toBeInTheDocument();
    expect(screen.getByText("Operativa")).toBeInTheDocument();
  });

  it("sin onClick, renderiza un <div> no interactivo", () => {
    render(
      <ProveedorI18n>
        <TarjetaMaquina tag="HRN-01" nombre="Horno 1" estado="enFalla" />
      </ProveedorI18n>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("En falla")).toBeInTheDocument();
  });

  it("con onClick, es un <button> enfocable y clicable por teclado", async () => {
    const alHacerClick = vi.fn();
    const usuario = userEvent.setup();
    render(
      <ProveedorI18n>
        <TarjetaMaquina tag="HRN-01" nombre="Horno 1" estado="enMantenimiento" onClick={alHacerClick} />
      </ProveedorI18n>,
    );

    const boton = screen.getByRole("button");
    boton.focus();
    await usuario.keyboard("{Enter}");

    expect(alHacerClick).toHaveBeenCalledTimes(1);
  });

  it("sensorMudo también se muestra con su etiqueta correspondiente", () => {
    render(
      <ProveedorI18n>
        <TarjetaMaquina tag="TOR-02" nombre="Torno 2" estado="sensorMudo" />
      </ProveedorI18n>,
    );

    expect(screen.getByText("Sensor mudo")).toBeInTheDocument();
  });
});
